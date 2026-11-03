import {Router,type RequestHandler} from 'express';
import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import type {createDashboardSecurityService} from '../services/dashboard-security.service.js';
import {AUTH_COOKIE_NAME,AUTH_COOKIE_OPTIONS} from '../config/auth.js';
export const passwordChangeInput=z.object({currentPassword:z.string().min(1).max(256),newPassword:z.string().min(12).max(128),code:z.string().max(32).default('')}).strict();
const code=z.string().trim().regex(/^(\d{6}|[A-Fa-f0-9-]{16,20})$/);
export function createDashboardSecurityRouter(auth:RequestHandler,service:ReturnType<typeof createDashboardSecurityService>){
 const r=Router(),limit=rateLimit({windowMs:15*60_000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{message:'Too many security attempts. Please try again in 15 minutes.'}});
 const origin:RequestHandler=(req,res,next)=>{if(req.method!=='GET'){const allowed=new URL(process.env.FRONTEND_URL||'http://localhost:5173').origin;if(req.headers.origin&&req.headers.origin!==allowed||!req.is('application/json')){res.status(403).json({message:'This security request is not allowed.'});return;}}res.setHeader('Cache-Control','private, no-store');next();};
 const handle=(schema:z.ZodType,fn:(u:string,s:string,input:any,ua:string)=>Promise<any>):RequestHandler=>async(req,res,next)=>{const parsed=schema.safeParse(req.method==='GET'?req.query:req.body);if(!parsed.success){res.status(400).json({message:'Check the security fields and try again.'});return;}try{res.json(await fn(res.locals.user.id,res.locals.session.id,parsed.data,req.get('user-agent')||''));}catch(e){next(e);}};
 r.get('/dashboard/security',auth,origin,handle(z.object({}).strict(),(u,s,_i,ua)=>service.read(u,s,ua)));
 r.post('/dashboard/security/password',auth,origin,limit,handle(passwordChangeInput,(u,s,i)=>service.changePassword(u,s,i)));
 r.post('/dashboard/security/2fa/setup',auth,origin,limit,handle(z.object({currentPassword:z.string().min(1).max(256)}).strict(),(u,s,i)=>service.setup(u,s,i.currentPassword)));
 r.post('/dashboard/security/2fa/enable',auth,origin,limit,handle(z.object({code:z.string().regex(/^\d{6}$/)}).strict(),(u,s,i)=>service.enable(u,s,i.code)));
 r.post('/dashboard/security/2fa/disable',auth,origin,limit,handle(z.object({currentPassword:z.string().min(1).max(256),code}).strict(),(u,s,i)=>service.disable(u,s,i)));
 r.post('/dashboard/security/sessions/revoke',auth,origin,limit,handle(z.object({id:z.uuid()}).strict(),(u,s,i)=>service.revoke(u,s,i.id)));
 r.post('/auth/login/verify-2fa',origin,limit,async(req,res,next)=>{const input=z.object({challenge:z.string().regex(/^[a-f0-9]{64}$/),code}).strict().safeParse(req.body);if(!input.success){res.status(400).json({message:'Enter a valid verification code.'});return;}try{const session=await service.verifyChallenge(input.data.challenge,input.data.code);res.cookie(AUTH_COOKIE_NAME,session.token,AUTH_COOKIE_OPTIONS);res.json({success:true});}catch(e){next(e);}});
 return r;
}
