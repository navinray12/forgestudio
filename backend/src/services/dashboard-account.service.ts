import sharp from 'sharp';
import {AppError} from '../utils/app-error.js';
export type AccountInput={firstName:string;lastName:string;city:string;timezone:string;dateFormat:string;dailyHours:number;coreMinHours:number;coreMaxHours:number;workFunction:string;jobTitle:string;expectedVersion:number;expectedFullName:string|null;avatarData?:string|null};
export function splitAccountName(fullName:string|null){const[firstName='',...rest]=(fullName||'').trim().split(/\s+/);return {firstName,lastName:rest.join(' ')};}
export async function normalizeAccountPhoto(data:string|null|undefined){
 if(data===undefined||data===null)return data;
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
 if(!match)throw new AppError('Choose a PNG, JPEG or WebP photo.',400,'INVALID_ACCOUNT_PHOTO');
 const bytes=Buffer.from(match[2]!,'base64');if(bytes.length>2*1024*1024||!bytes.length)throw new AppError('Choose a photo smaller than 2 MB.',400,'INVALID_ACCOUNT_PHOTO');
 try{const image=sharp(bytes,{limitInputPixels:16_000_000,animated:false});const meta=await image.metadata();if(!['png','jpeg','webp'].includes(meta.format||''))throw Error('Invalid image');const output=await image.rotate().resize(256,256,{fit:'cover',withoutEnlargement:true}).webp({quality:80}).toBuffer();return `data:image/webp;base64,${output.toString('base64')}`;}catch{throw new AppError('This photo could not be read. Choose a smaller PNG, JPEG or WebP image.',400,'INVALID_ACCOUNT_PHOTO');}
}
function mapAccount(user:any,p:any){const names=p&&`${p.firstName} ${p.lastName}`.trim()===(user.fullName||'')?{firstName:p.firstName,lastName:p.lastName}:splitAccountName(user.fullName);return {...names,fullName:user.fullName,email:user.email,emailVerified:user.emailVerified,city:p?.city||'',timezone:p?.timezone||'UTC',dateFormat:p?.dateFormat||'dd/MM/yyyy HH:mm',dailyHours:p?.dailyHours??7,coreMinHours:p?.coreMinHours??3,coreMaxHours:p?.coreMaxHours??6,workFunction:p?.workFunction||'',jobTitle:p?.jobTitle||'',avatarData:p?.avatarData||null,version:p?.version||0};}
export function createDashboardAccountService(db:any){
 async function user(tx:any,id:string,lock=false){const[row]=lock?await tx.$queryRaw`SELECT "fullName",email,"emailVerified",status FROM users WHERE id=${id}::uuid FOR UPDATE`:await tx.$queryRaw`SELECT "fullName",email,"emailVerified",status FROM users WHERE id=${id}::uuid`;if(!row||row.status!=='ACTIVE')throw new AppError('Your account cannot access settings',403,'ACCOUNT_INACTIVE');return row;}
 async function read(userId:string){return db.$transaction(async(tx:any)=>{const u=await user(tx,userId);const[p]=await tx.$queryRaw`SELECT * FROM dashboard_account_profiles WHERE "userId"=${userId}::uuid`;return mapAccount(u,p);},{isolationLevel:'RepeatableRead'});}
 async function update(userId:string,input:AccountInput){const avatar=await normalizeAccountPhoto(input.avatarData);return db.$transaction(async(tx:any)=>{const u=await user(tx,userId,true);const[p]=await tx.$queryRaw`SELECT * FROM dashboard_account_profiles WHERE "userId"=${userId}::uuid FOR UPDATE`;
  if((p?.version||0)!==input.expectedVersion||u.fullName!==input.expectedFullName)throw new AppError('Your account was changed in another tab. Reload the latest details before saving.',409,'ACCOUNT_SETTINGS_CONFLICT');
  const version=(p?.version||0)+1,photo=avatar===undefined?p?.avatarData||null:avatar,fullName=`${input.firstName} ${input.lastName}`.trim();
  await tx.$executeRaw`INSERT INTO dashboard_account_profiles("userId","firstName","lastName",city,timezone,"dateFormat","dailyHours","coreMinHours","coreMaxHours","workFunction","jobTitle","avatarData",version) VALUES(${userId}::uuid,${input.firstName},${input.lastName},${input.city},${input.timezone},${input.dateFormat},${input.dailyHours},${input.coreMinHours},${input.coreMaxHours},${input.workFunction},${input.jobTitle},${photo},${version}) ON CONFLICT("userId") DO UPDATE SET "firstName"=EXCLUDED."firstName","lastName"=EXCLUDED."lastName",city=EXCLUDED.city,timezone=EXCLUDED.timezone,"dateFormat"=EXCLUDED."dateFormat","dailyHours"=EXCLUDED."dailyHours","coreMinHours"=EXCLUDED."coreMinHours","coreMaxHours"=EXCLUDED."coreMaxHours","workFunction"=EXCLUDED."workFunction","jobTitle"=EXCLUDED."jobTitle","avatarData"=EXCLUDED."avatarData",version=EXCLUDED.version,"updatedAt"=now()`;
  // Keep legacy name displays and existing authentication payloads in sync; never change sign-in credentials.
  if(fullName!==u.fullName)await tx.$executeRaw`UPDATE users SET "fullName"=${fullName},"updatedAt"=now() WHERE id=${userId}::uuid`;
  return {...mapAccount({...u,fullName},{...input,avatarData:photo,version}),version};
 });}
 return {read,update};
}
