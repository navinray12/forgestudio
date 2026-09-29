import test from 'node:test';
import assert from 'node:assert/strict';
import {S3CompatiblePublishingProvider,type ObjectTransport} from '../../src/modules/studio-next/cloud-publishing.js';

test('S3-compatible publishing uploads compiled files and verifies the activation manifest',async()=>{
  const objects=new Map<string,string|Buffer>(),requests:Array<{url:string;method:string;authorization:string}>=[];
  const transport:ObjectTransport=async(url,init)=>{
    const method=String(init.method||'GET'),headers=new Headers(init.headers),path=new URL(url).pathname;
    requests.push({url,method,authorization:headers.get('authorization')||''});
    if(method==='PUT'){
      const body=init.body as any;objects.set(path,Buffer.isBuffer(body)?body:typeof body==='string'?body:Buffer.from(body));
      return {status:200,headers:new Headers(),async text(){return '';}};
    }
    if(method==='GET'){
      const body=objects.get(path);return {status:body===undefined?404:200,headers:new Headers(),async text(){return body===undefined?'':Buffer.isBuffer(body)?body.toString('utf8'):body;}};
    }
    return {status:405,headers:new Headers(),async text(){return '';}};
  };
  const provider=new S3CompatiblePublishingProvider({name:'aws-s3',endpoint:'https://bucket.s3.us-east-1.amazonaws.com',region:'us-east-1',accessKeyId:'AKIATEST',secretAccessKey:'fixture-secret',publicBaseUrl:'https://cdn.example.test'},transport);
  const artifact:any={version:1,pages:[{id:'home',name:'Home',slug:'/',isHome:true,elements:[{id:'title',type:'heading',content:'Hello'}]}],homePageId:'home',publishing:{releaseId:'11111111-1111-4111-8111-111111111111',preparedAt:new Date(0).toISOString(),provider:'aws-s3'}};
  const checksum='a'.repeat(64),deployment=await provider.deploy({siteId:'22222222-2222-4222-8222-222222222222',releaseId:'11111111-1111-4111-8111-111111111111',artifact,checksum});
  assert.equal(deployment.reference,'https://cdn.example.test/');
  assert.ok([...objects.keys()].some(x=>x.endsWith('/releases/11111111-1111-4111-8111-111111111111/index.html')));
  assert.ok([...objects.keys()].some(x=>x.endsWith('/index.html')));
  assert.ok([...objects.keys()].some(x=>x.endsWith('/_forgestudio-release.json')));
  assert.ok(requests.every(x=>x.authorization.startsWith('AWS4-HMAC-SHA256 Credential=AKIATEST/')));
  assert.deepEqual(await provider.status({siteId:'22222222-2222-4222-8222-222222222222',releaseId:'11111111-1111-4111-8111-111111111111',reference:deployment.reference,checksum}),{healthy:true,checksum});
  objects.set('/_forgestudio-release.json',JSON.stringify({releaseId:'wrong',siteId:'22222222-2222-4222-8222-222222222222',artifactChecksum:checksum}));
  assert.equal((await provider.status({siteId:'22222222-2222-4222-8222-222222222222',releaseId:'11111111-1111-4111-8111-111111111111',reference:deployment.reference,checksum})).healthy,false);
});

test('S3-compatible publishing requires HTTPS endpoints',()=>{
  assert.throws(()=>new S3CompatiblePublishingProvider({name:'cloudflare-r2',endpoint:'http://127.0.0.1:9000',region:'auto',bucketPath:'bucket',accessKeyId:'key',secretAccessKey:'secret',publicBaseUrl:'https://site.example.test'}),/HTTPS/);
});
