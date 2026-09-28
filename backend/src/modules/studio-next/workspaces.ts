import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { Database, type Actor } from './database.js';
import { email, parse, revision, checkRevision, StudioError, uuid } from './validation.js';
const inviteInput=z.object({email,role:z.enum(['ADMIN','MEMBER']).default('MEMBER')}).strict();
export class Workspaces {
  constructor(private db:Database){}
  async list(actor:Actor,workspaceId:string){
    return this.db.tx(async c=>{
      const workspace=await this.db.workspace(c,actor,workspaceId,true);
      const invitations=await c.query(`SELECT i.id,i.email,i.role,i.state,i.expires_at AS "expiresAt",i.revision,
        (SELECT state FROM studio.mail_outbox WHERE invite_id=i.id ORDER BY created_at DESC LIMIT 1) AS delivery
        FROM studio.workspace_invites i WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`,[workspaceId]);
      const members=await c.query(`SELECT u.id,u."fullName",u.email,CASE WHEN u.id=w."ownerId" THEN 'OWNER' ELSE m.role END AS role FROM public.workspaces w
        JOIN public.users u ON u.id=w."ownerId" OR EXISTS(SELECT 1 FROM public.workspace_members sm WHERE sm."workspaceId"=w.id AND sm."userId"=u.id)
        LEFT JOIN public.workspace_members m ON m."workspaceId"=w.id AND m."userId"=u.id WHERE w.id=$1 ORDER BY u.email`,[workspaceId]);
      return {workspace,members:members.rows,invitations:invitations.rows,emailConfigured:!!process.env.STUDIO_SMTP_URL};
    });
  }
  async invite(actor:Actor,workspaceId:string,input:unknown){
    const body=parse(inviteInput,input);
    return this.db.tx(async c=>{
      const w=await this.db.workspace(c,actor,workspaceId,true);
      if(w.role!=='OWNER' && body.role==='ADMIN')throw new StudioError('Only the owner can appoint administrators',403,'FORBIDDEN');
      const existing=await c.query(`SELECT u.id FROM public.users u WHERE lower(u.email)=$2 AND (u.id=$3 OR EXISTS(SELECT 1 FROM public.workspace_members m WHERE m."workspaceId"=$1 AND m."userId"=u.id))`,[workspaceId,body.email,w.ownerId]);
      if(existing.rowCount)throw new StudioError('This person is already a member',409,'ALREADY_MEMBER');
      const count=await c.query(`SELECT count(*)::int AS total FROM studio.workspace_invites WHERE workspace_id=$1 AND state='PENDING' AND expires_at>now()`,[workspaceId]);
      if(count.rows[0].total>=100)throw new StudioError('Pending invitation limit reached',409,'INVITATION_LIMIT');
      await c.query(`UPDATE studio.workspace_invites SET state='REVOKED',revision=revision+1 WHERE workspace_id=$1 AND lower(email)=$2 AND state='PENDING' AND expires_at<=now()`,[workspaceId,body.email]);
      const invitationId=randomUUID();
      await c.query(`INSERT INTO studio.workspace_invites(id,workspace_id,email,role,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '7 days')`,[invitationId,workspaceId,body.email,body.role,actor.id]);
      await c.query('INSERT INTO studio.mail_outbox(id,invite_id) VALUES($1,$2)',[randomUUID(),invitationId]);
      await this.db.audit(c,actor,{workspaceId},'workspace.invited',body.email);
      return {id:invitationId,delivery:process.env.STUDIO_SMTP_URL?'QUEUED':'NOT_CONFIGURED'};
    });
  }
  async inbox(actor:Actor){
    if(!actor.email || !actor.emailVerified)return {invitations:[],requiresVerifiedEmail:true};
    const r=await this.db.pool.query(`SELECT i.id,i.role,i.expires_at AS "expiresAt",w.name AS "workspaceName" FROM studio.workspace_invites i
      JOIN public.workspaces w ON w.id=i.workspace_id WHERE lower(i.email)=lower($1) AND i.state='PENDING' AND i.expires_at>now() ORDER BY i.created_at DESC LIMIT 100`,[actor.email]);
    return {invitations:r.rows,requiresVerifiedEmail:false};
  }
  async accept(actor:Actor,invitationId:string){
    parse(uuid,invitationId);
    if(!actor.emailVerified || !actor.email)throw new StudioError('Verify the invited email address before accepting',403,'EMAIL_NOT_VERIFIED');
    return this.db.tx(async c=>{
      const lookup=await c.query('SELECT workspace_id FROM studio.workspace_invites WHERE id=$1 AND lower(email)=lower($2)',[invitationId,actor.email]);
      if(!lookup.rows[0])throw new StudioError('Invitation not found',404,'NOT_FOUND');
      // All membership/invitation changes lock the workspace first to serialize role changes.
      const w=await c.query('SELECT id,"ownerId" FROM public.workspaces WHERE id=$1 FOR UPDATE',[lookup.rows[0].workspace_id]);
      const r=await c.query(`SELECT * FROM studio.workspace_invites WHERE id=$1 FOR UPDATE`,[invitationId]);
      const i=r.rows[0];
      if(i.state==='ACCEPTED' && i.accepted_by===actor.id)return {workspaceId:i.workspace_id,alreadyAccepted:true};
      if(i.state!=='PENDING'||new Date(i.expires_at)<=new Date())throw new StudioError('Invitation expired or revoked',410,'INVITATION_EXPIRED');
      const inviter=await c.query(`SELECT 1 FROM public.users u WHERE u.id=$1 AND u.status='ACTIVE' AND (u.id=$3 OR EXISTS(SELECT 1 FROM public.workspace_members m WHERE m."workspaceId"=$2 AND m."userId"=u.id AND m.role='ADMIN' AND $4='MEMBER'))`,[i.invited_by,i.workspace_id,w.rows[0]?.ownerId,i.role]);
      if(!inviter.rowCount)throw new StudioError('The inviter no longer has permission. Request a new invitation.',403,'INVITER_REVOKED');
      await c.query(`INSERT INTO public.workspace_members(id,"workspaceId","userId",role,"createdAt","updatedAt") VALUES($1,$2,$3,$4,now(),now()) ON CONFLICT("workspaceId","userId") DO NOTHING`,[randomUUID(),i.workspace_id,actor.id,i.role]);
      await c.query(`UPDATE studio.workspace_invites SET state='ACCEPTED',accepted_by=$2,revision=revision+1,updated_at=now() WHERE id=$1`,[invitationId,actor.id]);
      await c.query(`UPDATE studio.mail_outbox SET state='CANCELLED' WHERE invite_id=$1 AND state='QUEUED'`,[invitationId]);
      await this.db.audit(c,actor,{workspaceId:i.workspace_id},'workspace.invitation_accepted','Invitation accepted');
      return {workspaceId:i.workspace_id};
    });
  }
  async changeInvite(actor:Actor,workspaceId:string,invitationId:string,input:unknown){
    const b=parse(z.object({action:z.enum(['REVOKE','RESEND']),revision}).strict(),input);
    return this.db.tx(async c=>{
      const w=await this.db.workspace(c,actor,workspaceId,true);
      const r=await c.query(`SELECT * FROM studio.workspace_invites WHERE id=$1 AND workspace_id=$2 FOR UPDATE`,[parse(uuid,invitationId),workspaceId]);
      const i=r.rows[0];if(!i)throw new StudioError('Invitation not found',404);
      if(i.role==='ADMIN' && w.role!=='OWNER')throw new StudioError('Only the owner can manage admin invitations',403);
      checkRevision(i.revision,b.revision);
      if(i.state!=='PENDING')throw new StudioError('Invitation is no longer pending',409);
      if(b.action==='RESEND' && new Date(i.updated_at).getTime()>Date.now()-60_000)throw new StudioError('Wait at least one minute between sends',429,'RESEND_LIMIT');
      await c.query(`UPDATE studio.mail_outbox SET state='CANCELLED' WHERE invite_id=$1 AND state='QUEUED'`,[i.id]);
      await c.query(`UPDATE studio.workspace_invites SET state=$2::varchar,expires_at=CASE WHEN $2::varchar='PENDING' THEN now()+interval '7 days' ELSE expires_at END,revision=revision+1,updated_at=now() WHERE id=$1`,[i.id,b.action==='RESEND'?'PENDING':'REVOKED']);
      if(b.action==='RESEND')await c.query(`INSERT INTO studio.mail_outbox(id,invite_id) VALUES($1,$2)`,[randomUUID(),i.id]);
      await this.db.audit(c,actor,{workspaceId},`workspace.invite_${b.action.toLowerCase()}`,i.email);
      return {};
    });
  }
  async changeMember(actor:Actor,workspaceId:string,userId:string,input:unknown){
    const b=parse(z.object({role:z.enum(['ADMIN','MEMBER','REMOVE'])}).strict(),input);
    return this.db.tx(async c=>{
      const w=await this.db.workspace(c,actor,workspaceId,true);
      parse(uuid,userId);
      if(userId===w.ownerId)throw new StudioError('The workspace owner cannot be removed or demoted',403,'OWNER_PROTECTED');
      const r=await c.query(`SELECT role FROM public.workspace_members WHERE "workspaceId"=$1 AND "userId"=$2 FOR UPDATE`,[workspaceId,userId]);
      if(!r.rows[0])throw new StudioError('Member not found',404);
      if(w.role!=='OWNER' && (r.rows[0].role==='ADMIN'||b.role==='ADMIN'||actor.id===userId))throw new StudioError('Only the owner can change administrators',403);
      if(b.role==='REMOVE')await c.query('DELETE FROM public.workspace_members WHERE "workspaceId"=$1 AND "userId"=$2',[workspaceId,userId]);
      else await c.query('UPDATE public.workspace_members SET role=$3,"updatedAt"=now() WHERE "workspaceId"=$1 AND "userId"=$2',[workspaceId,userId,b.role]);
      await this.db.audit(c,actor,{workspaceId},'workspace.member_changed',`${userId}: ${b.role}`);
      return {};
    });
  }
}
/** At-least-once delivery. No bearer secret in email: acceptance requires the invited verified account. */
export async function deliverInvitations(db:Database):Promise<number>{
  if(!process.env.STUDIO_SMTP_URL || !process.env.FRONTEND_URL || !process.env.STUDIO_MAIL_FROM)return 0;
  const origin=new URL(process.env.FRONTEND_URL).origin;
  const smtpUrl=new URL(process.env.STUDIO_SMTP_URL);
  if(!['smtp:','smtps:'].includes(smtpUrl.protocol))throw new StudioError('Invalid mail transport configuration',503,'MAIL_NOT_CONFIGURED');
  for(const [key,value] of Object.entries({connectionTimeout:'5000',greetingTimeout:'5000',socketTimeout:'8000',dnsTimeout:'5000',disableFileAccess:'true',disableUrlAccess:'true'}))smtpUrl.searchParams.set(key,value);
  if(process.env.NODE_ENV==='production')smtpUrl.searchParams.set('requireTLS','true');
  const transport=nodemailer.createTransport(smtpUrl.toString());
  try { return await db.tx(async c=>{
    const r=await c.query(`SELECT o.id,i.id AS invite_id,i.email,i.state,i.expires_at,w.name FROM studio.mail_outbox o
      JOIN studio.workspace_invites i ON i.id=o.invite_id JOIN public.workspaces w ON w.id=i.workspace_id
      WHERE o.state='QUEUED' AND o.next_attempt_at<=now() ORDER BY o.created_at LIMIT 1 FOR UPDATE OF o SKIP LOCKED`);
    const job=r.rows[0];if(!job)return 0;
    if(job.state!=='PENDING'||new Date(job.expires_at)<=new Date()){await c.query(`UPDATE studio.mail_outbox SET state='CANCELLED' WHERE id=$1`,[job.id]);return 0;}
    try {
      await transport.sendMail({from:process.env.STUDIO_MAIL_FROM,to:job.email,subject:`Invitation to ${String(job.name).replace(/[\r\n]/g,' ')}`,text:`You have been invited to ${job.name}. Sign in using this email address and open Invitations at ${origin}/invitations. The invitation expires in seven days. You can ignore this message if it was unexpected.`});
      await c.query(`UPDATE studio.mail_outbox SET state='SENT',sent_at=now(),attempts=attempts+1 WHERE id=$1`,[job.id]);return 1;
    }catch{
      await c.query(`UPDATE studio.mail_outbox SET attempts=attempts+1,state=CASE WHEN attempts>=4 THEN 'FAILED' ELSE 'QUEUED' END,next_attempt_at=now()+interval '5 minutes' WHERE id=$1`,[job.id]);return 0;
    }
  }); } finally {transport.close();}
}
