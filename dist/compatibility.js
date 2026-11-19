'use strict';
// All folder Markdown documents use the same metadata engine as the personal library.
function projectMetadataBar(){const f=workbench.file;if(f?.kind!=='markdown')return '';const meta=AmagoSearch.metadata(f.body);return `<div class="document-metadata"><button class="plain-button" data-action="edit-tags">${icon('tag')} Etiquetas</button><button class="plain-button" data-action="project-properties">${icon('settings')}Propriedades</button><div>${meta.tags.map(t=>`<button class="tag-chip" data-document-query="tag:${esc(t)}"># ${esc(t)}</button>`).join('')||'<span>Sem tags</span>'}${meta.mentions.map(t=>`<button class="mention-chip" data-document-query="mention:&quot;${esc(t)}&quot;">@ ${esc(t)}</button>`).join('')}</div><small>${discovery.indexing?'Lendo workspace…':'Markdown integrado ao workspace'}</small></div>`}
function refreshProjectContext(){if(state.view!=='project'||workbench.file?.kind!=='markdown')return;const current=$('#main>.context-panel');if(current)current.outerHTML=projectNoteContext();else $('#main').insertAdjacentHTML('beforeend',projectNoteContext());updateStudioTools();applyInterface()}
const integratedProject=renderProject;
renderProject=function(){integratedProject();if(workbench.file?.kind==='markdown'){$('.project-document-toolbar').insertAdjacentHTML('afterend',projectMetadataBar());refreshProjectContext()}updateStudioTools();applyInterface()};
const integratedToggle=actions['toggle-connections'];actions['toggle-connections']=()=>{if(state.view==='project'&&workbench.file?.kind==='markdown')refreshProjectContext();integratedToggle()};
// A plain-text document should never gain Markdown frontmatter from the property editor.
activeProperties=function(){
 cacheCurrentFile();
 const pane=multiActive()?studio.panes[studio.active]:null,project=pane?pane.source==='project':workbench.source==='project';
 const doc=pane?paneDocument(pane):project?workbench.file:note();
 if(!doc)return;
 if(project&&doc.kind!=='markdown'){
  modal('Propriedades do arquivo','<p><strong>'+esc(doc.path)+'</strong></p><p>Texto UTF-8 · '+(new TextEncoder().encode(doc.body||'').length/1024).toFixed(1)+' KB</p>');
  return;
 }
 const meta=AmagoSearch.metadata(doc.body),initial=editableTagValues(doc),aliases=meta.aliases.join(', ');
 const date=/^\d{4}-\d{2}-\d{2}$/.test(meta.date)?meta.date:'';
 const folder=project?'':'<label class="metadata-label">Pasta<select class="field" name="folder">'+vault.folders.map(f=>'<option '+(doc.folder===f?'selected':'')+'>'+esc(f)+'</option>').join('')+'</select></label>';
 const tags=initial.length?' <small>'+initial.length+'</small>':'';
 const original=meta.front?'<details class="metadata-details"><summary>Ver propriedades em YAML</summary><pre class="metadata-source">'+esc(meta.front)+'</pre></details>':'';
 modal('Propriedades do Markdown','<form id="markdown-properties" class="metadata-form">'+metadataDocumentHeading(doc)+folder+
  '<label class="metadata-label">Nomes alternativos<input class="field" name="aliases" value="'+esc(aliases)+'" placeholder="Separe os nomes por vírgula"></label>'+
  '<details class="metadata-details"><summary>Etiquetas'+tags+'</summary><div class="metadata-details-body">'+tagPickerFields()+'</div></details>'+
  '<details class="metadata-details"><summary>Data e cor no mapa</summary><div class="metadata-details-body"><label class="metadata-label">Data do documento<input class="field" name="date" type="date" value="'+esc(date)+'"></label>'+
  '<div class="metadata-label"><label for="md-color-value">Cor do ponto no mapa</label><div class="metadata-color"><input id="md-color-picker" type="color" aria-label="Escolher cor" value="'+(meta.color||'#78e2df')+'"><input id="md-color-value" class="field" name="color" value="'+(meta.color||'')+'" placeholder="Automática" maxlength="7" pattern="#[0-9a-fA-F]{6}"><button class="plain-button" type="button" data-color-auto>Automática</button></div></div></div></details>'+original+
  '<div class="modal-actions"><button type="button" class="plain-button" data-action="close">Cancelar</button><button class="solid-button" type="submit">Salvar propriedades</button></div></form>');
 const form=$('#markdown-properties'),picker=bindTagPicker(form,initial),color=form.elements.color,colorWell=$('#md-color-picker');
 colorWell.oninput=()=>color.value=colorWell.value;
 color.oninput=()=>{if(color.validity.valid&&color.value)colorWell.value=color.value};
 form.querySelector('[data-color-auto]').onclick=()=>{color.value='';colorWell.value='#78e2df'};
 form.onsubmit=async event=>{
  event.preventDefault();const selected=picker.values();if(!selected)return;
  const changed={},aliasesValue=form.elements.aliases.value;
  if(JSON.stringify(selected)!==JSON.stringify(initial))changed.tags=selected;
  if(aliasesValue!==aliases)changed.aliases=[...new Set(aliasesValue.split(',').map(alias=>alias.trim()).filter(Boolean))];
  if(form.elements.date.value!==date)changed.date=form.elements.date.value||null;
  if(color.value!==(meta.color||''))changed.color=color.value||null;
  const hasBodyChanges=Object.keys(changed).length>0;
  if(hasBodyChanges)doc.body=AmagoSearch.withProperties(doc.body,changed);
  if(project&&hasBodyChanges){
   [...form.elements].find(el=>el.type==='submit')?.setAttribute('disabled','');
   doc.dirty=doc.body!==doc.savedBody;
   if(!(await saveProjectFile())){closeModal();render();return}
  }else if(!project&&(hasBodyChanges||doc.folder!==form.elements.folder.value)){
   if(changed.tags)doc.tags=[];
   doc.folder=form.elements.folder.value;doc.updated=stamp();persist();
  }
  closeModal();render();
 };
};
actions['note-menu']=activeProperties;actions['project-properties']=activeProperties;
const integratedTools=updateStudioTools;updateStudioTools=function(){integratedTools();const isText=workbench.source==='project'&&workbench.file?.kind==='text';if(isText)$('[data-action="toggle-connections"]')?.setAttribute('hidden','');if(isText)$('#main>.context-panel')?.remove()};
const integratedRefresh=refreshSearchResults;refreshSearchResults=function(){integratedRefresh();const bar=$('.document-metadata');if(bar)bar.outerHTML=projectMetadataBar()};
let metadataTimer;document.addEventListener('input',e=>{if(!e.target.matches('#project-editor,[data-pane-editor]'))return;clearTimeout(metadataTimer);metadataTimer=setTimeout(()=>{refreshSearchResults();refreshProjectContext()},300)});
document.addEventListener('click',e=>{const el=e.target.closest('[data-document-query]');if(!el)return;e.preventDefault();e.stopImmediatePropagation();workbench.query=el.dataset.documentQuery;workbench.filter=null;actions.search()},true);
// Plain text files use the split editor as well, but only Markdown participates in the graph.
const integratedMain=renderMain;renderMain=function(){integratedMain();if(workbench.file?.kind==='text'&&state.view==='project')$('#main>.context-panel')?.remove();updateStudioTools()};
render();
const integratedActivate=activatePane;activatePane=function(index){integratedActivate(index);refreshProjectContext()};
const integratedFileMarkdown=fileMarkdown;
fileMarkdown=function(body){return integratedFileMarkdown(body.replace(/(`{3,}[\s\S]*?`{3,}|~{3,}[\s\S]*?~{3,}|`[^`]*`)|(?<!!)\[([^\]]+)\]\(<?([^\s)>]+)>?\)/g,(all,code,label,target)=>{if(code||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target||''))return all;try{target=decodeURIComponent(target)}catch{}return '[['+target+'|'+label+']]'}))};
const integratedModalSearch=updateModalSearch;updateModalSearch=function(){integratedModalSearch();if($('#hybrid-chips')&&workbench.filter)$('#hybrid-chips').insertAdjacentHTML('afterbegin',`<button class="query-chip" data-clear-kind>Tipo: ${esc(workbench.filter)} ×</button>`)};
document.addEventListener('click',e=>{if(!e.target.closest('[data-clear-kind]'))return;e.preventDefault();e.stopImmediatePropagation();workbench.filter=null;updateModalSearch()},true);
