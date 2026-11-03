import 'dotenv/config';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:4000});
const c=await pool.connect();
try {
 await c.query('BEGIN'); await c.query("SET LOCAL lock_timeout='5s'"); await c.query("SET LOCAL statement_timeout='30s'");
 const tables=['users','websites','workspaces','_prisma_migrations','forum_categories','forum_topics','forum_posts'];
 const snapshots=new Map();
 for(const table of tables){const exists=(await c.query('SELECT to_regclass($1) AS table',[table])).rows[0].table;if(exists)snapshots.set(table,(await c.query(`SELECT id,to_jsonb(t) AS data FROM ${table} t ORDER BY id`)).rows);}
 if(process.argv.includes('--apply')) {
  await c.query(await readFile(new URL('../prisma/migrations/20261028160000_dashboard_forum/migration.sql',import.meta.url),'utf8'));
  for(const [table,rows] of snapshots){const after=new Map((await c.query(`SELECT id,to_jsonb(t) AS data FROM ${table} t ORDER BY id`)).rows.map(row=>[row.id,row.data]));for(const row of rows)if(JSON.stringify(row.data)!==JSON.stringify(after.get(row.id)))throw new Error(`${table}: existing record changed; rolling back`);}
 }
 const ready=(await c.query("SELECT to_regclass('forum_categories') IS NOT NULL AND to_regclass('forum_topics') IS NOT NULL AND to_regclass('forum_posts') IS NOT NULL AS ready")).rows[0].ready;
 await c.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');console.log(JSON.stringify({ready,applied:process.argv.includes('--apply'),existingRecordsPreserved:true,migrationHistoryUnchanged:true}));if(!ready)process.exitCode=1;
}catch(error){await c.query('ROLLBACK');console.error(error.message);process.exitCode=1;}finally{c.release();await pool.end();}
