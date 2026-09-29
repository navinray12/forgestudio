import type {Request,Response,NextFunction} from 'express';
import {getAiInfrastructure,updateAiRoute,checkAiProvider} from '../services/aiInfrastructure.service.js';

function errorResponse(res:Response,error:any){
  const status=Number(error?.statusCode)||400;
  return res.status(status).json({success:false,error:{code:error?.code||'AI_INFRASTRUCTURE_ERROR',message:error?.issues?.[0]?.message||error?.message||'AI infrastructure request failed'}});
}
export async function getAiInfrastructureHandler(_req:Request,res:Response,next:NextFunction){
  try{return res.status(200).json({success:true,data:await getAiInfrastructure()});}catch(error){next(error);}
}
export async function updateAiRouteHandler(req:Request,res:Response,next:NextFunction){
  try{
    const admin=res.locals.user;
    if(!admin?.id)return res.status(401).json({success:false,error:{code:'UNAUTHORIZED',message:'Authentication required'}});
    const data=await updateAiRoute(admin.id,String(req.params.feature||''),req.body);
    return res.status(200).json({success:true,data});
  }catch(error:any){if(error?.statusCode||error?.name==='ZodError')return errorResponse(res,error);next(error);}
}
export async function checkAiProviderHandler(req:Request,res:Response,next:NextFunction){
  try{
    const admin=res.locals.user;
    if(!admin?.id)return res.status(401).json({success:false,error:{code:'UNAUTHORIZED',message:'Authentication required'}});
    const data=await checkAiProvider(admin.id,String(req.params.provider||''));
    return res.status(200).json({success:true,data});
  }catch(error:any){if(error?.statusCode)return errorResponse(res,error);next(error);}
}
