// Read-only shared-database audit. Never imports application Prisma startup code.
import "dotenv/config";
import pg from "pg";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const output = path.resolve("../.integration-review/migration-audit"); await mkdir(output,{recursive:true});
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
const client = await pool.connect();
try {
 await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const history=(await client.query('SELECT id,migration_name,checksum,started_at,finished_at,rolled_back_at,applied_steps_count,logs FROM _prisma_migrations ORDER BY started_at,id')).rows;
 const columns=(await client.query(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows;
 const constraints=(await client.query(`SELECT c.conname,c.contype,c.convalidated,c.conrelid::regclass::text AS table_name,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY c.conrelid::regclass::text,c.conname`)).rows;
 const indexes=(await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows;
 const policies=(await client.query("SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows;
 const tables=(await client.query(`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`)).rows;
 const enums=(await client.query(`SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`)).rows;
 const privileges=(await client.query('SELECT rolcreatedb,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
 const sizes=(await client.query('SELECT pg_database_size(current_database())::text AS database_bytes')).rows[0];
 const counts={};for(const name of ["users","websites","workspaces","workspace_members","workspace_invitations"]){if(tables.some(t=>t.relname===name))counts[name]=(await client.query(`SELECT count(*)::text AS count FROM "${name}"`)).rows[0].count;}
 const manifests={};for(const [label,directory] of [["target","prisma/migrations"],["source","../.integration-review/source/backend/prisma/migrations"]]){
  const entries={};for(const item of await readdir(directory,{withFileTypes:true})){if(!item.isDirectory())continue;const file=path.join(directory,item.name,"migration.sql");try{entries[item.name]=createHash("sha256").update(await readFile(file)).digest("hex");}catch{}}
  manifests[label]=entries;
 }
 const comparison=history.map(row=>({name:row.migration_name,finished:!!row.finished_at,rolledBack:!!row.rolled_back_at,appliedSteps:row.applied_steps_count,
  targetPresent:!!manifests.target[row.migration_name],targetMatches:manifests.target[row.migration_name]===row.checksum,
  sourcePresent:!!manifests.source[row.migration_name],sourceMatches:manifests.source[row.migration_name]===row.checksum,
  error:row.logs?.match(/(?:Database error code:|ERROR:|Error:)[^\n]*/g)?.slice(0,4)||[]}));
 const result={capturedAt:new Date().toISOString(),history,columns,constraints,indexes,policies,tables,enums,privileges,sizes,counts,manifests,comparison};
 await writeFile(path.join(output,"shared-audit.json"),JSON.stringify(result,null,2));
 await client.query("COMMIT");console.log(JSON.stringify({counts,privileges,sizes,tableCount:tables.length,policyCount:policies.length,comparison},null,2));
}finally{await client.query("ROLLBACK").catch(()=>{});client.release();await pool.end();}
