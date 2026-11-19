'use strict';

function documentTagChips(doc){
 return AmagoSearch.documentData(doc).tags.map(tag=>'<button class="tag-chip" data-document-query="#'+esc(tag)+'" title="#'+esc(tag)+'"><span>#'+esc(tag)+'</span></button>').join('');
}

// Older personal notes mirrored frontmatter tags in a second field. Keep independent legacy tags.
const reconciledNotes=new WeakSet();
function reconcileLegacyTags(doc){
 if(reconciledNotes.has(doc))return;
 const yaml=new Set(AmagoSearch.metadata(doc.body).propertyTags.map(AmagoSearch.normalize));
 doc.tags=(doc.tags||[]).filter(tag=>!yaml.has(AmagoSearch.normalize(tag)));
 reconciledNotes.add(doc);
}
const topButton=document.createElement('button');
topButton.id='document-scroll-top';topButton.type='button';topButton.hidden=true;
topButton.className='plain-button';topButton.innerHTML=icon('arrow')+'<span>Voltar ao início</span>';
document.body.append(topButton);
const documentScroller='.note-main,#editor,#project-editor,.project-preview,.project-editor-grid,.pane-preview,[data-pane-editor]';
let scrolledDocument=null;
function updateReturnToTop(scroller){
 const visible=scroller?.isConnected&&scroller.scrollTop>Math.max(320,scroller.clientHeight*.75);
 topButton.hidden=!visible;
 scrolledDocument=visible?scroller:null;
 if(!visible)return;
 const rect=scroller.getBoundingClientRect();
 topButton.style.right=Math.max(10,innerWidth-rect.right+14)+'px';
 topButton.style.bottom=Math.max(10,innerHeight-rect.bottom+14)+'px';
}
document.addEventListener('scroll',event=>{
 if(event.target.matches?.(documentScroller))updateReturnToTop(event.target);
},true);
window.addEventListener('resize',()=>updateReturnToTop(scrolledDocument));
topButton.onclick=()=>{
 if(!scrolledDocument?.isConnected)return;
 const owner=scrolledDocument;
 window.dispatchEvent(new CustomEvent('amago-position-intent',{detail:{target:owner}}));
 owner.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 if(owner.tagName==='TEXTAREA')owner.focus({preventScroll:true});
};
const libraryRender=renderMain;
renderMain=function(){
 if(workbench.source==='vault')for(const doc of vault.notes)reconcileLegacyTags(doc);
 libraryRender();updateReturnToTop(scrolledDocument);
};
function workspaceTagNames(){
 const names=new Map();
 for(const doc of discoveryDocs())for(const tag of AmagoSearch.documentData(doc).tags)names.set(AmagoSearch.normalize(tag),tag);
 return [...names.values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function suggestTags(field){
 let list=document.getElementById('workspace-tag-options');
 if(!list){list=document.createElement('datalist');list.id='workspace-tag-options';document.body.append(list)}
 const hybrid=['hybrid-query','graph-query','side-query'].includes(field.id);
 const match=hybrid&&field.value.match(/^(.*?)(#|tags?:)([^\s]*)$/i);
 if(hybrid&&!match){field.removeAttribute('list');return}
 const term=AmagoSearch.normalize(match?match[3]:field.value);
 list.replaceChildren(...workspaceTagNames().filter(tag=>AmagoSearch.normalize(tag).includes(term)).slice(0,30).map(tag=>new Option(match?match[1]+match[2]+tag:tag)));
 field.setAttribute('list',list.id);
}
for(const event of ['focusin','input'])document.addEventListener(event,e=>{
 if(e.target.matches('#hybrid-query,#graph-query,#side-query,#collection-tag-query,input[name="tag"]'))suggestTags(e.target);
});
function metadataDocumentHeading(doc){
 const path=doc.path||doc.folder||'',name=doc.title||doc.name||path;
 const detail=doc.path?doc.path.split('/').slice(0,-1).join('/'):path;
 return '<div class="metadata-document"><span class="metadata-file-icon">'+icon('note')+'</span><div><strong>'+esc(name)+'</strong>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div></div>';
}
function editableTagValues(doc){
 return [...new Map([...(doc.tags||[]),...AmagoSearch.metadata(doc.body).propertyTags].map(tag=>[AmagoSearch.normalize(tag),tag])).values()];
}
function tagPickerFields(){
 return '<div class="metadata-tag-picker"><div class="metadata-token-list" id="editable-tags"></div><label class="metadata-label" for="add-document-tag">Adicionar etiqueta</label><div class="tag-composer"><div class="tag-input-wrap"><span aria-hidden="true">#</span><input class="field" id="add-document-tag" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="document-tag-options" aria-expanded="false" placeholder="Digite ou escolha"><button type="button" class="tag-show-options" aria-controls="document-tag-options" aria-expanded="false" aria-label="Mostrar etiquetas existentes" title="Mostrar etiquetas existentes">'+icon('chevron')+'</button></div><button type="button" class="plain-button" data-tag-add>Adicionar</button></div><div role="listbox" aria-label="Etiquetas sugeridas" id="document-tag-options" hidden></div><small class="tag-feedback" role="status"></small></div>';
}
function bindTagPicker(form,initial){
 const field=form.querySelector('#add-document-tag'),list=form.querySelector('#document-tag-options'),chips=form.querySelector('#editable-tags');
 const toggle=form.querySelector('.tag-show-options');
 const feedback=form.querySelector('.tag-feedback'),tags=new Map(initial.map(tag=>[AmagoSearch.normalize(tag),tag])),catalog=workspaceTagNames();
 let suggestions=[],active=-1;
 function drawChips(){
  chips.innerHTML=[...tags.values()].map(tag=>'<button type="button" class="metadata-token" data-remove-tag="'+esc(tag)+'" title="Remover #'+esc(tag)+'" aria-label="Remover etiqueta '+esc(tag)+'"><span>#'+esc(tag)+'</span>'+icon('close')+'</button>').join('');
 }
 function close(){list.hidden=true;toggle.setAttribute('aria-expanded','false');field.setAttribute('aria-expanded','false');field.removeAttribute('aria-activedescendant');active=-1}
 function choose(index){
  active=index;[...list.children].forEach((el,i)=>el.setAttribute('aria-selected',String(i===active)));
  if(index>=0){field.setAttribute('aria-activedescendant',list.children[index].id);list.children[index].scrollIntoView({block:'nearest'})}else field.removeAttribute('aria-activedescendant');
 }
 function suggest(){
  const term=AmagoSearch.normalize(field.value.trim().replace(/^#/, ''));
  suggestions=catalog.filter(tag=>!tags.has(AmagoSearch.normalize(tag))&&AmagoSearch.normalize(tag).includes(term)).slice(0,6);
  if(!suggestions.length){close();return}
  list.innerHTML=suggestions.map((tag,i)=>'<div role="option" aria-selected="false" id="document-tag-option-'+i+'" data-tag-option="'+i+'" title="#'+esc(tag)+'">'+icon('tag')+'<span>'+esc(tag)+'</span></div>').join('');
  list.hidden=false;toggle.setAttribute('aria-expanded','true');field.setAttribute('aria-expanded','true');choose(-1);
 }
 function add(value){
  const names=value.split(/[,\s]+/).map(t=>t.replace(/^#/, '')).filter(Boolean);
  if(!names.length){if(value.trim()){field.setCustomValidity('Digite o nome da etiqueta.');field.reportValidity();return false}return true}
  if(names.some(t=>!/^[-\p{L}\p{N}_/]+$/u.test(t))){field.setCustomValidity('Use letras, números, hífen, barra ou sublinhado.');field.reportValidity();return false}
  field.setCustomValidity('');for(const tag of names)tags.set(AmagoSearch.normalize(tag),tag);
  field.value='';drawChips();close();feedback.textContent=names.length===1?'Etiqueta adicionada.':'Etiquetas adicionadas.';return true;
 }
 field.oninput=()=>{field.setCustomValidity('');feedback.textContent='';suggest()};
 field.onkeydown=e=>{
  if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();close();return}
  if(['ArrowDown','ArrowUp'].includes(e.key)){if(list.hidden)suggest();if(list.hidden)return;e.preventDefault();const step=e.key==='ArrowDown'?1:-1;choose(active<0?(step>0?0:suggestions.length-1):(active+step+suggestions.length)%suggestions.length);return}
  if(e.key==='Enter'){e.preventDefault();if(field.value.trim()||active>=0)add(active>=0?suggestions[active]:field.value)}
 };
 toggle.onpointerdown=e=>e.preventDefault();
 toggle.onclick=()=>{field.focus();if(list.hidden){suggest();if(!suggestions.length)feedback.textContent='Nenhuma etiqueta sugerida.'}else close()};
 field.addEventListener('blur',close);
 list.onpointerdown=e=>e.preventDefault();
 list.onclick=e=>{const option=e.target.closest('[data-tag-option]');if(option){add(suggestions[+option.dataset.tagOption]);field.focus()}};
 form.querySelector('[data-tag-add]').onclick=()=>{if(add(field.value))field.focus()};
 chips.onclick=e=>{const chip=e.target.closest('[data-remove-tag]');if(!chip)return;tags.delete(AmagoSearch.normalize(chip.dataset.removeTag));drawChips();field.focus();feedback.textContent='Etiqueta removida.'};
 drawChips();return {values:()=>add(field.value)?[...tags.values()]:null};
}
actions['edit-tags']=()=>{
 const target=navigationDocument();if(!target)return;
 const {doc,project}=target,meta=AmagoSearch.metadata(doc.body),initial=editableTagValues(doc);
 const inline=meta.inlineTags.length?'<details class="metadata-details"><summary>Etiquetas no texto <small>'+meta.inlineTags.length+'</small></summary><div class="metadata-details-body"><p>Estas etiquetas acompanham as hashtags escritas no documento.</p><div class="metadata-token-list">'+meta.inlineTags.map(tag=>'<span class="metadata-token" title="#'+esc(tag)+'"><span>#'+esc(tag)+'</span></span>').join('')+'</div></div></details>':'';
 modal('Etiquetas','<form id="document-tag-form" class="metadata-form">'+metadataDocumentHeading(doc)+tagPickerFields()+inline+'<div class="modal-actions"><button type="button" class="plain-button" data-action="close">Cancelar</button><button class="solid-button" type="submit">Salvar etiquetas</button></div></form>');
 const form=$('#document-tag-form'),picker=bindTagPicker(form,initial);
 form.onsubmit=async event=>{
  event.preventDefault();const tags=picker.values();if(!tags)return;
  if(JSON.stringify(tags)!==JSON.stringify(initial)){
   [...form.elements].find(el=>el.type==='submit')?.setAttribute('disabled','');
   doc.body=AmagoSearch.withProperties(doc.body,{tags});
   if(project){doc.dirty=doc.body!==doc.savedBody;if(!(await saveProjectFile())){closeModal();render();return}}
   else{doc.tags=[];doc.updated=stamp();persist()}
  }
  closeModal();render();
 };
};
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-pane-tag]');if(!button)return;
 activatePane(Number(button.dataset.paneTag));actions['edit-tags']();
});
let documentTagTimer;
function queueDocumentTags(e){
 if(!e.target.closest('#editor,#project-editor,[data-pane-editor],.visual-block,.visual-editor'))return;
 clearTimeout(documentTagTimer);documentTagTimer=setTimeout(()=>{
  const target=navigationDocument(),chips=$('.document-tags');
  if(chips&&target)chips.innerHTML=documentTagChips(target.doc);
  refreshSearchResults();
 },180);
}
document.addEventListener('input',queueDocumentTags);
actions.trash=openLibraryTrash;
renderMain();
