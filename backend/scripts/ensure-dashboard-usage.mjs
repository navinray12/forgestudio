import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export async function ensureDashboardUsageStorage(pool, apply = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); await client.query("SET LOCAL lock_timeout='5s'"); await client.query("SET LOCAL statement_timeout='30s'");
    const inspect = async () => (await client.query(`SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='dashboard_ai_credit_usage'`)).rows;
    const valid = columns => ['id','accountId','actorId','websiteId','workspaceId'].every(name=>columns.some(column=>column.column_name===name&&column.data_type==='uuid'))
      && columns.some(column=>column.column_name==='credits'&&column.data_type==='integer'&&column.is_nullable==='NO')
      && columns.some(column=>column.column_name==='createdAt'&&column.data_type==='timestamp with time zone')
      && ['feature','requestKey'].every(name=>columns.some(column=>column.column_name===name&&column.data_type==='character varying'));
    const columns = await inspect();
    if (columns.length && !valid(columns)) throw new Error('Usage storage has an unexpected definition; no changes made');
    if (columns.length || !apply) { await client.query('ROLLBACK'); return { ready: valid(columns), changed: false }; }
    const fingerprint = async () => (await client.query(`SELECT
      (SELECT md5(coalesce(string_agg(to_jsonb(w)::text,'' ORDER BY id),'')) FROM websites w) AS websites,
      (SELECT md5(coalesce(string_agg(to_jsonb(w)::text,'' ORDER BY id),'')) FROM workspaces w) AS workspaces,
      (SELECT md5(coalesce(string_agg(to_jsonb(m)::text,'' ORDER BY id),'')) FROM _prisma_migrations m) AS history`)).rows[0];
    const before = await fingerprint();
    await client.query(await readFile(new URL('../prisma/migrations/20261028130000_dashboard_ai_credit_usage/migration.sql',import.meta.url),'utf8'));
    if (!valid(await inspect()) || JSON.stringify(before)!==JSON.stringify(await fingerprint())) throw new Error('Usage storage verification failed; transaction rolled back');
    await client.query('COMMIT');return { ready: true, changed: true, existingWebsitesAndWorkspacesPreserved: true, migrationHistoryUnchanged: true };
  } catch(error) {await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:4000});
  try {if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');const result=await ensureDashboardUsageStorage(pool,process.argv.includes('--apply'));console.log(JSON.stringify(result,null,2));if(!result.ready)process.exitCode=1;}
  catch(error){console.error(JSON.stringify({ready:false,message:error.message,code:error.code||'USAGE_SETUP_FAILED'}));process.exitCode=1;}
  finally{await pool.end();}
}
