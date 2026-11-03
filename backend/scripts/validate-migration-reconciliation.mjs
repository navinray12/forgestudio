// Shared database is used only by a READ ONLY transaction/pg_dump. All writes are
// restricted to randomly named disposable databases, verified before each phase.
import "dotenv/config";
import pg from "pg";
import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
const output=path.resolve("../.integration-review/migration-audit");await mkdir(output,{recursive:true});
const sourceUrl=new URL(process.env.DATABASE_URL);
const suffix=randomUUID().replaceAll("-","");
const cloneName=`forge_reconcile_clone_${suffix}`,referenceName=`forge_reconcile_reference_${suffix}`,targetName=`forge_reconcile_target_${suffix}`;
const maintenanceUrl=new URL(sourceUrl);maintenanceUrl.pathname="/postgres";
const admin=new pg.Pool({connectionString:maintenanceUrl.toString(),connectionTimeoutMillis:5000});
const source=new pg.Pool({connectionString:sourceUrl.toString(),connectionTimeoutMillis:5000});
const sourceClient=await source.connect();const created=[];const result={};
const binary=process.env.PG_BIN || "C:/Program Files/PostgreSQL/18/bin";
function postgresEnv(url){return {...process.env,PGHOST:url.hostname,PGPORT:url.port||"5432",PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGSSLMODE:url.searchParams.get("sslmode")||"prefer"};}
async function command(executable,args,env){return new Promise((resolve,reject)=>{const child=spawn(executable,args,{env,windowsHide:true});let stdout="",stderr="";child.stdout.on("data",data=>stdout+=data);child.stderr.on("data",data=>stderr+=data);child.on("error",reject);child.on("close",code=>code===0?resolve({stdout,stderr}):reject(Object.assign(new Error(`Command failed (${code}): ${path.basename(executable)}`),{code,stdout,stderr})));});}
async function disposable(name){if(!/^forge_reconcile_(clone|reference|target)_[a-f0-9]{32}$/.test(name)||name===decodeURIComponent(sourceUrl.pathname.slice(1)))throw new Error("Unsafe disposable database name");await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created.push(name);const url=new URL(sourceUrl);url.pathname=`/${name}`;const pool=new pg.Pool({connectionString:url.toString()});const actual=(await pool.query('SELECT current_database() AS name')).rows[0].name;if(actual!==name)throw new Error("Wrong database");return{url,pool};}
async function catalog(client){return{
 columns:(await client.query(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows,
 constraints:(await client.query(`SELECT c.conname,c.contype,c.convalidated,c.conrelid::regclass::text AS table_name,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY c.conrelid::regclass::text,c.conname`)).rows,
 indexes:(await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows,
 triggers:(await client.query("SELECT c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname")).rows,
 policies:(await client.query("SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows,
};}
const quote=value=>'"'+value.replaceAll('"','""')+'"';
async function fingerprints(client,columns){const groups=new Map();for(const item of columns){if(!groups.has(item.table_name))groups.set(item.table_name,[]);groups.get(item.table_name).push(item.column_name);}const results={};for(const[table,fields]of groups){const data=await client.query(`SELECT md5(row_to_json(original)::text) AS digest FROM (SELECT ${fields.map(quote).join(',')} FROM public.${quote(table)}) original ORDER BY digest`);const hash=createHash('sha256');for(const row of data.rows)hash.update(row.digest+'\n');results[table]={rows:data.rowCount,sha256:hash.digest('hex')};}return results;}
let clone,reference,target;
const dump=path.join(output,"shared-snapshot.dump");
try{
 await sourceClient.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const snapshot=(await sourceClient.query("SELECT pg_export_snapshot() AS snapshot")).rows[0].snapshot;
 const baseline=await catalog(sourceClient);const before=await fingerprints(sourceClient,baseline.columns);
 const historyBefore=(await sourceClient.query('SELECT * FROM _prisma_migrations ORDER BY id')).rows;
 result.sharedSnapshot={tableCount:Object.keys(before).length,rows:Object.fromEntries(Object.entries(before).filter(([key])=>['users','websites','workspaces','workspace_members','workspace_invitations'].includes(key)).map(([key,value])=>[key,value.rows]))};
 await command(path.join(binary,"pg_dump.exe"),["--format=custom","--no-owner","--no-privileges",`--snapshot=${snapshot}`,"--file",dump],postgresEnv(sourceUrl));
 await sourceClient.query("COMMIT");
 clone=await disposable(cloneName);
 await command(path.join(binary,"pg_restore.exe"),["--exit-on-error","--no-owner","--no-privileges","--dbname",cloneName,dump],postgresEnv(clone.url));
 const cloneBefore=await fingerprints(clone.pool,baseline.columns);if(JSON.stringify(before)!==JSON.stringify(cloneBefore))throw new Error("Clone data does not match exported snapshot");
 result.cloneRestored=true;
 reference=await disposable(referenceName);
 await reference.pool.query('CREATE TABLE users(id UUID PRIMARY KEY); CREATE TABLE websites(id UUID PRIMARY KEY)');
 const legacyPath=path.resolve("../.integration-review/source/backend/prisma/migrations/20260929000000_complete_legacy_core/migration.sql");
 const legacy=(await readFile(legacyPath,"utf8")).replaceAll("\r\n","\n").replaceAll("\n","\r\n");
 const legacyRecord=historyBefore.find(row=>row.migration_name==='20260929000000_complete_legacy_core'&&!row.rolled_back_at);
 if(createHash('sha256').update(legacy).digest('hex')!==legacyRecord.checksum)throw new Error("Legacy SQL checksum mismatch");
 await writeFile(path.join(output,"legacy-checksum-verified.sql"),legacy);
 await reference.pool.query(legacy);
 const expected=await catalog(reference.pool),actual=await catalog(clone.pool);
 const tableNames=[...legacy.matchAll(/CREATE TABLE "([^"]+)"/g)].map(match=>match[1]);
 const contract={migration:"20260929000000_complete_legacy_core",checksum:legacyRecord.checksum,
  columns:expected.columns.filter(item=>tableNames.includes(item.table_name)),constraints:expected.constraints.filter(item=>tableNames.includes(item.table_name)),indexes:expected.indexes.filter(item=>tableNames.includes(item.tablename))};
 const contractBytes=JSON.stringify(contract,null,2)+"\n";
 await writeFile("migration-plan/legacy-contract.json",contractBytes);
 const manifest=JSON.parse(await readFile("migration-plan/manifest.json","utf8"));manifest.legacyContractSha256=createHash('sha256').update(contractBytes).digest('hex');await writeFile("migration-plan/manifest.json",JSON.stringify(manifest,null,2)+"\n");
 const missingColumns=[],columnDifferences=[];
 for(const item of expected.columns.filter(item=>tableNames.includes(item.table_name))){const found=actual.columns.find(candidate=>candidate.table_name===item.table_name&&candidate.column_name===item.column_name);if(!found)missingColumns.push(item);else {const changes={};for(const key of ['data_type','udt_name','is_nullable','character_maximum_length','column_default'])if(found[key]!==item[key])changes[key]={expected:item[key],actual:found[key]};if(Object.keys(changes).length)columnDifferences.push({table:item.table_name,column:item.column_name,changes});}}
 const missingConstraints=[],constraintDifferences=[];for(const item of expected.constraints.filter(item=>tableNames.includes(item.table_name))){const found=actual.constraints.find(candidate=>candidate.table_name===item.table_name&&candidate.conname===item.conname);if(!found)missingConstraints.push(item);else if(found.definition!==item.definition||!found.convalidated)constraintDifferences.push({expected:item,actual:found});}
 const missingIndexes=[],indexDifferences=[];for(const item of expected.indexes.filter(item=>tableNames.includes(item.tablename))){const found=actual.indexes.find(candidate=>candidate.tablename===item.tablename&&candidate.indexname===item.indexname);if(!found)missingIndexes.push(item);else if(found.indexdef!==item.indexdef)indexDifferences.push({expected:item,actual:found});}
 result.legacyContract={tableCount:tableNames.length,missingColumns,columnDifferences,missingConstraints,constraintDifferences,missingIndexes,indexDifferences};
 try{await clone.pool.query(legacy);result.legacyReplay={unexpectedSuccess:true};}catch(error){result.legacyReplay={code:error.code,message:error.message};await clone.pool.query("ROLLBACK");}
 if(missingColumns.length||columnDifferences.length||missingConstraints.length||constraintDifferences.length||missingIndexes.length||indexDifferences.length)throw new Error("Legacy contract is not fully satisfied; refusing to resolve even on the clone");
 async function cli(args){try{return{code:0,...await command(process.execPath,["node_modules/prisma/build/index.js","migrate",...args,"--config","migration-plan/reconciliation.config.ts"],{...process.env,MIGRATION_PLAN_DATABASE_URL:clone.url.toString()})};}catch(error){return{code:error.code,stdout:error.stdout,stderr:error.stderr};}}
 const gate=await command(process.execPath,["scripts/verify-migration-plan.mjs","--rehearsal"],{...process.env,MIGRATION_PLAN_DATABASE_URL:clone.url.toString()});result.clonePreflightPassed=true;
 await writeFile(path.join(output,"clone-preflight.json"),gate.stdout);
 const blocked=await cli(["deploy"]);result.deployBeforeResolve={code:blocked.code,p3009:(blocked.stderr+blocked.stdout).includes("P3009")};
 if(!result.deployBeforeResolve.p3009)throw new Error("Expected P3009 on the unresolved clone");
 const resolved=await cli(["resolve","--applied","20260929000000_complete_legacy_core"]);
 if(resolved.code!==0)throw new Error("Clone-only resolve failed: "+resolved.stderr);
 const deployed=await cli(["deploy"]);result.deployAfterResolve={code:deployed.code,stdout:deployed.stdout,stderr:deployed.stderr};
 if(deployed.code!==0)throw new Error("Clone-only deploy failed: "+deployed.stderr);
 const second=await cli(["deploy"]);result.secondDeploy={code:second.code,noPending:(second.stdout+second.stderr).includes("No pending migrations")};
 result.migrationStatus=await cli(["status"]);
 result.phase2Applied=!!(await clone.pool.query("SELECT to_regclass('public.workspace_email_invitations') IS NOT NULL AS present")).rows[0].present;
 target=await disposable(targetName);await target.pool.query(await readFile(path.join(output,"target-schema-reference.sql"),"utf8"));
 const desired=await catalog(target.pool),now=await catalog(clone.pool);
 const targetMissingColumns=[],targetColumnDifferences=[];
 for(const item of desired.columns){const found=now.columns.find(candidate=>candidate.table_name===item.table_name&&candidate.column_name===item.column_name);if(!found)targetMissingColumns.push(item);else {const changes={};for(const key of ['data_type','udt_name','is_nullable','character_maximum_length','column_default'])if(item[key]!==found[key])changes[key]={target:item[key],sharedClone:found[key]};if(Object.keys(changes).length)targetColumnDifferences.push({table:item.table_name,column:item.column_name,changes});}}
 const targetMissingConstraints=[],targetConstraintDifferences=[];
 for(const item of desired.constraints){const found=now.constraints.find(candidate=>candidate.table_name===item.table_name&&candidate.conname===item.conname);if(!found)targetMissingConstraints.push(item);else if(found.definition!==item.definition||!found.convalidated)targetConstraintDifferences.push({target:item,sharedClone:found});}
 const targetMissingIndexes=[],targetIndexDifferences=[];
 for(const item of desired.indexes){const found=now.indexes.find(candidate=>candidate.tablename===item.tablename&&candidate.indexname===item.indexname);if(!found)targetMissingIndexes.push(item);else if(found.indexdef!==item.indexdef)targetIndexDifferences.push({target:item,sharedClone:found});}
 const enumQuery="SELECT t.typname,e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder";
 const targetEnums=(await target.pool.query(enumQuery)).rows,cloneEnums=(await clone.pool.query(enumQuery)).rows;
 const missingEnumValues=targetEnums.filter(item=>!cloneEnums.some(candidate=>candidate.typname===item.typname&&candidate.enumlabel===item.enumlabel));
 result.targetSchemaComparison={missingIndexes:targetMissingIndexes,indexDifferences:targetIndexDifferences,missingEnumValues,missingConstraints:targetMissingConstraints,constraintDifferences:targetConstraintDifferences,targetTableCount:new Set(desired.columns.map(item=>item.table_name)).size,extraTables:[...new Set(now.columns.map(item=>item.table_name))].filter(name=>!desired.columns.some(item=>item.table_name===name)),missingColumns:targetMissingColumns,columnDifferences:targetColumnDifferences};
 await writeFile(path.join(output,"prisma-rehearsal.log"),JSON.stringify({blocked,resolved,deployed,second,status:result.migrationStatus},null,2));
 const after=await fingerprints(clone.pool,baseline.columns);
 result.originalDataUnchanged=Object.keys(before).filter(name=>name!=="_prisma_migrations").every(name=>JSON.stringify(before[name])===JSON.stringify(after[name]));
 if(!result.originalDataUnchanged)throw new Error("Original column values changed");
 const afterCatalog=await catalog(clone.pool);
 result.policiesUnchanged=JSON.stringify(baseline.policies)===JSON.stringify(afterCatalog.policies);
 result.triggersUnchanged=JSON.stringify(baseline.triggers)===JSON.stringify(afterCatalog.triggers);
 result.newColumns=afterCatalog.columns.filter(item=>!baseline.columns.some(original=>original.table_name===item.table_name&&original.column_name===item.column_name));
 const newTables=[...new Set(result.newColumns.map(item=>item.table_name))].filter(name=>!baseline.columns.some(item=>item.table_name===name));result.newTables=newTables;
 const tests=await command(process.execPath,["--test","dist/tests/dashboard-routes.test.js","dist/tests/workspace-invitation-token.test.js","dist/tests/workspace-invitation-smtp.test.js","dist/tests/workspace-members.integration.test.js"],{...process.env,WORKSPACE_TEST_DATABASE_URL:clone.url.toString()});
 result.backendTestsPassed=tests.stdout.includes("# fail 0")&&!tests.stdout.includes("# skipped 1");await writeFile(path.join(output,"backend-tests.log"),tests.stdout);
 await sourceClient.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const sharedFinal=(await sourceClient.query('SELECT * FROM _prisma_migrations ORDER BY id')).rows;
 result.sharedHistoryUnchanged=JSON.stringify(historyBefore)===JSON.stringify(sharedFinal);
 result.sharedSchemaUnchanged=JSON.stringify(baseline)===JSON.stringify(await catalog(sourceClient));
 result.sharedDataUnchanged=JSON.stringify(before)===JSON.stringify(await fingerprints(sourceClient,baseline.columns));
 await sourceClient.query("COMMIT");
 result.cloneHistoryUnchanged=JSON.stringify(historyBefore)===JSON.stringify((await clone.pool.query('SELECT * FROM _prisma_migrations ORDER BY id')).rows);
 await writeFile(path.join(output,"rehearsal.json"),JSON.stringify(result,null,2));
 await writeFile(path.join(output,"original-row-fingerprints.json"),JSON.stringify(before,null,2));
 await writeFile(path.join(output,"clone-final-catalog.json"),JSON.stringify(afterCatalog,null,2));
 console.log(JSON.stringify({sharedSnapshot:result.sharedSnapshot,legacyContract:result.legacyContract,legacyReplay:result.legacyReplay,deployBeforeResolve:result.deployBeforeResolve,deployAfterResolveCode:result.deployAfterResolve.code,secondDeploy:result.secondDeploy,migrationStatusCode:result.migrationStatus.code,originalDataUnchanged:result.originalDataUnchanged,policiesUnchanged:result.policiesUnchanged,triggersUnchanged:result.triggersUnchanged,sharedHistoryUnchanged:result.sharedHistoryUnchanged,sharedSchemaUnchanged:result.sharedSchemaUnchanged,sharedDataUnchanged:result.sharedDataUnchanged,backendTestsPassed:result.backendTestsPassed,target:{tables:result.targetSchemaComparison.targetTableCount,extraTables:result.targetSchemaComparison.extraTables.length,missingColumns:result.targetSchemaComparison.missingColumns.length,columnDifferences:result.targetSchemaComparison.columnDifferences.length,missingConstraints:targetMissingConstraints.length,constraintDifferences:targetConstraintDifferences.length,missingIndexes:targetMissingIndexes.length,indexDifferences:targetIndexDifferences.length,missingEnumValues:missingEnumValues.length}},null,2));
}finally{
 await sourceClient.query("ROLLBACK").catch(()=>{});sourceClient.release();await source.end();
 await clone?.pool.end();await reference?.pool.end();await target?.pool.end();
 for(const name of created.reverse()){if(!/^forge_reconcile_(clone|reference|target)_[a-f0-9]{32}$/.test(name))throw new Error("Unsafe cleanup");await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);}
 await admin.end();
 await unlink(dump).catch(()=>{});
}
