import 'dotenv/config';
import pg from 'pg';
import { Database } from './database.js';
import { Cms } from './cms.js';
import { deliverInvitations } from './workspaces.js';
import { Analytics } from './analytics.js';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3});
const db=new Database(pool),cms=new Cms(db),analytics=new Analytics(db,process.env.STUDIO_ANALYTICS_SECRET);
let busy=false,stopping=false;
async function tick(){
  if(busy||stopping)return;busy=true;
  try{
    const result=await cms.publishDue();
    let delivered=0;for(let i=0;i<20;i++){const n=await deliverInvitations(db);if(!n)break;delivered+=n;}
    await analytics.retain();console.log('Studio worker iteration',{...result,delivered});
  }catch(e){console.error('Studio worker iteration failed',{code:(e as any)?.code||'UNAVAILABLE'});}finally{busy=false;}
}
const timer=setInterval(()=>{void tick();},60000);void tick();
async function shutdown(){if(stopping)return;stopping=true;clearInterval(timer);while(busy)await new Promise(r=>setTimeout(r,100));await pool.end();}
process.once('SIGTERM',()=>{void shutdown();});process.once('SIGINT',()=>{void shutdown();});
