import {useEffect,useMemo,useState} from "react";
import type {EditorElement} from "../types";

interface CollectionField {key:string;name:string;type:string}
interface Collection {id:string;name:string;slug:string;fields:CollectionField[]}

export function CmsBindingInspector({websiteId,element,onChange}:{websiteId:string; element:EditorElement; onChange:(binding:EditorElement["cmsBinding"]|undefined)=>void}){
  const [collections,setCollections]=useState<Collection[]>([]),[error,setError]=useState("");
  useEffect(()=>{
    const c=new AbortController();setError("");
    fetch(`/api/v1/studio-next/sites/${websiteId}/collections`,{credentials:"include",signal:c.signal})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data?.error?.message||"Unable to load CMS collections");setCollections(data.collections||[]);})
      .catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:"Unable to load CMS collections");});
    return()=>c.abort();
  },[websiteId]);

  const binding=element.cmsBinding;
  const collection=collections.find(c=>c.id===binding?.collectionId);
  const targets=useMemo(()=>{
    if(element.type==="image")return ["src","alt"] as const;
    if(element.type==="button")return ["content","href"] as const;
    return ["content"] as const;
  },[element.type]);
  const compatible=(field:CollectionField,target:string)=>{
    if(target==="src")return ["IMAGE","URL"].includes(field.type);
    if(target==="href")return ["URL","TEXT","EMAIL"].includes(field.type);
    if(target==="alt")return field.type==="TEXT";
    return ["TEXT","RICH_TEXT","NUMBER","BOOLEAN","DATE","EMAIL","URL","COLOR","OPTION"].includes(field.type);
  };
  const fields=(collection?.fields||[]).filter(f=>compatible(f,binding?.target||targets[0]));

  return <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-3">
    <div className="flex items-center justify-between">
      <div><div className="text-[11px] font-bold uppercase tracking-wider text-violet-700">CMS Binding</div><div className="text-[10px] text-violet-500">Live CMS data resolves at published runtime.</div></div>
      {binding&&<button type="button" className="text-[11px] font-bold text-rose-600 hover:underline" onClick={()=>onChange(undefined)}>Clear</button>}
    </div>
    {error&&<div className="text-[11px] text-rose-600">{error}</div>}
    <label className="block text-[11px] font-semibold text-slate-600">Collection
      <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" value={binding?.collectionId||""}
        onChange={e=>{
          const selected=collections.find(c=>c.id===e.target.value);
          if(!selected){onChange(undefined);return;}
          const target=targets[0],field=selected.fields.find(f=>compatible(f,target));
          onChange(field?{collectionId:selected.id,field:field.key,target}:undefined);
        }}>
        <option value="">No CMS binding</option>
        {collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
    {binding&&collection&&<>
      <label className="block text-[11px] font-semibold text-slate-600">Element property
        <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" value={binding.target}
          onChange={e=>{
            const target=e.target.value as NonNullable<EditorElement["cmsBinding"]>["target"];
            const field=collection.fields.find(f=>compatible(f,target));
            if(field)onChange({...binding,target,field:field.key});
          }}>{targets.map(target=><option key={target} value={target}>{target}</option>)}</select>
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">CMS field
        <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" value={fields.some(f=>f.key===binding.field)?binding.field:""}
          onChange={e=>onChange({...binding,field:e.target.value})}>
          {fields.map(field=><option key={field.key} value={field.key}>{field.name} · {field.type}</option>)}
        </select>
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">Specific item slug <span className="font-normal text-slate-400">(optional)</span>
        <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" value={binding.itemSlug||""} pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="latest published item when empty" onChange={e=>onChange({...binding,itemSlug:e.target.value||undefined})}/>
      </label>
    </>}
  </div>;
}
