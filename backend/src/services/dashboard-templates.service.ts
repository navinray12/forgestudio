import { AppError } from '../utils/app-error.js';
export function createDashboardTemplatesService(db: any) {
  async function active(tx: any,userId: string){const user=await tx.user.findUnique({where:{id:userId},select:{status:true}});if(!user||user.status!=='ACTIVE')throw new AppError('Your account cannot access templates',403,'ACCOUNT_INACTIVE');}
  async function catalog(tx: any,id: string){const[row]=await tx.$queryRaw`SELECT id,name,description,category,"templateData" FROM dashboard_template_catalog WHERE id=${id}::uuid AND "isActive" FOR SHARE`;if(!row)throw new AppError('Template not found',404,'TEMPLATE_NOT_FOUND');return row;}
  async function list(userId: string,input: {search:string;category:string;styles:string[];features:string[];industry:string;sort:string;scope:string;page:number}){
    await active(db,userId);
    return db.$transaction(async(tx: any)=>{
      const catalogRows=await tx.$queryRaw`SELECT c.id,c.name,c.description,c.category,c.industry,c.styles,c.features,c."templateData",c."createdAt",c."displayOrder",EXISTS(SELECT 1 FROM dashboard_template_favorites f WHERE f."userId"=${userId}::uuid AND f."templateId"=c.id) AS "isFavorite",(SELECT COUNT(*)::int FROM dashboard_template_favorites f WHERE f."templateId"=c.id) AS popularity FROM dashboard_template_catalog c WHERE c."isActive" ORDER BY c."displayOrder",c.id`;
      const saved=await tx.$queryRaw`SELECT id,name,description,category,"templateData","createdAt","isFavorite",type FROM templates WHERE "userId"=${userId}::uuid ORDER BY "createdAt" DESC,id`;
      const all=[...catalogRows.map((r:any)=>({...r,source:'catalog',type:'PAGE'})),...saved.map((r:any)=>({...r,source:'saved',industry:r.category,styles:[],features:[],popularity:0}))];
      const facets={categories:[...new Set(all.map((r:any)=>r.category))],industries:[...new Set(all.map((r:any)=>r.industry))].sort()};
      const terms=input.search.toLowerCase();let rows=all.filter((r:any)=>(input.scope==='saved'?r.source==='saved':input.scope==='favorites'?r.isFavorite:r.source==='catalog')&&(!terms||`${r.name} ${r.description||''} ${r.category} ${r.industry}`.toLowerCase().includes(terms))&&(!input.category||r.category.toLowerCase()===input.category.toLowerCase())&&(!input.industry||r.industry===input.industry)&&input.styles.every(s=>r.styles.includes(s))&&input.features.every(f=>r.features.includes(f)));
      rows.sort((a:any,b:any)=>input.sort==='name'?a.name.localeCompare(b.name):input.sort==='newest'?+new Date(b.createdAt)-+new Date(a.createdAt)||a.id.localeCompare(b.id):b.popularity-a.popularity||(a.displayOrder??999)-(b.displayOrder??999)||a.id.localeCompare(b.id));
      const total=rows.length;rows=rows.slice((input.page-1)*12,input.page*12);
      return {templates:rows.map(({displayOrder,popularity,...row}:any)=>row),total,page:input.page,pageSize:12,facets,catalogCount:catalogRows.length,savedCount:saved.length};
    },{isolationLevel:'RepeatableRead'});
  }
  async function favorite(userId:string,source:string,id:string,value:boolean){return db.$transaction(async(tx:any)=>{await active(tx,userId);if(source==='catalog'){await catalog(tx,id);if(value)await tx.$executeRaw`INSERT INTO dashboard_template_favorites("userId","templateId") VALUES(${userId}::uuid,${id}::uuid) ON CONFLICT DO NOTHING`;else await tx.$executeRaw`DELETE FROM dashboard_template_favorites WHERE "userId"=${userId}::uuid AND "templateId"=${id}::uuid`;}else{const count=await tx.$executeRaw`UPDATE templates SET "isFavorite"=${value},"updatedAt"=now() WHERE id=${id}::uuid AND "userId"=${userId}::uuid`;if(!count)throw new AppError('Template not found',404,'TEMPLATE_NOT_FOUND');}return {id,isFavorite:value};});}
  async function use(userId:string,id:string,targetId:string){return db.$transaction(async(tx:any)=>{await active(tx,userId);const row=await catalog(tx,id);
    // Insert an independent editor-library copy. Existing websites and template source data are never overwritten.
    await tx.$executeRaw`INSERT INTO templates(id,"userId",name,description,type,category,"templateData") VALUES(${targetId}::uuid,${userId}::uuid,${row.name},${row.description},'PAGE',${row.category},${JSON.stringify(row.templateData)}::jsonb) ON CONFLICT(id) DO NOTHING`;
    const[copy]=await tx.$queryRaw`SELECT id,"userId",name,"templateData" FROM templates WHERE id=${targetId}::uuid`;
    if(!copy||copy.userId!==userId||copy.name!==row.name||JSON.stringify(copy.templateData)!==JSON.stringify(row.templateData))throw new AppError('This request was already used. Try again with a new request.',409,'TEMPLATE_REQUEST_CONFLICT');return{id:copy.id};});}
  return {list,favorite,use};
}
