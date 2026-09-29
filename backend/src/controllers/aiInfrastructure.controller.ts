import type {Request,Response,NextFunction} from 'express';
import {getAIInfrastructure,setAIInfrastructureRoute,checkAIProvider} from '../modules/studio-next/ai-control.js';

function replyError(res:Response,error:any){
  const status=Number(error?.status||error?.statusCode)||(error?.name==='ZodError'?400:500);
  return res.status(status).json({success:false,error:{code:error?.code||'AI_INFRASTRUCTURE_ERROR',message:error?.issues?.[0]?.message||error?.message||'AI infrastructure request failed'}});
}
export async function getAiInfrastructureHandler(_req:Request,res:Response,next:NextFunction){
  try{return res.status(200).json({success:true,data:await getAIInfrastructure()});}catch(error){next(error);}
}
export async function updateAiRouteHandler(req:Request,res:Response,next:NextFunction){
  try{
    const admin=res.locals.user;if(!admin?.id)return res.status(401).json({success:false,error:{code:'UNAUTHORIZED',message:'Authentication required'}});
    const data=await setAIInfrastructureRoute(admin.id,{...req.body,feature:String(req.params.feature||'')});
    return res.status(200).json({success:true,data});
  }catch(error:any){if(error?.status||error?.statusCode||error?.name==='ZodError')return replyError(res,error);next(error);}
}
export async function checkAiProviderHandler(req:Request,res:Response,next:NextFunction){
  try{
    const admin=res.locals.user;if(!admin?.id)return res.status(401).json({success:false,error:{code:'UNAUTHORIZED',message:'Authentication required'}});
    return res.status(200).json({success:true,data:await checkAIProvider(admin.id,String(req.params.provider||''))});
  }catch(error:any){if(error?.status||error?.statusCode)return replyError(res,error);next(error);}
}
