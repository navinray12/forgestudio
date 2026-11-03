export type HelpArticle={slug:string;title:string;body:string;topicSlug:string;isFaq?:boolean};
export type HelpData={topics:{slug:string;title:string;description:string;articleCount:number}[];articles:HelpArticle[];faqs:HelpArticle[];total:number;page:number;pageSize:number;config:{chatUrl:string|null;videoUrl:string|null;supportHours:string|null}};
export type HelpTicket={id:string;ticketNumber:string;subject:string;description?:string;status:string;createdAt:string};
export type FeatureRequest={id:string;title:string;description:string;status:string;authorName:string|null;votes:number;voted:boolean};
export function helpQuery(search:string,topic:string,page:number,faq:boolean){return new URLSearchParams({search,topic,page:String(page),faq:String(faq)}).toString();}
export function helpDate(value:string){return new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});}
export function safeHelpLink(value:string|null){try{const u=new URL(value||'');return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export async function helpRequest<T>(path='',options:RequestInit={}):Promise<T>{const r=await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:5000'}/api/dashboard/help${path}`,{...options,credentials:'include',headers:{'Content-Type':'application/json',...options.headers}});const data=await r.json().catch(()=>null);if(!r.ok)throw Error(r.status===401?'Your session has expired. Please sign in again.':data?.error?.message||data?.message||'Unable to load help and support. Please try again.');return data;}
