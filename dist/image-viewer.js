'use strict';
let activeImageViewer=null;
function mountImageViewer(){
 if(activeImageViewer&&!activeImageViewer.holder.isConnected){activeImageViewer.observer?.disconnect();activeImageViewer=null}
 const holder=document.querySelector('.project-image');if(!holder||holder.dataset.imageViewer)return;
 const img=holder.querySelector('img');if(!img)return;
 holder.dataset.imageViewer='true';holder.classList.add('image-viewer');img.draggable=false;
 const path=workbench.file?.path||img.alt;
 const toolbar=document.createElement('div');toolbar.className='image-viewer-toolbar';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Visualização da imagem');
 toolbar.innerHTML='<button type="button" class="plain-button" data-image-view="fit" title="Ajustar à janela · Home">Ajustar</button><button type="button" class="plain-button" data-image-view="actual" title="Tamanho real · 0">100%</button><button type="button" class="icon-button" data-image-view="out" aria-label="Diminuir imagem" title="Diminuir · −">−</button><output class="image-viewer-scale" aria-label="Ampliação">…</output><button type="button" class="icon-button" data-image-view="in" aria-label="Aumentar imagem" title="Aumentar · +">+</button><span class="image-viewer-dimensions"></span>';
 const viewport=document.createElement('div');viewport.className='image-viewer-viewport';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Imagem. Arraste para mover; use mais, menos, zero ou Home para ampliar e ajustar.');
 const canvas=document.createElement('div');canvas.className='image-viewer-canvas';const stage=document.createElement('div');stage.className='image-viewer-stage';stage.append(img);canvas.append(stage);viewport.append(canvas);
 const footer=document.createElement('div');footer.className='image-viewer-footer';const name=document.createElement('span');name.textContent=path;name.title=path;const hint=document.createElement('span');hint.textContent='Arraste para mover · Ctrl + roda para ampliar';footer.append(name,hint);
 holder.replaceChildren(toolbar,viewport,footer);
 const view={holder,img,viewport,canvas,stage,scale:1,fit:true,width:0,height:0,failed:false,observer:null};activeImageViewer=view;
 const fitScale=()=>Math.max(.001,Math.min(1,(viewport.clientWidth-32)/view.width,(viewport.clientHeight-32)/view.height));
 function setScale(value,fit=false,anchor=null){
  if(!view.width||!view.height)return;
  const x=anchor?.x??viewport.clientWidth/2,y=anchor?.y??viewport.clientHeight/2;
  const oldLeft=(canvas.clientWidth-view.width*view.scale)/2,oldTop=(canvas.clientHeight-view.height*view.scale)/2;
  const point={x:(viewport.scrollLeft+x-oldLeft)/view.scale,y:(viewport.scrollTop+y-oldTop)/view.scale};
  view.scale=Math.max(Math.min(.05,fitScale()),Math.min(8,value));view.fit=fit;
  const width=view.width*view.scale,height=view.height*view.scale,cw=Math.max(viewport.clientWidth,width+32),ch=Math.max(viewport.clientHeight,height+32);
  stage.style.width=width+'px';stage.style.height=height+'px';canvas.style.width=cw+'px';canvas.style.height=ch+'px';
  viewport.scrollLeft=fit?(cw-viewport.clientWidth)/2:(cw-width)/2+point.x*view.scale-x;
  viewport.scrollTop=fit?(ch-viewport.clientHeight)/2:(ch-height)/2+point.y*view.scale-y;
  toolbar.querySelector('output').textContent=(view.scale*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
  toolbar.querySelector('[data-image-view="fit"]').setAttribute('aria-pressed',String(view.fit));
  toolbar.querySelector('[data-image-view="in"]').disabled=view.scale>=8;
  toolbar.querySelector('[data-image-view="out"]').disabled=view.scale<=Math.min(.05,fitScale());
 }
 function command(kind){if(kind==='fit')setScale(fitScale(),true);if(kind==='actual')setScale(1);if(kind==='in')setScale(view.scale*1.25);if(kind==='out')setScale(view.scale/1.25)}
 toolbar.onclick=e=>{const button=e.target.closest('[data-image-view]');if(button)command(button.dataset.imageView)};
 viewport.onkeydown=e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;const kind=({'Home':'fit','0':'actual','+':'in','=':'in','-':'out'})[e.key];if(kind){e.preventDefault();e.stopPropagation();command(kind)}};
 viewport.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const rect=viewport.getBoundingClientRect();setScale(view.scale*(e.deltaY<0?1.15:1/1.15),false,{x:e.clientX-rect.left,y:e.clientY-rect.top})},{passive:false});
 let drag=null;
 viewport.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();viewport.focus({preventScroll:true});viewport.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.classList.add('image-panning')};
 viewport.onpointermove=e=>{if(!drag)return;viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY};
 viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;viewport.classList.remove('image-panning')};
 viewport.ondblclick=()=>command(view.fit?'actual':'fit');
 const ready=()=>{view.width=img.naturalWidth;view.height=img.naturalHeight;if(!view.width)return;view.failed=false;toolbar.querySelector('.image-viewer-dimensions').textContent=`${view.width.toLocaleString('pt-BR')} × ${view.height.toLocaleString('pt-BR')} px`;toolbar.querySelectorAll('button').forEach(button=>button.disabled=false);setScale(fitScale(),true)};
 img.onload=ready;img.onerror=()=>{view.failed=true;toolbar.querySelectorAll('button').forEach(button=>button.disabled=true);toolbar.querySelector('output').textContent='—';hint.textContent='Não foi possível decodificar esta imagem.';hint.setAttribute('role','alert')};
 view.observer=new ResizeObserver(()=>{if(!holder.isConnected){view.observer.disconnect();return}if(view.width)setScale(view.fit?fitScale():view.scale,view.fit)});view.observer.observe(viewport);
 if(img.complete){if(img.naturalWidth)ready();else img.onerror()}
}
const imageViewerRenderMain=renderMain;renderMain=function(){imageViewerRenderMain();mountImageViewer()};
mountImageViewer();
