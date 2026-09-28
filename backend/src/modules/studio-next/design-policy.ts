import { StudioError } from './validation.js';
const textKeys=new Set(['content','text','alt']);
/** Content-only changes preserve every node, style, position, page and component boundary. */
export function contentOnly(current:any,next:any,key=''):any {
  if(textKeys.has(key)&&typeof current==='string'&&typeof next==='string')return next;
  if(Array.isArray(current)){
    if(!Array.isArray(next)||current.length!==next.length)throw new StudioError('Content editors cannot change the document structure',403,'DESIGN_RESTRICTED');
    return current.map((v,i)=>contentOnly(v,next[i],String(i)));
  }
  if(current&&typeof current==='object'){
    if(!next||typeof next!=='object'||Array.isArray(next))throw new StudioError('Content editors cannot replace design objects',403,'DESIGN_RESTRICTED');
    if(Object.keys(next).some(k=>!(k in current)))throw new StudioError('Content editors cannot add design properties',403,'DESIGN_RESTRICTED');
    return Object.fromEntries(Object.entries(current).map(([k,v])=>[k,contentOnly(v,next[k]===undefined?v:next[k],k)]));
  }
  if(current!==next)throw new StudioError('Content editors may change text, not design settings',403,'DESIGN_RESTRICTED');
  return current;
}
