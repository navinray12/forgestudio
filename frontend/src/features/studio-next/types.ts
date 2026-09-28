export interface Field { key:string;name:string;type:string;required:boolean;options?:string[];referenceCollection?:string }
export interface Collection {id:string;name:string;slug:string;fields:Field[];revision:number;itemCount:number}
export interface Locale {code:string;name:string;enabled:boolean}
export interface Item {id:string;collectionId:string;groupId:string;locale:string;name:string;slug:string;fields:Record<string,any>;revision:number;liveRevision:number|null;isLive:boolean;archived:boolean;ready:boolean;scheduledAt:string|null;publishedAt:string|null}
export interface Site {id:string;name:string;status:string;capabilities:string[]}
export interface PanelProps {site:Site;refresh:number;reload:()=>void;locales:Locale[];collections:Collection[]}
