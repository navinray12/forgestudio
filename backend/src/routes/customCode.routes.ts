import {codeTemplates} from '../services/code-manager-templates.js';
import { Router } from 'express';
import { getManagerSnippets, getCustomCodeSnippets, createCustomCodeSnippet, updateCustomCodeSnippet, deleteCustomCodeSnippet } from '../controllers/customCode.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use((_req,res,next)=>{res.setHeader('Cache-Control','private, no-store');next();});
router.use(requireAuth as any);
router.use((req,res,next)=>{if(res.locals.user.status!=='ACTIVE'){res.status(403).json({message:'An active account is required.'});return;}if(req.method!=='GET'&&req.headers.origin&&req.headers.origin!==new URL(process.env.FRONTEND_URL||'http://localhost:5173').origin){res.status(403).json({message:'This request is not allowed.'});return;}if(['POST','PUT'].includes(req.method)&&!req.is('application/json')){res.status(415).json({message:'JSON is required.'});return;}next();}); // Ensure all routes are protected

// Note: Get and Create act on a specific websiteId
router.get('/templates',(_req,res)=>res.json({success:true,templates:codeTemplates}));
router.get('/manager/website/:websiteId',getManagerSnippets);
router.get('/website/:websiteId', getCustomCodeSnippets as any);
router.post('/website/:websiteId', createCustomCodeSnippet as any);

// Update and Delete act on a specific snippetId
router.put('/:id', updateCustomCodeSnippet as any);
router.delete('/:id', deleteCustomCodeSnippet as any);

export default router;
