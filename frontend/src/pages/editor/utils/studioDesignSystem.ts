import type { DesignVariable } from '../components/VariablesManagerModal';
import type { EditorElement } from '../types';

export interface StudioDesignSettings {theme:'light'|'dark';type:'stretch'|'boxed';width:string;margin:string;gutter:string}
export const defaultStudioDesign:StudioDesignSettings={theme:'dark',type:'stretch',width:'auto',margin:'24px',gutter:'16px'};
export function normalizeStudioDesign(input:StudioDesignSettings):StudioDesignSettings {
  const design={...defaultStudioDesign,...input};
  if(!['light','dark'].includes(design.theme)||!['stretch','boxed'].includes(design.type))throw Error('Choose a supported theme and layout type.');
  if(!/^(auto|\d+(?:\.\d+)?(?:px|rem|em|%|vw)?)$/i.test(design.width)||!/^\d+(?:\.\d+)?(?:px)?$/i.test(design.margin)||!/^\d+(?:\.\d+)?(?:px)?$/i.test(design.gutter))throw Error('Use a valid CSS width and pixel values for margin and gutter.');
  const pixels=(value:string)=>/^\d+(?:\.\d+)?$/.test(value)?value+'px':value.toLowerCase();
  return {...design,width:pixels(design.width),margin:pixels(design.margin),gutter:pixels(design.gutter)};
}
const shades=['#f3e8ff','#e9d5ff','#d8b4fe','#c084fc','#a855f7','#9333ea','#7e22ce','#6b21a8','#581c87','#3b0764'];
export const typeScale=[['H1','h1','56','1.2'],['H2','h2','40','1.2'],['H3','h3','32','1.2'],['H4','h4','24','1.2'],['Body','body','16','28px'],['Caption','caption','12','20px']] as const;
export const spacingScale=[4,8,12,16,24,32,48,64];
const variable=(name:string,category:DesignVariable['category'],token:string,value:string):DesignVariable=>({id:token,name,category,token,value});
export function studioVariables(existing:DesignVariable[]=[]):DesignVariable[] {
  const defaults=[...shades.map((color,index)=>variable(`Primary ${index===0?50:index*100}`,'color',`--studio-primary-${index===0?50:index*100}`,color)),
    ...[['Success','#10b981'],['Warning','#f59e0b'],['Error','#ef4444'],['Info','#0ea5e9']].map(([name,color])=>variable(name,'color',`--studio-${name.toLowerCase()}`,color)),
    variable('Font family','typography','--studio-font-family','Plus Jakarta Sans'),
    ...typeScale.flatMap(([label,key,size,line])=>[variable(`${label} size`,'typography',`--studio-type-${key}`,`${size}px`),variable(`${label} line height`,'typography',`--studio-line-${key}`,line)]),
    ...spacingScale.map(size=>variable(`Space ${size}`,'spacing',`--studio-space-${size}`,`${size}px`)),
    variable('Soft shadow','shadow','--studio-shadow-soft','0 4px 16px #0000001a'),variable('Raised shadow','shadow','--studio-shadow-raised','0 12px 32px #00000033'),variable('Glow shadow','shadow','--studio-shadow-glow','0 8px 32px #9333ea55')];
  const map=new Map(defaults.map(item=>[item.token,item]));
  for(const item of existing) if(item?.token)map.set(item.token,item);
  return Array.from(map.values());
}
export function tokenValue(variables:DesignVariable[],token:string,theme='light'):string {const item=variables.find(v=>v.token===token);return item?.modes?.[theme]||item?.value||'';}
export function normalizeStudioVariables(input:unknown):DesignVariable[] {
  if(!Array.isArray(input)||input.length>512)throw Error('Choose a token JSON file containing at most 512 variables.');
  const names=new Set<string>();
  return input.map((item:DesignVariable)=>{
    if(!item||!/^--[a-zA-Z0-9_-]+$/.test(item.token)||typeof item.value!=='string'||/[{};<>]/.test(item.value)||names.has(item.token))throw Error('Tokens need unique CSS variable names and valid values.');
    if(!['color','typography','spacing','shadow','radius','custom'].includes(item.category))throw Error('Unsupported token category.');
    if(item.modes&&Object.values(item.modes).some(value=>typeof value!=='string'||/[{};<>]/.test(value)))throw Error('Invalid token theme value.');
    names.add(item.token);return {...item,id:item.id||item.token,name:item.name||item.token};
  });
}
export function studioTokenCss(variables:DesignVariable[],scope='.studio-page',theme='light'):string {
  return `${scope}{${variables.filter(v=>/^--[a-zA-Z0-9_-]+$/.test(v.token)).map(v=>`${v.token}:${String(tokenValue(variables,v.token,theme)).replace(/[{};<>]/g,'')}`).join(';')}}`;
}
export function studioClassCss(classes:Array<{className:string;styles:Record<string,string|number>;pseudoStyles?:Record<string,Record<string,string|number>>}>):string {
  const declarations=(styles:Record<string,string|number>)=>Object.entries(styles||{}).filter(([key])=>/^[a-zA-Z][a-zA-Z0-9-]*$/.test(key)).map(([key,value])=>`${key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())}:${String(value).replace(/[{};<>]/g,'')}`).join(';');
  return classes.filter(item=>/^[a-zA-Z_][\w-]*$/.test(item.className)).map(item=>`.studio-page .${item.className}{${declarations(item.styles)}}`+Object.entries(item.pseudoStyles||{}).filter(([state])=>['hover','focus','active'].includes(state)).map(([state,styles])=>`.studio-page .${item.className}:${state}{${declarations(styles)}}`).join('')).join('');
}
export function applyStudioDesign(elements:EditorElement[],variables:DesignVariable[],settings:StudioDesignSettings,root=true):EditorElement[] {
  const family=tokenValue(variables,'--studio-font-family',settings.theme)||'Plus Jakarta Sans';
  return elements.map(element=>{
    const styles={...element.styles};
    if(element.type==='heading'){
      const key=['h1','h2','h3','h4'].includes(element.headingLevel||'')?element.headingLevel!:'h2';
      Object.assign(styles,{fontFamily:family,fontSize:`var(--studio-type-${key})`,lineHeight:`var(--studio-line-${key})`});
    }else if(element.type==='text'||element.type==='paragraph')Object.assign(styles,{fontFamily:family,fontSize:'var(--studio-type-body)',lineHeight:'var(--studio-line-body)'});
    else if(element.type==='button')Object.assign(styles,{fontFamily:family,backgroundColor:'var(--studio-primary-500)'});
    if(root&&element.type==='container')Object.assign(styles,{marginLeft:settings.margin,marginRight:settings.margin,width:`calc(100% - ${settings.margin} - ${settings.margin})`,maxWidth:settings.type==='boxed'?(settings.width==='auto'?'1200px':settings.width):'100%'});
    return {...element,styles,...(element.type==='container'?{layout:{...element.layout,gap:parseFloat(settings.gutter)||0}}:{}),...(element.children?{children:applyStudioDesign(element.children,variables,settings,false)}:{})};
  });
}
