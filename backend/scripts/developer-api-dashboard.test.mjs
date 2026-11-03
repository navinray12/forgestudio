import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
import {ForgeStudioClient} from '../dist/sdk/client.js';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}),ids=[randomUUID(),randomUUID()],sessions=ids.map(()=>randomBytes(32).toString('hex')),api=process.env.TEST_API_URL||'http://localhost:5000';
async function call(path='',method='GET',body,who=0,extra={}){const response=await fetch(api+'/api/v1/'+path,{method,headers:{'Content-Type':'application/json',...(who===null?{}:{cookie:'forge_session='+sessions[who]}),...extra},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,headers:response.headers,data:await response.json().catch(()=>({}))};}
const snapshot=async()=>JSON.stringify((await pool.query('SELECT to_jsonb(k) AS value FROM developer_api_keys k WHERE NOT("userId"=ANY($1::uuid[])) ORDER BY id',[ids])).rows);
const before=await snapshot();
const websiteSnapshot=async()=>(await pool.query('SELECT count(*)::text AS count,md5(coalesce(string_agg(to_jsonb(w)::text,\'\' ORDER BY id),\'\')) AS digest FROM websites w')).rows[0];
const websitesBefore=await websiteSnapshot();
try{
 for(const[i,id]of ids.entries()){await pool.query('INSERT INTO users(id,email,"fullName","emailVerified","updatedAt") VALUES($1,$2,$3,true,now())',[id,`developer-api-${id}@example.invalid`,'API Test']);await pool.query('INSERT INTO sessions(id,"userId","tokenHash","expiresAt") VALUES($1,$2,$3,now()+interval \'30 minutes\')',[randomUUID(),id,createHash('sha256').update(sessions[i]).digest('hex')]);}
 assert.equal((await call('apikeys','GET',undefined,null)).status,401);
 assert.equal((await call('apikeys')).data.keys.length,0);
 for(const body of [{name:' ',scopes:['websites:read']},{name:'Bad',scopes:['*']},{name:'Bad',scopes:[]},{name:'Bad',scopes:['websites:read','websites:read']},{name:'Bad',scopes:['websites:read'],userId:ids[1]}])assert.equal((await call('apikeys','POST',body)).status,400);
 assert.equal((await call('apikeys','POST',{name:'CSRF',scopes:['websites:read']},0,{origin:'https://other.invalid'})).status,403);
 const created=await call('apikeys','POST',{name:'  CI Read  ',scopes:['websites:read']});assert.equal(created.status,201);const secret=created.data.rawSecret,key=created.data.key;assert.match(secret,/^fsk_[a-f0-9]{48}$/);assert.equal(key.name,'CI Read');assert.match(created.headers.get('cache-control'),/no-store/);
 const row=(await pool.query('SELECT * FROM developer_api_keys WHERE id=$1',[key.id])).rows[0];assert.equal(row.tokenHash,createHash('sha256').update(secret).digest('hex'));assert.notEqual(row.tokenHash,secret);
 const listed=await call('apikeys');assert.equal(listed.data.keys.length,1);assert.ok(!JSON.stringify(listed.data).includes(secret));assert.ok(!JSON.stringify(listed.data).includes(row.tokenHash));assert.equal((await call('apikeys','GET',undefined,1)).data.keys.length,0);
 const sdk=new ForgeStudioClient({baseUrl:api+'/api/v1',apiKey:secret});const result=await sdk.listWebsites();assert.ok(Array.isArray(result));
 assert.equal((await call('websites','POST',{name:'Must not create'},null,{authorization:'Bearer '+secret})).status,403);
 assert.equal((await call('apikeys','POST',{name:'No chaining',scopes:['websites:read']},null,{authorization:'Bearer '+secret})).status,401);
 assert.equal((await call('apikeys/'+key.id+'/revoke','POST',undefined,1)).status,404);assert.equal((await call('apikeys/no-id/revoke','POST')).status,400);
 assert.equal((await call('apikeys/'+key.id+'/revoke','POST')).status,200);const revokedAt=(await pool.query('SELECT "revokedAt" FROM developer_api_keys WHERE id=$1',[key.id])).rows[0].revokedAt;assert.equal((await call('apikeys/'+key.id+'/revoke','POST')).status,200);assert.equal(String((await pool.query('SELECT "revokedAt" FROM developer_api_keys WHERE id=$1',[key.id])).rows[0].revokedAt),String(revokedAt));
 assert.equal((await call('websites','GET',undefined,null,{authorization:'Bearer '+secret})).status,401);assert.equal((await call('apikeys')).data.keys[0].isRevoked,true);
 const full=await call('apikeys','POST',{name:'All scopes',scopes:['websites:read','websites:write','publish:write']});assert.equal(full.status,201);
 await pool.query('UPDATE users SET status=\'SUSPENDED\' WHERE id=$1',[ids[0]]);assert.equal((await call('websites','GET',undefined,null,{authorization:'Bearer '+full.data.rawSecret})).status,401);assert.equal((await call('apikeys')).status,403);
 const dl=await fetch(api+'/api/v1/apikeys/sdk',{headers:{cookie:'forge_session='+sessions[1]}});assert.equal(dl.status,200);assert.match(await dl.text(),/export class ForgeStudioClient/);assert.match(dl.headers.get('content-disposition'),/client.ts/);
 assert.equal(await snapshot(),before);assert.deepEqual(await websiteSnapshot(),websitesBefore);console.log('PASS: persistent key CRUD, validation, CSRF, secret hashing, account isolation, real SDK read, scope denial, revocation, suspended account and SDK download; existing keys preserved.');
}finally{await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);await pool.end();}

