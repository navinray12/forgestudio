/** Disposable integration contract. Never imports or auto-migrates the production application. */
import pg from 'pg';
import express from 'express';
import { createServer } from 'node:http';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Database,type Actor } from '../../src/modules/studio-next/database.js';
import { createStudioNextRouter,type RouterOptions } from '../../src/modules/studio-next/router.js';
export const url=process.env.STUDIO_TEST_DATABASE_URL;
export function testPool(){
  if(!url||new URL(url).pathname!=='/forgestudio_studio_test')throw new Error('Use only the disposable forgestudio_studio_test database');
  return new pg.Pool({connectionString:url,max:12});
}
export async function install(pool:pg.Pool){
  await pool.query(`
  CREATE TABLE IF NOT EXISTS public.users(id uuid PRIMARY KEY,status text NOT NULL DEFAULT 'ACTIVE',role text NOT NULL DEFAULT 'USER',"fullName" text,email text,"emailVerified" boolean NOT NULL DEFAULT true);
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT true;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'USER';
  CREATE TABLE IF NOT EXISTS public.sessions(id uuid PRIMARY KEY,"userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,"tokenHash" text UNIQUE NOT NULL,"expiresAt" timestamptz NOT NULL,"revokedAt" timestamptz,"lastUsedAt" timestamptz);
  CREATE TABLE IF NOT EXISTS public.workspaces(id uuid PRIMARY KEY,"ownerId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,name text,slug text UNIQUE,settings jsonb,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
  CREATE TABLE IF NOT EXISTS public.workspace_members(id uuid PRIMARY KEY,"workspaceId" uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,"userId" uuid REFERENCES public.users(id) ON DELETE CASCADE,role text,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now(),UNIQUE("workspaceId","userId"));
  CREATE TABLE IF NOT EXISTS public.websites(id uuid PRIMARY KEY,"userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,name text,slug text,status text,"editorData" jsonb,"workspaceId" uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
  CREATE TABLE IF NOT EXISTS public.website_collaborators(id uuid PRIMARY KEY,"websiteId" uuid REFERENCES public.websites(id) ON DELETE CASCADE,"userId" uuid REFERENCES public.users(id) ON DELETE CASCADE,permission text,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now(),UNIQUE("websiteId","userId"));
  CREATE TABLE IF NOT EXISTS public.granular_permissions(id uuid PRIMARY KEY,"websiteId" uuid REFERENCES public.websites(id) ON DELETE CASCADE,"userId" uuid REFERENCES public.users(id) ON DELETE CASCADE,"resourceId" text,capability text,effect text,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now(),UNIQUE("websiteId","userId","resourceId",capability));
  `);
  for(const [table,file] of [['studio.site_state','20260928150000_studio_dashboard'],['studio.collections','20260928200000_studio_platform']]){
    const exists=await pool.query('SELECT to_regclass($1) AS name',[table]);
    if(!exists.rows[0].name)await pool.query(await readFile(new URL(`../../prisma/migrations/${file}/migration.sql`,import.meta.url),'utf8'));
  }
  await pool.query(await readFile(new URL('../../prisma/migrations/20260928210000_studio_constraint_order/migration.sql',import.meta.url),'utf8'));
  const ai=await pool.query("SELECT to_regclass('studio.command_receipts') AS name");
  if(!ai.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928220000_studio_commands_ai/migration.sql',import.meta.url),'utf8'));
  const releases=await pool.query("SELECT to_regclass('studio.releases') AS name");
  if(!releases.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928230000_studio_releases/migration.sql',import.meta.url),'utf8'));
  const webhooks=await pool.query("SELECT to_regclass('studio.webhook_endpoints') AS name");
  if(!webhooks.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928240000_studio_webhooks/migration.sql',import.meta.url),'utf8'));
  const governance=await pool.query("SELECT to_regclass('studio.feature_flags') AS name");
  if(!governance.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928250000_studio_governance/migration.sql',import.meta.url),'utf8'));
  const analyticsEvents=await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='studio' AND table_name='analytics_events' AND column_name='attributes'");
  if(!analyticsEvents.rowCount)await pool.query(await readFile(new URL('../../prisma/migrations/20260928260000_studio_analytics_events/migration.sql',import.meta.url),'utf8'));
  const aiControl=await pool.query("SELECT to_regclass('studio.ai_model_routes') AS name");
  if(!aiControl.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928270000_studio_ai_control_plane/migration.sql',import.meta.url),'utf8'));
  const assetProvenance=await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='media_assets' AND column_name='provenance'");
  if(!assetProvenance.rowCount){
    await pool.query(`CREATE TABLE IF NOT EXISTS public.media_assets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,"websiteId" uuid REFERENCES public.websites(id) ON DELETE SET NULL,filename varchar(255) NOT NULL,"originalName" varchar(255) NOT NULL,"mimeType" varchar(100) NOT NULL,"sizeBytes" integer NOT NULL,url varchar(1000) NOT NULL,width integer,height integer,"altText" varchar(500),format varchar(50) NOT NULL DEFAULT 'ORIGINAL',"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await pool.query(await readFile(new URL('../../prisma/migrations/20260928280000_asset_provenance_ai_images/migration.sql',import.meta.url),'utf8'));
  }
  const codeArtifacts=await pool.query("SELECT to_regclass('studio.code_component_artifacts') AS name");
  if(!codeArtifacts.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928290000_code_sandbox_components/migration.sql',import.meta.url),'utf8'));
  const presence=await pool.query("SELECT to_regclass('studio.presence_leases') AS name");
  if(!presence.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928300000_distributed_presence/migration.sql',import.meta.url),'utf8'));
  const commerceExpansion=await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='studio' AND table_name='products' AND column_name='billing_type'");
  if(!commerceExpansion.rowCount)await pool.query(await readFile(new URL('../../prisma/migrations/20260928310000_commerce_expansion/migration.sql',import.meta.url),'utf8'));
  const enterprise=await pool.query("SELECT to_regclass('studio.enterprise_identity_configs') AS name");
  if(!enterprise.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928320000_enterprise_identity/migration.sql',import.meta.url),'utf8'));
  const oidcStates=await pool.query("SELECT to_regclass('studio.oidc_login_states') AS name");
  if(!oidcStates.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928330000_oidc_login/migration.sql',import.meta.url),'utf8'));
  const aiControlExtension=await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='studio' AND table_name='ai_model_routes' AND column_name='daily_budget_units'");
  if(!aiControlExtension.rowCount)await pool.query(await readFile(new URL('../../prisma/migrations/20260928340000_ai_control_extensions/migration.sql',import.meta.url),'utf8'));
  const blogPersonalization=await pool.query("SELECT to_regclass('studio.blog_configs') AS name");
  if(!blogPersonalization.rows[0].name)await pool.query(await readFile(new URL('../../prisma/migrations/20260928350000_blog_personalization/migration.sql',import.meta.url),'utf8'));
}
export type TestActor=Actor&{token:string};
export async function actor(pool:pg.Pool,overrides:Partial<Actor>={},status='ACTIVE'):Promise<TestActor>{
  const user={id:randomUUID(),fullName:'Integration Tester',email:`${randomUUID()}@example.test`,emailVerified:true,...overrides};
  await pool.query('INSERT INTO public.users(id,"fullName",email,"emailVerified",status) VALUES($1,$2,$3,$4,$5)',[user.id,user.fullName,user.email,user.emailVerified,status]);
  const token=randomBytes(32).toString('hex');await pool.query('INSERT INTO public.sessions(id,"userId","tokenHash","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',[randomUUID(),user.id,createHash('sha256').update(token).digest('hex')]);
  return {...user,token};
}
export async function site(pool:pg.Pool,owner:Actor,design:any={version:1,elements:[{id:'heading',type:'heading',content:'Original heading',styles:{color:'#112233'}}]},status='PUBLISHED'){
  const id=randomUUID();await pool.query('INSERT INTO public.websites(id,"userId",name,slug,status,"editorData") VALUES($1,$2,$3,$4,$5,$6::jsonb)',[id,owner.id,'Integration site',`site-${id}`,status,JSON.stringify(design)]);return id;
}
export async function workspace(pool:pg.Pool,owner:Actor){const id=randomUUID();await pool.query('INSERT INTO public.workspaces(id,"ownerId",name,slug) VALUES($1,$2,$3,$4)',[id,owner.id,'Integration workspace',`workspace-${id}`]);return id;}
export async function grant(pool:pg.Pool,siteId:string,user:Actor,permission:string){await pool.query('INSERT INTO public.website_collaborators(id,"websiteId","userId",permission) VALUES($1,$2,$3,$4)',[randomUUID(),siteId,user.id,permission]);}
export function serverFor(db:Database,options:RouterOptions={}){
  const app=express();app.use('/api/v1/studio-next',createStudioNextRouter(db,options));return {app,server:createServer(app)};
}
