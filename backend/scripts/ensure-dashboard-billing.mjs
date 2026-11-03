import 'dotenv/config';import pg from 'pg';import {readFile} from 'node:fs/promises';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:4000});const c=await pool.connect();
try{
 await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='30s'");
 const snapshots=new Map();for(const table of ['users','websites','workspaces','user_subscriptions','billing_invoices','support_categories','support_tickets','dashboard_billing_customers','_prisma_migrations']){if((await c.query('SELECT to_regclass($1) AS name',[table])).rows[0].name)snapshots.set(table,(await c.query(`SELECT to_jsonb(t) AS data FROM ${table} t`)).rows.map(r=>JSON.stringify(r.data)));}
 if(process.argv.includes('--apply')){
  await c.query(await readFile(new URL('../prisma/migrations/20261028180000_dashboard_billing/migration.sql',import.meta.url),'utf8'));
  for(const[table,rows]of snapshots){const after=new Set((await c.query(`SELECT to_jsonb(t) AS data FROM ${table} t`)).rows.map(r=>JSON.stringify(r.data)));if(rows.some(row=>!after.has(row)))throw new Error(`${table}: existing data changed; rolling back`);}
 }
 const ready=(await c.query("SELECT to_regclass('dashboard_billing_customers') IS NOT NULL AND to_regclass('support_tickets') IS NOT NULL AS ready")).rows[0].ready;
 await c.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');console.log(JSON.stringify({ready,applied:process.argv.includes('--apply'),existingDataPreserved:true,migrationHistoryUnchanged:true}));if(!ready)process.exitCode=1;
}catch(error){await c.query('ROLLBACK');console.error(error.message);process.exitCode=1;}finally{c.release();await pool.end();}
