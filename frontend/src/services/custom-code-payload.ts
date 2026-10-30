// Whitelist writable fields: editor modals may pass full persisted snippet objects.
const writable=new Set(['title','language','code','placement','scope','pageId','conditions','priority','status','scheduledFor','isActive']);
export function customCodePayload(input:object,editing=false){const value=input as Record<string,unknown>;const payload:Record<string,unknown>=Object.fromEntries(Object.entries(value).filter(([key,v])=>writable.has(key)&&v!==undefined));if(editing&&typeof value.updatedAt==='string')payload.expectedUpdatedAt=value.updatedAt;return payload;}
