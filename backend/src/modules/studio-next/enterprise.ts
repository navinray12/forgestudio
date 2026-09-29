import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {parse,uuid,StudioError} from './validation.js';

const domain=z.string().trim().toLowerCase().max(255).regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/).nullable();
const configInput=z.object({
  oidcEnabled:z.boolean(),
  issuer:z.string().url().max(1000).nullable(),
  clientId:z.string().trim().max(240).nullable(),
  clientSecretRef:z.string().trim().max(500).regex(/^[A-Za-z0-9/_:.@-]+$/).nullable(),
  allowedEmailDomain:domain,
}).strict();
const scimCreate=z.object({
  schemas:z.array(z.string()).optional(),
  externalId:z.string().trim().min(1).max(255).optional(),
  userName:z.string().email().max(320),
  active:z.boolean().default(true),
  displayName:z.string().trim().max(200).optional(),
  name:z.object({formatted:z.string().trim().max(200).optional(),givenName:z.string().trim().max(100).optional(),familyName:z.string().trim().max(100).optional()}).partial().optional(),
}).passthrough();
const scimPatch=z.object({schemas:z.array(z.string()).optional(),Operations:z.array(z.object({op:z.enum(['replace','Replace','REPLACE']),path:z.string().max(100).optional(),value:z.unknown()}).passthrough()).min(1).max(20)}).passthrough();

