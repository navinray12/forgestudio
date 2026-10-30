import { Router, raw } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { assetsSummary, listStudioAssets, createAssetFolder, updateStudioAsset, uploadStudioAsset, ASSET_CATEGORIES } from '../services/studio-assets.service.js';

const router = Router();
router.use(requireAuth);
const uuid = z.string().uuid();
const scope = z.object({websiteId:uuid.optional()});
router.get('/summary',async(req,res,next)=>{try {const q=scope.parse(req.query);res.json(await assetsSummary(res.locals.user.id,q.websiteId));}catch(e){next(e);}});
router.get('/assets',async(req,res,next)=>{try {const q=scope.extend({category:z.enum(ASSET_CATEGORIES).optional(),folderId:uuid.optional(),search:z.string().max(200).optional(),trash:z.enum(['true','false']).optional(),page:z.coerce.number().int().min(1).max(100000).optional()}).parse(req.query);res.json(await listStudioAssets(res.locals.user.id,{...q,trash:q.trash==='true'}));}catch(e){next(e);}});
router.post('/folders',async(req,res,next)=>{try {const {name}=z.object({name:z.string().trim().min(1).max(100)}).parse(req.body);res.status(201).json({folder:await createAssetFolder(res.locals.user.id,name)});}catch(e){next(e);}});
router.patch('/assets/:id',async(req,res,next)=>{try {const id=uuid.parse(req.params.id);const body=z.object({folderId:uuid.nullable().optional(),category:z.enum(ASSET_CATEGORIES).optional(),trashed:z.boolean().optional(),altText:z.string().max(500).optional()}).strict().parse(req.body);res.json(await updateStudioAsset(res.locals.user.id,id,body));}catch(e){next(e);}});
router.post('/upload',raw({type:'application/octet-stream',limit:'25mb'}),async(req,res,next)=>{try {const q=scope.extend({filename:z.string().trim().min(1).max(255),folderId:uuid.optional(),category:z.enum(ASSET_CATEGORIES).optional()}).parse(req.query);if(!Buffer.isBuffer(req.body)) {res.status(400).json({message:'Expected binary file body'});return;}res.status(201).json({asset:await uploadStudioAsset(res.locals.user.id,q.filename,req.body,q)});}catch(e){next(e);}});
router.use((error:unknown,_req:import('express').Request,res:import('express').Response,next:import('express').NextFunction)=>{if(error instanceof z.ZodError){res.status(400).json({message:'Invalid asset request',issues:error.issues});return;}if((error as {type?:string})?.type==='entity.too.large'){res.status(413).json({message:'Files must be 25 MB or smaller'});return;}next(error);});
export default router;
