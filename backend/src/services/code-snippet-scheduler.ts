// Compare-and-set prevents an outdated worker read from overwriting a cancelled or edited schedule.
export async function publishDueCodeSnippets(db:any,now=new Date()){
 const due=await db.customCodeSnippet.findMany({where:{status:'SCHEDULED',isActive:true,scheduledFor:{lte:now}}});let published=0;
 for(const snippet of due){const result=await db.customCodeSnippet.updateMany({where:{id:snippet.id,status:'SCHEDULED',isActive:true,scheduledFor:{lte:now},updatedAt:snippet.updatedAt},data:{status:'PUBLISHED',isDraft:false,isEnabled:true}});published+=result.count;}return published;
}
