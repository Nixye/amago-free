'use strict';
// Session-only metadata. Existing DOM nodes carry their original owner through navigation.
const documentPositions=new Map();
const pendingDocumentPositions=new Map();
function clearPendingDocumentPosition(element){const record=pendingDocumentPositions.get(element);if(!record)return;element.style.overflowAnchor=record.anchor;pendingDocumentPositions.delete(element)}
function cancelPendingDocumentPositions(target){for(const element of pendingDocumentPositions.keys())if(!element.isConnected||element===target||element.contains(target))clearPendingDocumentPosition(element)}
function positionDocumentKey(doc,source){return source==='project'?'project:'+workbench.project?.root+':'+doc.path:'vault:'+doc.id}
function rememberDocumentPosition(element){
 const key=element.dataset.readingPosition;if(!key||!element.isConnected||pendingDocumentPositions.has(element))return;
 const record={top:element.scrollTop,left:element.scrollLeft};
 if(element.tagName==='TEXTAREA'){record.start=element.selectionStart;record.end=element.selectionEnd;record.direction=element.selectionDirection}
 documentPositions.delete(key);documentPositions.set(key,record);while(documentPositions.size>300)documentPositions.delete(documentPositions.keys().next().value);
}
function captureDocumentPositions(){document.querySelectorAll('[data-reading-position]').forEach(rememberDocumentPosition)}
function bindDocumentPosition(element,key){
 if(!element)return;element.dataset.readingPosition=key;
 const record=documentPositions.get(key);if(!record)return;
 if(element.querySelector('img,[data-linked-image]')){pendingDocumentPositions.set(element,{...record,key,anchor:element.style.overflowAnchor,settling:false});element.style.overflowAnchor='none'}
 if(element.tagName==='TEXTAREA'&&Number.isInteger(record.start)){const length=element.value.length;element.setSelectionRange(Math.min(length,record.start),Math.min(length,record.end),record.direction||'none')}
 element.scrollTop=record.top;element.scrollLeft=record.left;
}
function restoreDocumentPositions(){
 if(multiActive()){
  for(const [index,pane] of studio.panes.entries()){
   const doc=paneDocument(pane);if(!doc)continue;const key=positionDocumentKey(doc,pane.source);
   bindDocumentPosition(document.querySelector(`[data-pane-editor="${index}"]`),key+':source');
   bindDocumentPosition(document.querySelector(`[data-pane="${index}"] .pane-preview`),key+':read');
  }
  return;
 }
 const project=workbench.source==='project',doc=project?state.view==='project'&&workbench.file:state.view==='notes'&&!state.tag&&note();
 if(!doc||doc.kind==='image')return;
 const key=positionDocumentKey(doc,project?'project':'vault');
 bindDocumentPosition(document.querySelector(project?'#project-editor':'#editor'),key+':source');
 if(project){bindDocumentPosition(document.querySelector('#project-preview'),key+':read');bindDocumentPosition(document.querySelector('.project-editor-grid'),key+':grid:'+workbench.mode)}
 else bindDocumentPosition(document.querySelector('.note-main'),key+':view:'+state.mode);
}
const positionRenderMain=renderMain;renderMain=function(){captureDocumentPositions();positionRenderMain();restoreDocumentPositions()};
document.addEventListener('scroll',e=>{if(e.target instanceof HTMLElement)rememberDocumentPosition(e.target)},true);
document.addEventListener('select',e=>{if(e.target instanceof HTMLElement)rememberDocumentPosition(e.target)},true);
document.addEventListener('input',e=>{if(e.target instanceof HTMLElement&&e.target.matches('textarea'))rememberDocumentPosition(e.target)},true);
// Wait for local images before the final scroll assignment. Intentional navigation
// cancels it so a late decode never pulls the reader away from their next action.
const positionHydrateImages=hydrateLinkedImages;
hydrateLinkedImages=async function(){
 await positionHydrateImages();
 for(const [element,record] of pendingDocumentPositions){
  if(!element.isConnected){clearPendingDocumentPosition(element);continue}
  if(record.settling||element.querySelector('[data-linked-image]:not([data-image-requested])'))continue;
  record.settling=true;
  const promises=[...element.querySelectorAll('[data-linked-image]')].map(node=>projectImages.get(workbench.project?.root+'\0'+node.dataset.linkedImage)?.promise).filter(Boolean);
  Promise.allSettled(promises).then(async()=>{
   if(pendingDocumentPositions.get(element)!==record)return;
   await Promise.allSettled([...element.querySelectorAll('img')].map(img=>{if(!img.complete)img.loading='eager';return img.decode?.()}));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(!element.isConnected||pendingDocumentPositions.get(element)!==record)return;
   element.scrollTop=record.top;element.scrollLeft=record.left;clearPendingDocumentPosition(element);rememberDocumentPosition(element);
  });
 }
};
for(const event of ['wheel','pointerdown','touchstart','keydown','focusin'])window.addEventListener(event,e=>{if(e.target instanceof HTMLElement)cancelPendingDocumentPositions(e.target)},{capture:true,passive:event==='wheel'||event==='touchstart'});
window.addEventListener('amago-document-change',()=>{for(const element of pendingDocumentPositions.keys())clearPendingDocumentPosition(element)});
window.addEventListener('amago-position-intent',e=>{if(e.detail?.target instanceof HTMLElement)cancelPendingDocumentPositions(e.detail.target)});
restoreDocumentPositions();
