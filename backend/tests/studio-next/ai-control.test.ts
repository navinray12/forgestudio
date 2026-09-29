import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import {testPool,install,url} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import {DatabaseRoutedProvider,resolveAIRoute} from '../../src/modules/studio-next/ai-control.js';
import type {AIProvider} from '../../src/modules/studio-next/ai.js';

if(!url)test('AI control-plane integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,db:Database;
  before(async()=>{pool=testPool();await install(pool);db=new Database(pool);delete process.env.AI_PROVIDER_COPY;delete process.env.AI_MODEL_COPY;});
  after(async()=>{await pool.query("DELETE FROM studio.ai_model_routes WHERE feature IN ('COPY','EDITOR')");await pool.end();});

  test('database route overrides environment and can be disabled',async()=>{
    process.env.AI_PROVIDER_COPY='openai';process.env.AI_MODEL_COPY='env-copy';
    await pool.query(`INSERT INTO studio.ai_model_routes(feature,provider,model,fallback_models,timeout_ms,max_output_tokens,enabled)
      VALUES('COPY','anthropic','db-copy','[]'::jsonb,25000,1500,true)
      ON CONFLICT(feature) DO UPDATE SET provider='anthropic',model='db-copy',fallback_models='[]'::jsonb,timeout_ms=25000,max_output_tokens=1500,enabled=true`);
    const route=await resolveAIRoute(db,'COPY');assert.equal(route?.source,'DATABASE');assert.equal(route?.provider,'anthropic');assert.equal(route?.model,'db-copy');assert.equal(route?.timeoutMs,25000);
    await pool.query("UPDATE studio.ai_model_routes SET enabled=false WHERE feature='COPY'");assert.equal(await resolveAIRoute(db,'COPY'),null);
  });

  test('routed provider fails over only after a transient provider failure',async()=>{
    await pool.query(`INSERT INTO studio.ai_model_routes(feature,provider,model,fallback_models,timeout_ms,max_output_tokens,enabled)
      VALUES('EDITOR','openai','primary',$1::jsonb,10000,1000,true)
      ON CONFLICT(feature) DO UPDATE SET provider='openai',model='primary',fallback_models=$1::jsonb,timeout_ms=10000,max_output_tokens=1000,enabled=true`,[JSON.stringify(['anthropic:backup'])]);
    const calls:string[]=[];
    const create=(provider:string,model:string):AIProvider=>({name:provider,model,async generateStructured(){
      calls.push(`${provider}:${model}`);
      if(model==='primary'){const error:any=new Error('temporary');error.code='AI_PROVIDER_ERROR';throw error;}
      return {value:{ok:true}};
    }});
    const routed=new DatabaseRoutedProvider(db,'EDITOR',create);
    const result=await routed.generateStructured({system:'x',user:'y',timeoutMs:30000,maxOutputTokens:5000});
    assert.deepEqual(calls,['openai:primary','anthropic:backup']);assert.equal(result.provider,'anthropic');assert.equal(result.modelResolved,'backup');
  });
}
