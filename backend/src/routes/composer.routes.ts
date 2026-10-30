import rateLimit from 'express-rate-limit';
import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { configureComposer, getComposerStatus, validateComposer, installDependencies } from "../controllers/composer.controller.js";

const router = Router();

router.use(requireAuth);
router.use((req,res,next)=>{res.setHeader('Cache-Control','private, no-store');if(res.locals.user.status!=='ACTIVE'){res.status(403).json({message:'An active account is required.'});return;}if(req.method!=='GET'&&req.headers.origin&&req.headers.origin!==new URL(process.env.FRONTEND_URL||'http://localhost:5173').origin){res.status(403).json({message:'This request is not allowed.'});return;}if(req.method!=='GET'&&!req.is('application/json')){res.status(415).json({message:'JSON is required.'});return;}next();});

const writes=rateLimit({windowMs:60000,limit:20,keyGenerator:(_req:Request,res:Response)=>res.locals.user.id,standardHeaders:'draft-8',legacyHeaders:false});
const installs=rateLimit({windowMs:60000,limit:2,keyGenerator:(_req:Request,res:Response)=>res.locals.user.id,standardHeaders:'draft-8',legacyHeaders:false});
router.get("/status", getComposerStatus);
router.patch("/settings",writes,configureComposer);
router.post("/validate", writes, validateComposer);
router.post("/install", installs, installDependencies);

export default router;
