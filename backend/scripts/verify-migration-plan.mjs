// Read-only activation gate. Missing historical bytes block shared activation even
// when Prisma migrate status/deploy would ignore the incomplete local history.
import "dotenv/config";
import pg from "pg";
import path from "node:path";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
const root=path.resolve("migration-plan");
const manifest=JSON.parse(await readFile(path.join(root,"manifest.json"),"utf8"));
const contractBytes=await readFile(path.join(root,"legacy-contract.json"));
const contract=JSON.parse(contractBytes);
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const blockers=[],notes=[];
if(sha(contractBytes)!==manifest.legacyContractSha256)blockers.push("Legacy contract artifact checksum mismatch");
const proposed="20261026190000_workspace_members_email_invites",legacy="20260929000000_complete_legacy_core";
for(const entry of manifest.migrations){
 if(!/^\d{14}_[a-z0-9_]+$/.test(entry.name))throw new Error("Invalid migration name");
 const bytes=await readFile(path.join(root,"migrations",entry.name,"migration.sql"));
 if(sha(bytes)!==entry.checksum)blockers.push(`Migration file checksum mismatch: ${entry.name}`);
 if(entry.name===proposed&&sha(await readFile(path.join("prisma/migrations",proposed,"migration.sql")))!==entry.checksum)blockers.push("Phase 2 checkout SQL differs from staged SQL");
}
for(const item of await readdir(path.join(root,"migrations"),{withFileTypes:true}))if(item.isDirectory()&&!manifest.migrations.some(entry=>entry.name===item.name))blockers.push(`Unmanifested pending migration directory: ${item.name}`);
const pool=new pg.Pool({connectionString:process.env.MIGRATION_PLAN_DATABASE_URL||process.env.DATABASE_URL,connectionTimeoutMillis:5000});
const client=await pool.connect();let database;
try {
 await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 database=(await client.query('SELECT current_database() AS name')).rows[0].name;
 const rehearsal=process.argv.includes("--rehearsal");
 if(rehearsal&&!/^forge_reconcile_clone_[a-f0-9]{32}$/.test(database))throw new Error("Rehearsal exemption is limited to a disposable clone database");
 const rows=(await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY started_at')).rows.filter(row=>!row.rolled_back_at);
 for(const row of rows){
  const entry=manifest.migrations.find(item=>item.name===row.migration_name);
  if(!entry){
   const unrecovered=manifest.unrecovered.find(item=>item.name===row.migration_name&&item.recordedChecksum===row.checksum&&row.finished_at);
   if(rehearsal&&unrecovered)notes.push(`Clone-only exception: unrecovered historical bytes ${row.migration_name}`);
   else blockers.push(`Recover exact historical SQL before activation: ${row.migration_name} (${row.checksum})`);
  }else if(entry.checksum!==row.checksum)blockers.push(`Database ledger checksum differs from plan: ${row.migration_name}`);
  if(!row.finished_at&&row.migration_name!==legacy)blockers.push(`Unexpected unfinished migration: ${row.migration_name}`);
 }
 for(const entry of manifest.migrations)if(entry.name!==proposed&&!rows.some(row=>row.migration_name===entry.name))blockers.push(`Historical migration is not recorded here: ${entry.name}`);
 const legacyRow=rows.find(row=>row.migration_name===legacy);
 if(!legacyRow||legacyRow.checksum!==contract.checksum)blockers.push("Legacy migration record does not match the verified contract");
 const columns=(await client.query(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length FROM information_schema.columns WHERE table_schema='public'`)).rows;
 const constraints=(await client.query(`SELECT c.conname,c.contype,c.convalidated,c.conrelid::regclass::text AS table_name,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'`)).rows;
 const indexes=(await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'")).rows;
 for(const item of contract.columns){const found=columns.find(row=>row.table_name===item.table_name&&row.column_name===item.column_name);if(!found||['data_type','udt_name','is_nullable','column_default','character_maximum_length'].some(key=>found[key]!==item[key]))blockers.push(`Legacy column contract differs: ${item.table_name}.${item.column_name}`);}
 for(const item of contract.constraints){const found=constraints.find(row=>row.table_name===item.table_name&&row.conname===item.conname);if(!found||!found.convalidated||found.definition!==item.definition)blockers.push(`Legacy constraint differs: ${item.conname}`);}
 for(const item of contract.indexes){const found=indexes.find(row=>row.tablename===item.tablename&&row.indexname===item.indexname);if(!found||found.indexdef!==item.indexdef)blockers.push(`Legacy index differs: ${item.indexname}`);}
 const alreadyApplied=rows.some(row=>row.migration_name===proposed&&row.finished_at);
 if(!alreadyApplied&&(columns.some(row=>row.table_name==='workspace_email_invitations')||columns.some(row=>row.table_name==='workspaces'&&row.column_name==='membersVersion')))blockers.push("Unexpected partial Phase 2 schema; inspect before proceeding");
 const lifecycle=columns.find(row=>row.table_name==='workspaces'&&row.column_name==='lifecycleStatus');
 if(lifecycle&&(lifecycle.udt_name!=='varchar'||lifecycle.character_maximum_length!==20||lifecycle.is_nullable!=='NO'))blockers.push("Incompatible workspace lifecycle column");
 await client.query("COMMIT");
 console.log(JSON.stringify({readOnly:true,mode:rehearsal?'clone rehearsal':'reconciliation preflight',legacyContractSatisfied:!blockers.some(value=>value.startsWith('Legacy ')),ready:blockers.length===0,readyToReconcile:blockers.length===0,liveActivationCertified:false,blockers,notes},null,2));
 if(blockers.length)process.exitCode=1;
}finally{await client.query("ROLLBACK").catch(()=>{});client.release();await pool.end();}
