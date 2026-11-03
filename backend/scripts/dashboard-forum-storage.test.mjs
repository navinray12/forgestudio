import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createDashboardForumService} from '../dist/services/dashboard-forum.service.js';
test('real PostgreSQL forum persistence, privacy, permissions, filters, retry safety and additive setup',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:4000});const c=await pool.connect();const schema='forum_test_'+randomUUID().replaceAll('-','');assert.match(schema,/^forum_test_[a-f0-9]{32}$/);
 try{
  await c.query(`CREATE SCHEMA "${schema}"`);await c.query(`SET search_path TO "${schema}"`);
  await c.query('CREATE TABLE users(id uuid PRIMARY KEY,"fullName" text,status text,role text)');
  const sql=await readFile(new URL('../prisma/migrations/20261028160000_dashboard_forum/migration.sql',import.meta.url),'utf8');await c.query(sql);await c.query(sql);
  const user=randomUUID(),other=randomUUID();for(const id of[user,other])await c.query('INSERT INTO users VALUES($1,$2,\'ACTIVE\',\'USER\')',[id,'Fixture member']);
  const db={$queryRawUnsafe:async(sql,...values)=>(await c.query(sql,values)).rows,user:{findUnique:async({where})=>(await c.query('SELECT status,role FROM users WHERE id=$1',[where.id])).rows[0]},$transaction:async(fn)=>{await c.query('BEGIN');try{const result=await fn(db);await c.query('COMMIT');return result;}catch(error){await c.query('ROLLBACK');throw error;}}};
  const service=createDashboardForumService(db),category=(await c.query("SELECT id FROM forum_categories WHERE slug='questions-help'")).rows[0].id;
  const id=randomUUID(),input={id,categoryId:category,title:'A persisted question',content:'Useful discussion content <script>alert(1)</script>'};
  await service.create(user,input);await service.create(user,input);
  assert.equal((await service.read(user,{filter:'latest',page:1})).total,1);assert.equal((await service.detail(user,id)).topic.content,input.content);
  await assert.rejects(service.create(user,{...input,title:'Different title'}),error=>error.statusCode===409);
  const announcement=(await c.query("SELECT id FROM forum_categories WHERE slug='announcements'")).rows[0].id;
  await assert.rejects(service.create(user,{...input,id:randomUUID(),categoryId:announcement}),error=>error.statusCode===403);
  await assert.rejects(service.solve(other,id,true),error=>error.statusCode===403);
  const reply={id:randomUUID(),content:'A helpful reply'};await service.reply(other,id,reply);await service.reply(other,id,reply);
  let data=await service.read(user,{filter:'latest',page:1});assert.equal(data.stats.replies,1);assert.equal(data.topics[0].replyCount,1);assert.equal(data.categories.find(c=>c.id===category).topicCount,1);
  assert.equal((await service.read(user,{filter:'unanswered',page:1})).total,0);
  await service.solve(user,id,true);assert.equal((await service.read(user,{filter:'solved',page:1})).total,1);await service.solve(user,id,false);
  await c.query('UPDATE forum_posts SET "isHidden"=true WHERE id=$1',[reply.id]);assert.equal((await service.detail(user,id)).posts.length,0);assert.equal((await service.read(user,{filter:'unanswered',page:1})).total,1);
  await c.query('UPDATE forum_topics SET "isLocked"=true WHERE id=$1',[id]);await assert.rejects(service.reply(other,id,{id:randomUUID(),content:'blocked'}),error=>error.statusCode===409);
  for(const visibility of ['PRIVATE','WORKSPACE']){await c.query('UPDATE forum_topics SET visibility=$2 WHERE id=$1',[id,visibility]);assert.equal((await service.read(user,{filter:'latest',page:1})).total,0);await assert.rejects(service.detail(user,id),error=>error.statusCode===404);await assert.rejects(service.reply(other,id,reply),error=>error.statusCode===404);}
  await c.query('UPDATE forum_topics SET visibility=\'PUBLIC\',status=\'HIDDEN\' WHERE id=$1',[id]);assert.equal((await service.read(user,{filter:'popular',page:1})).total,0);
  await c.query('UPDATE forum_topics SET status=\'OPEN\' WHERE id=$1',[id]);await c.query('UPDATE forum_categories SET "isPublic"=false WHERE id=$1',[category]);assert.equal((await service.read(user,{filter:'latest',page:1})).stats.topics,0);await assert.rejects(service.detail(user,id),error=>error.statusCode===404);
 }finally{await c.query('ROLLBACK');await c.query('SET search_path TO public');await c.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);c.release();await pool.end();}
});
