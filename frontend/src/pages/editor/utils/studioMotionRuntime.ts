/** Runtime for the Animation tab's text, press, loop, drag and overlay controls.
 * Uses individual transform properties so scroll/hover transforms can compose.
 */
export function initStudioMotion(root:HTMLElement|Document,reducedMotion:boolean):()=>void {
  const cleanup:Array<()=>void>=[];
  const animations:Animation[]=[];
  const number=(raw:string|null,fallback:number,min:number,max:number)=>{const value=Number(raw);return raw!==null&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;};
  const animate=(el:HTMLElement,frames:Keyframe[],options:KeyframeAnimationOptions)=>{const animation=el.animate(frames,options);animations.push(animation);return animation;};
  root.querySelectorAll<HTMLElement>('[data-studio-overlay]').forEach(el=>{
    const position=el.style.position;
    if(getComputedStyle(el).position==='static')el.style.position='relative';
    const overlay=document.createElement('span');overlay.setAttribute('aria-hidden','true');overlay.dataset.studioOverlayLayer='true';
    Object.assign(overlay.style,{position:'absolute',inset:'0',borderRadius:'inherit',pointerEvents:'none',backgroundColor:el.dataset.studioOverlay||'#9b45e8',opacity:String(number(el.getAttribute('data-studio-overlay-opacity'),.2,0,1)),zIndex:'2'});
    el.appendChild(overlay);cleanup.push(()=>{overlay.remove();el.style.position=position;});
  });
  if(!reducedMotion){
    root.querySelectorAll<HTMLElement>('[data-studio-text]').forEach(el=>{
      const target=el.matches('h1,h2,h3,h4,h5,h6,p')?el:el.querySelector<HTMLElement>('h1,h2,h3,h4,h5,h6,p')||el;
      const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){animate(target,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)'}],{duration:number(el.getAttribute('data-studio-text'),900,50,10000),easing:`steps(${Math.max(1,Math.min(100,target.textContent?.length||20))},end)`});observer.disconnect();}},{threshold:.1});observer.observe(target);cleanup.push(()=>observer.disconnect());
    });
    root.querySelectorAll<HTMLElement>('[data-studio-loop]').forEach(el=>{
      const variant=el.getAttribute('data-studio-loop');
      const frames:Keyframe[]=variant==='spin'?[{rotate:'0deg'},{rotate:'360deg'}]:variant==='pulse'?[{scale:'1'},{scale:'1.04'},{scale:'1'}]:[{translate:'0 0'},{translate:'0 -12px'},{translate:'0 0'}];
      animate(el,frames,{duration:number(el.getAttribute('data-studio-loop-duration'),1800,100,20000),iterations:Infinity,easing:variant==='spin'?'linear':'ease-in-out',composite:'add'});
    });
    root.querySelectorAll<HTMLElement>('[data-studio-press]').forEach(el=>{
      let current:Animation|undefined,pressed=false;
      const scale=number(el.getAttribute('data-studio-press'),.95,.1,2),duration=number(el.getAttribute('data-studio-press-duration'),150,50,2000);
      const start=()=>{pressed=true;current?.cancel();current=animate(el,[{scale:'1'},{scale:String(scale)}],{duration,fill:'forwards',easing:'ease-out'});};
      const end=()=>{if(!pressed)return;pressed=false;current?.cancel();current=animate(el,[{scale:String(scale)},{scale:'1'}],{duration,easing:'ease-out'});};
      const down=(e:KeyboardEvent)=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){if(e.key===' '&&e.target===el)e.preventDefault();start();}};
      const up=(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' ')end();};
      const tabindex=el.getAttribute('tabindex');if(tabindex===null)el.tabIndex=0;
      el.addEventListener('pointerdown',start);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('pointerleave',end);el.addEventListener('keydown',down);el.addEventListener('keyup',up);
      cleanup.push(()=>{el.removeEventListener('pointerdown',start);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);el.removeEventListener('pointerleave',end);el.removeEventListener('keydown',down);el.removeEventListener('keyup',up);if(tabindex===null)el.removeAttribute('tabindex');});
    });
  }
  root.querySelectorAll<HTMLElement>('[data-studio-drag]').forEach(el=>{
    const axis=el.getAttribute('data-studio-drag'),previous={translate:el.style.translate,touchAction:el.style.touchAction,cursor:el.style.cursor,tabindex:el.getAttribute('tabindex')};
    let x=0,y=0,startX=0,startY=0,originX=0,originY=0,pointer:number|null=null;
    const apply=()=>{el.style.translate=`${Math.max(-2000,Math.min(2000,x))}px ${Math.max(-2000,Math.min(2000,y))}px`;};
    const down=(e:PointerEvent)=>{if(e.button!==0||(e.target as HTMLElement).closest('a,button,input,select,textarea'))return;pointer=e.pointerId;startX=e.clientX;startY=e.clientY;originX=x;originY=y;el.setPointerCapture(e.pointerId);e.preventDefault();};
    const move=(e:PointerEvent)=>{if(pointer!==e.pointerId)return;if(axis!=='y')x=originX+e.clientX-startX;if(axis!=='x')y=originY+e.clientY-startY;apply();};
    const end=(e:PointerEvent)=>{if(pointer===e.pointerId){if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);pointer=null;}};
    const key=(e:KeyboardEvent)=>{if(e.target!==el)return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){x=0;y=0;}if(axis!=='y'){if(e.key==='ArrowLeft')x-=10;if(e.key==='ArrowRight')x+=10;}if(axis!=='x'){if(e.key==='ArrowUp')y-=10;if(e.key==='ArrowDown')y+=10;}apply();};
    el.style.touchAction='none';el.style.cursor='grab';if(previous.tabindex===null)el.tabIndex=0;
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('keydown',key);
    cleanup.push(()=>{if(pointer!==null&&el.hasPointerCapture(pointer))el.releasePointerCapture(pointer);el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);el.removeEventListener('keydown',key);Object.assign(el.style,{translate:previous.translate,touchAction:previous.touchAction,cursor:previous.cursor});if(previous.tabindex===null)el.removeAttribute('tabindex');});
  });
  return()=>{animations.forEach(animation=>animation.cancel());cleanup.reverse().forEach(fn=>fn());};
}
