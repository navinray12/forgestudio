import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {ensureDashboardUsageStorage} from './ensure-dashboard-usage.mjs';
const url=process.env.USAGE_TEST_DATABASE_URL||process.env.DATABASE_URL;
test('usage migration is additive, repeatable and enforces positive credits and persistent idempotency',{skip:!url},async()=>{
 const schema=`usage_storage_test_${randomUUID().replaceAll('-','')}`;assert.match(schema,/^usage_storage_test_[a-f0-9]{32}$/);
 const admin=new pg.Pool({connectionString:url});let pool;
 try{
  await admin.query(`CREATE SCHEMA "${schema}"`);pool=new pg.Pool({connectionString:url,options:`-c search_path=${schema}`});
  await pool.query(`CREATE TABLE users(id UUID PRIMARY KEY);CREATE TABLE workspaces(id UUID PRIMARY KEY);CREATE TABLE websites(id UUID PRIMARY KEY,"editorData" JSONB);CREATE TABLE _prisma_migrations(id TEXT PRIMARY KEY);`);
  const account=randomUUID(),workspace=randomUUID(),site=randomUUID();await pool.query('INSERT INTO users VALUES($1)',[account]);await pool.query('INSERT INTO workspaces VALUES($1)',[workspace]);await pool.query('INSERT INTO websites VALUES($1,$2)',[site,{elements:[{content:'Preserve editor data'}]}]);await pool.query('INSERT INTO _prisma_migrations VALUES(\'existing-history\')');
  const original=(await pool.query('SELECT * FROM websites')).rows;
  assert.deepEqual(await ensureDashboardUsageStorage(pool),{ready:false,changed:false});
  assert.deepEqual(await ensureDashboardUsageStorage(pool,true),{ready:true,changed:true,existingWebsitesAndWorkspacesPreserved:true,migrationHistoryUnchanged:true});
  assert.deepEqual((await pool.query('SELECT * FROM websites')).rows,original);assert.deepEqual(await ensureDashboardUsageStorage(pool,true),{ready:true,changed:false});
  const insert=credits=>pool.query('INSERT INTO dashboard_ai_credit_usage("accountId","actorId","websiteId","workspaceId",credits,feature,"requestKey") VALUES($1,$1,$2,$3,$4,\'AI_TEXT\',\'one-operation\')',[account,site,workspace,credits]);
  await assert.rejects(insert(0),error=>error.code==='23514');await insert(4);await assert.rejects(insert(4),error=>error.code==='23505');
  assert.equal((await pool.query('SELECT sum(credits)::int AS credits FROM dashboard_ai_credit_usage')).rows[0].credits,4);
 }finally{if(pool)await pool.end();await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await admin.end();}
});
