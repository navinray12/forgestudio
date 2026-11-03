import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}),api=process.env.EDITOR_TEST_API||'http://localhost:5001';
const owner=randomUUID(),client=randomUUID(),ownerToken=randomBytes(32).toString('hex'),clientToken=randomBytes(32).toString('hex');
async function request(route,method,token,body,status=200){const res=await fetch(api+route,{method,headers:{cookie:'forge_session='+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data;}
try{
 for(const[id,token]of[[owner,ownerToken],[client,clientToken]]){await pool.query('INSERT INTO users(id,"fullName",email,"emailVerified","updatedAt") VALUES($1,$2,$3,true,now())',[id,'Token permissions test',`token-permission-${id}@example.invalid`]);await pool.query('INSERT INTO sessions(id,"userId","tokenHash","expiresAt") VALUES($1,$2,$3,now()+interval \'10 minutes\')',[randomUUID(),id,createHash('sha256').update(token).digest('hex')]);}
 const site=(await request('/api/websites','POST',ownerToken,{name:'Token permissions test'},201)).website;
 const element={id:randomUUID(),type:'heading',headingLevel:'h1',content:'Owner heading',styles:{fontSize:'32px'}};
 const data={version:1,elements:[element],pages:[{id:'home',name:'Home',slug:'/',isHome:true,elements:[element]}],homePageId:'home',globalVariables:[{id:'primary',name:'Primary',token:'--primary',category:'color',value:'#123456'}],globalClasses:[],globalSettings:{studioDesignSystem:{theme:'dark',type:'stretch',width:'auto',margin:'24px',gutter:'16px'}}};
 await request(`/api/websites/${site.id}`,'PUT',ownerToken,{editorData:data});
 await pool.query('INSERT INTO website_collaborators(id,"websiteId","userId",permission,"updatedAt") VALUES($1,$2,$3,$4,now())',[randomUUID(),site.id,client,'CONTENT_EDITOR']);
 await request(`/api/websites/${site.id}/design-system`,'PUT',clientToken,{variables:[],classes:[]},403);
 await request(`/api/websites/${site.id}/design-system/import`,'POST',clientToken,{payload:{version:1,variables:[],classes:[]},mode:'merge'},403);
 await request(`/api/websites/${site.id}`,'PUT',clientToken,{editorData:{...data,globalVariables:[]}},403);
 await request(`/api/websites/${site.id}`,'PUT',clientToken,{editorData:{...data,globalSettings:{studioDesignSystem:{...data.globalSettings.studioDesignSystem,margin:'80px'}}}},403);
 const edited={...element,content:'Client content edit'};
 await request(`/api/websites/${site.id}`,'PUT',clientToken,{editorData:{...data,elements:[edited],pages:[{...data.pages[0],elements:[edited]}]}});
 const saved=(await request(`/api/websites/${site.id}`,'GET',ownerToken)).website.editorData;
 assert.equal(saved.elements[0].content,'Client content edit');assert.deepEqual(saved.globalVariables,data.globalVariables);
 await pool.query('UPDATE websites SET status=\'PUBLISHED\' WHERE id=$1 AND "userId"=$2',[site.id,owner]);
 const publicData=(await request(`/api/websites/public/${site.id}`,'GET',ownerToken)).website.editorData;
 assert.equal(publicData.globalVariables[0].token,'--primary');assert.equal('userId' in publicData,false);
 console.log('PASS: content-only token/class/import/settings writes denied; allowed content edits preserved; public design tokens included without account data.');
}finally{await pool.query('DELETE FROM websites WHERE "userId"=$1',[owner]);await pool.query('DELETE FROM users WHERE id IN ($1,$2)',[owner,client]);await pool.end();}
