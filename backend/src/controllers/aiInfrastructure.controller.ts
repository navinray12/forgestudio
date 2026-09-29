import type {Request,Response,NextFunction} from 'express';
import {getAIInfrastructure,setAIInfrastructureRoute,checkAIProvider} from '../modules/studio-next/ai-control.js';

export async function getAiInfrastructureHandler(_req:Request,res:Response,next:NextFunction){
  try{return res.status(200).json({success:true,data:await getAIInfrastructure()});}catch(error){next(error);}
}
export async function updateAiRouteHandler(req:Request,res:Response,next:NextFunction){
  try{
    const admin=res.locals.user;if(!admin?.id)return res.status(401).json({success:false,error:{code:'UNAUTHORIZED',message:'Authentication required'}});
    const data=await setAIInfrastructureRoute(admin.id,{feature:String(req.params.feature||''),...req.body});
    return res.status(200).json({success:true,data});
  }catch(error){next(error);}
}
export async function checkAiProviderHandler(req:Request,res:Response,next:NextFunction){
  try{
    const admin=res.locals.user;if(!admin?.id)return res.status(401).json({success:false,error:{code:'UNAUTHORIZED',message:'Authentication required'}});
    const data=await checkAIProvider(admin.id,String(req.params.provider||''));
    return res.status(200).json({success:true,data});
  }catch(error){next(error);}
}