function publicHttps(raw:string){
  let value:URL;try{value=new URL(raw);}catch{throw new StudioError('OIDC issuer must be a valid HTTPS URL',400,'INVALID_OIDC_ISSUER');}
  const host=value.hostname.toLowerCase();
  if(value.protocol!=='https:'||value.username||value.password||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal'))throw new StudioError('OIDC issuer must be a public HTTPS origin',400,'INVALID_OIDC_ISSUER');
  if(isIP(host)&&(host==='127.0.0.1'||host==='::1'||host.startsWith('10.')||host.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(host)||host.startsWith('169.254.')))throw new StudioError('OIDC issuer must not use a private network address',400,'INVALID_OIDC_ISSUER');
  value.pathname=value.pathname.replace(/\/$/,'');value.search='';value.hash='';return value.toString().replace(/\/$/,'');
}
function hashToken(token:string){return createHash('sha256').update(token).digest('hex');}
function tokenMatches(value:string,expected:string){const a=Buffer.from(hashToken(value),'hex'),b=Buffer.from(expected,'hex');return a.length===b.length&&timingSafeEqual(a,b);}
function displayName(body:z.infer<typeof scimCreate>){return body.displayName||body.name?.formatted||[body.name?.givenName,body.name?.familyName].filter(Boolean).join(' ')||body.userName.split('@')[0];}
function scimUser(row:any){return {schemas:['urn:ietf:params:scim:schemas:core:2.0:User'],id:String(row.externalId),externalId:String(row.externalId),userName:String(row.email),displayName:row.fullName??undefined,active:!!row.active,meta:{resourceType:'User',lastModified:row.updatedAt}};}

export class EnterpriseIdentity{
  constructor(private db:Database){}
  async get(actor:Actor,workspaceId:string){
    return this.db.tx(async c=>{
      const workspace=await this.db.workspace(c,actor,workspaceId,true);
      const result=await c.query(`SELECT oidc_enabled AS "oidcEnabled",oidc_issuer AS issuer,oidc_client_id AS "clientId",allowed_email_domain AS "allowedEmailDomain",
        (oidc_client_secret_ref IS NOT NULL) AS "clientSecretConfigured",(scim_token_hash IS NOT NULL) AS "scimConfigured",updated_at AS "updatedAt"
        FROM studio.enterprise_identity_configs WHERE workspace_id=$1`,[workspaceId]);
      return {workspace:{id:workspace.id,name:workspace.name,role:workspace.role},configuration:result.rows[0]??{oidcEnabled:false,issuer:null,clientId:null,allowedEmailDomain:null,clientSecretConfigured:false,scimConfigured:false,updatedAt:null}};
    });
  }
  async configure(actor:Actor,workspaceId:string,input:unknown){
    const body=parse(configInput,input);
    if(body.oidcEnabled&&(!body.issuer||!body.clientId||!body.clientSecretRef))throw new StudioError('Enabled OIDC requires issuer, client ID and secret-manager reference',400,'OIDC_CONFIGURATION');
    const issuer=body.issuer?publicHttps(body.issuer):null;
    return this.db.tx(async c=>{
      const workspace=await this.db.workspace(c,actor,workspaceId,true);
      if(workspace.role!=='OWNER')throw new StudioError('Only the workspace owner can change enterprise identity configuration',403,'FORBIDDEN');
      await c.query(`INSERT INTO studio.enterprise_identity_configs(workspace_id,oidc_enabled,oidc_issuer,oidc_client_id,oidc_client_secret_ref,allowed_email_domain,updated_by)
        VALUES($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT(workspace_id) DO UPDATE SET oidc_enabled=EXCLUDED.oidc_enabled,oidc_issuer=EXCLUDED.oidc_issuer,oidc_client_id=EXCLUDED.oidc_client_id,oidc_client_secret_ref=EXCLUDED.oidc_client_secret_ref,allowed_email_domain=EXCLUDED.allowed_email_domain,updated_by=EXCLUDED.updated_by,updated_at=now()`,
        [workspaceId,body.oidcEnabled,issuer,body.clientId,body.clientSecretRef,body.allowedEmailDomain,actor.id]);
      await c.query(`INSERT INTO studio.events(id,actor_id,workspace_id,action,label) VALUES($1,$2,$3,'enterprise.identity_configured',$4)`,[randomUUID(),actor.id,workspaceId,body.oidcEnabled?'OIDC enabled':'OIDC disabled']);
      return {oidcEnabled:body.oidcEnabled,issuer,clientId:body.clientId,allowedEmailDomain:body.allowedEmailDomain,clientSecretConfigured:!!body.clientSecretRef};
    });
  }
  async rotateScimToken(actor:Actor,workspaceId:string){
    const token='fscim_'+randomBytes(32).toString('base64url'),tokenHash=hashToken(token);
    await this.db.tx(async c=>{
      const workspace=await this.db.workspace(c,actor,workspaceId,true);
      if(workspace.role!=='OWNER')throw new StudioError('Only the workspace owner can rotate SCIM credentials',403,'FORBIDDEN');
      await c.query(`INSERT INTO studio.enterprise_identity_configs(workspace_id,scim_token_hash,updated_by) VALUES($1,$2,$3)
        ON CONFLICT(workspace_id) DO UPDATE SET scim_token_hash=EXCLUDED.scim_token_hash,updated_by=EXCLUDED.updated_by,updated_at=now()`,[workspaceId,tokenHash,actor.id]);
      await c.query(`INSERT INTO studio.events(id,actor_id,workspace_id,action,label) VALUES($1,$2,$3,'enterprise.scim_token_rotated','SCIM token rotated')`,[randomUUID(),actor.id,workspaceId]);
    });
    return {token,displayedOnce:true};
  }
  async authenticateScim(workspaceId:string,authorization:string|undefined){
    parse(uuid,workspaceId);
    const token=authorization?.startsWith('Bearer ')?authorization.slice(7):'';
    if(!token||token.length>512)throw new StudioError('SCIM bearer token required',401,'SCIM_UNAUTHORIZED');
    const r=await this.db.pool.query('SELECT scim_token_hash FROM studio.enterprise_identity_configs WHERE workspace_id=$1',[workspaceId]);
    if(!r.rows[0]?.scim_token_hash||!tokenMatches(token,r.rows[0].scim_token_hash))throw new StudioError('SCIM bearer token is invalid',401,'SCIM_UNAUTHORIZED');
  }
  private async allowedDomain(workspaceId:string,email:string){
    const r=await this.db.pool.query('SELECT allowed_email_domain FROM studio.enterprise_identity_configs WHERE workspace_id=$1',[workspaceId]);
    const configured=r.rows[0]?.allowed_email_domain;if(configured&&email.split('@')[1]?.toLowerCase()!==configured)throw new StudioError('SCIM user email is outside the workspace domain policy',400,'SCIM_DOMAIN_POLICY');
  }
  async listScim(workspaceId:string,authorization:string|undefined,filter?:string){
    await this.authenticateScim(workspaceId,authorization);
    let email:string|undefined;
    if(filter){const match=/^userName\s+eq\s+"([^"]+)"$/i.exec(filter.trim());if(!match)throw new StudioError('Only userName eq filters are supported',400,'SCIM_FILTER');email=match[1].toLowerCase();}
    const r=await this.db.pool.query(`SELECT s.external_id AS "externalId",s.active,s.updated_at AS "updatedAt",u.email,u."fullName" FROM studio.scim_users s JOIN public.users u ON u.id=s.user_id
      WHERE s.workspace_id=$1 AND ($2::text IS NULL OR lower(u.email)=lower($2)) ORDER BY s.updated_at DESC LIMIT 200`,[workspaceId,email??null]);
    return {schemas:['urn:ietf:params:scim:api:messages:2.0:ListResponse'],totalResults:r.rows.length,startIndex:1,itemsPerPage:r.rows.length,Resources:r.rows.map(scimUser)};
  }
  async createScim(workspaceId:string,authorization:string|undefined,input:unknown){
    await this.authenticateScim(workspaceId,authorization);const body=parse(scimCreate,input),email=body.userName.toLowerCase();await this.allowedDomain(workspaceId,email);
    return this.db.tx(async c=>{
      await c.query('SELECT id FROM public.workspaces WHERE id=$1 FOR UPDATE',[workspaceId]);
      const existingMap=body.externalId?await c.query('SELECT user_id FROM studio.scim_users WHERE workspace_id=$1 AND external_id=$2',[workspaceId,body.externalId]):{rows:[]};
      if(existingMap.rows[0])throw new StudioError('SCIM externalId already exists',409,'SCIM_CONFLICT');
      let user=await c.query('SELECT id,email,"fullName" FROM public.users WHERE lower(email)=lower($1) LIMIT 1',[email]);
      let userId=user.rows[0]?.id;
      if(!userId){userId=randomUUID();await c.query(`INSERT INTO public.users(id,email,"fullName","emailVerified",status,role) VALUES($1,$2,$3,true,'ACTIVE','USER')`,[userId,email,displayName(body)]);}
      const externalId=body.externalId||randomUUID();
      await c.query(`INSERT INTO studio.scim_users(workspace_id,external_id,user_id,active,attributes) VALUES($1,$2,$3,$4,$5::jsonb)`,[workspaceId,externalId,userId,body.active,JSON.stringify({displayName:displayName(body)})]);
      if(body.active)await c.query(`INSERT INTO public.workspace_members(id,"workspaceId","userId",role) VALUES($1,$2,$3,'MEMBER') ON CONFLICT("workspaceId","userId") DO UPDATE SET role='MEMBER',"updatedAt"=now()`,[randomUUID(),workspaceId,userId]);
      const row=await c.query(`SELECT s.external_id AS "externalId",s.active,s.updated_at AS "updatedAt",u.email,u."fullName" FROM studio.scim_users s JOIN public.users u ON u.id=s.user_id WHERE s.workspace_id=$1 AND s.external_id=$2`,[workspaceId,externalId]);
      return scimUser(row.rows[0]);
    });
  }
  async patchScim(workspaceId:string,externalId:string,authorization:string|undefined,input:unknown){
    await this.authenticateScim(workspaceId,authorization);const body=parse(scimPatch,input);
    let active:boolean|undefined,fullName:string|undefined;
    for(const op of body.Operations){
      const path=(op.path||'').toLowerCase();
      if(path==='active'&&typeof op.value==='boolean')active=op.value;
      else if((path==='displayname'||path==='name.formatted')&&typeof op.value==='string'&&op.value.trim().length<=200)fullName=op.value.trim();
      else throw new StudioError('Unsupported SCIM patch operation',400,'SCIM_PATCH');
    }
    return this.db.tx(async c=>{
      const row=await c.query(`SELECT s.user_id,u.email FROM studio.scim_users s JOIN public.users u ON u.id=s.user_id WHERE s.workspace_id=$1 AND s.external_id=$2 FOR UPDATE OF s`,[workspaceId,externalId]);if(!row.rows[0])throw new StudioError('SCIM user not found',404,'NOT_FOUND');
      if(fullName!==undefined)await c.query('UPDATE public.users SET "fullName"=$2,"updatedAt"=now() WHERE id=$1',[row.rows[0].user_id,fullName]);
      if(active!==undefined){
        await c.query('UPDATE studio.scim_users SET active=$3,updated_at=now() WHERE workspace_id=$1 AND external_id=$2',[workspaceId,externalId,active]);
        if(active)await c.query(`INSERT INTO public.workspace_members(id,"workspaceId","userId",role) VALUES($1,$2,$3,'MEMBER') ON CONFLICT("workspaceId","userId") DO UPDATE SET role='MEMBER',"updatedAt"=now()`,[randomUUID(),workspaceId,row.rows[0].user_id]);
        else await c.query('DELETE FROM public.workspace_members WHERE "workspaceId"=$1 AND "userId"=$2',[workspaceId,row.rows[0].user_id]);
      }
      const updated=await c.query(`SELECT s.external_id AS "externalId",s.active,s.updated_at AS "updatedAt",u.email,u."fullName" FROM studio.scim_users s JOIN public.users u ON u.id=s.user_id WHERE s.workspace_id=$1 AND s.external_id=$2`,[workspaceId,externalId]);
      return scimUser(updated.rows[0]);
    });
  }
}
