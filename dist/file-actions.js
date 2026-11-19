'use strict';
let pendingFileOperation=null;
const flushBeforeOperations=window.amagoFlush;window.amagoFlush=async()=>{if(pendingFileOperation)await pendingFileOperation;return flushBeforeOperations?.()};
function removeFileMenu(){const menu=$('#file-context-menu');if(menu){const returnTo=menu.returnTo;menu.remove();if(returnTo?.isConnected)returnTo.focus({preventScroll:true})}}
function fileMenuItem(row){if(row.dataset.projectFile)return {project:true,path:row.dataset.projectFile,folder:false};if(row.dataset.projectDir)return {project:true,path:row.dataset.projectDir,folder:true};if(row.dataset.note){const doc=vault.notes.find(d=>d.id===row.dataset.note);return doc?{project:false,path:AmagoLinks.documentPath(doc),id:doc.id,folder:false}:null}if(row.dataset.folder)return {project:false,path:row.dataset.folder,folder:true};return null}
function showFileMenu(row,x,y){const item=fileMenuItem(row);if(!item)return;removeFileMenu();const menu=document.createElement('div');menu.id='file-context-menu';menu.className='file-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Ações de '+item.path);menu.returnTo=row;menu.innerHTML=`<strong>${esc(item.path.split('/').at(-1))}</strong>${item.folder?`<button role="menuitem" data-file-command="create">${icon('plus')}Nova nota nesta pasta</button>`:''}<button role="menuitem" data-file-command="rename">${icon('edit')}Renomear…</button><button role="menuitem" data-file-command="remove">${icon('trash')}Enviar para a lixeira…</button><button role="menuitem" class="danger-text" data-file-command="purge">${icon('trash-x')} Excluir definitivamente…</button>`;document.body.append(menu);menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button').focus({preventScroll:true});menu.onclick=e=>{const button=e.target.closest('[data-file-command]');if(!button)return;e.preventDefault();e.stopPropagation();removeFileMenu();if(button.dataset.fileCommand==='create'){if(item.project){createProjectItem('markdown');$('#project-name').value=item.path+'/';$('#project-name').focus()}else newNote('',item.path);return}startFileOperation(item,button.dataset.fileCommand).catch(error=>toast(error.message))};menu.onkeydown=e=>{const buttons=[...menu.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus()}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();removeFileMenu()}}}
const treeSelector='#sidebar [data-project-file],#sidebar [data-project-dir],#sidebar [data-note],#sidebar [data-folder]';
window.addEventListener('contextmenu',e=>{const row=e.target.closest(treeSelector);if(!row)return;e.preventDefault();showFileMenu(row,e.clientX,e.clientY)},true);
window.addEventListener('keydown',e=>{const row=e.target.closest(treeSelector);if(row&&(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')){e.preventDefault();e.stopImmediatePropagation();const rect=row.getBoundingClientRect();showFileMenu(row,rect.left+20,rect.bottom)}},true);
window.addEventListener('pointerdown',e=>{if(!e.target.closest('#file-context-menu'))removeFileMenu()},true);
// Discoverable action button; delegated before explorer navigation.
const actionTree=renderTree;renderTree=function(){actionTree();document.querySelectorAll(treeSelector).forEach(row=>{row.title+=' · botão direito para ações';const more=document.createElement('span');more.className='tree-menu-hint';more.dataset.treeMenu='';more.setAttribute('aria-hidden','true');more.textContent='⋯';row.append(more)});const scroller=$('#sidebar-content');if(scroller)scroller.scrollTop=explorerScroll.get(scroller.dataset.scrollKey)||0};
window.addEventListener('click',e=>{const more=e.target.closest('[data-tree-menu]');if(!more)return;e.preventDefault();e.stopImmediatePropagation();const row=more.closest('.project-entry'),rect=row.getBoundingClientRect();showFileMenu(row,rect.right-40,rect.bottom)},true);
function personalTrashItems(){
 const groups=vault.trashFolders||[],grouped=new Set(groups.flatMap(group=>group.notes));
 const folders=groups.map(group=>({id:group.id,kind:'folder',label:group.path,path:group.path,deletedAt:group.deletedAt}));
 const notes=vault.trash.filter(note=>!grouped.has(note.id)).map(note=>({id:note.id,kind:'note',label:note.title,path:note.folder,deletedAt:note.deletedAt}));
 return [...folders,...notes].sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));
}
function changePersonalTrash(item,action){
 const group=item.kind==='folder'?vault.trashFolders?.find(g=>g.id===item.id):null;
 if(item.kind==='folder'&&!group)throw Error('Esta pasta não está mais na lixeira.');
 const ids=new Set(group?group.notes:[item.id]),documents=vault.trash.filter(doc=>ids.has(doc.id));
 if(!group&&!documents.length)throw Error('Esta nota não está mais na lixeira.');
 if(action==='restore'){
  for(const folder of group?.folders||[])if(!vault.folders.includes(folder))vault.folders.push(folder);
  for(const doc of documents){
   if(!vault.folders.includes(doc.folder))vault.folders.push(doc.folder);
   state.openFolders.add(doc.folder);const restored={...doc,title:uniqueTitle(doc.title),updated:stamp()};delete restored.deletedAt;
   vault.notes.push(restored);
  }
 }else for(const doc of documents)delete vault.history[doc.id];
 vault.trash=vault.trash.filter(doc=>!ids.has(doc.id));
 if(group)vault.trashFolders=vault.trashFolders.filter(g=>g.id!==group.id);
 persist();
}
async function openLibraryTrash(query=''){
 if(typeof query!=='string')query='';
 const project=workbench.source==='project'&&!workbench.project?.cloud,root=project?workbench.project?.root:null;
 const current=()=>!project||workbench.source==='project'&&workbench.project?.root===root;
 modal(project?'Lixeira do projeto':'Lixeira','<label for="trash-query">Buscar na lixeira</label><input id="trash-query" type="search" class="field" placeholder="Nome ou pasta"><div id="trash-items"></div><p class="trash-status" role="status"></p>');
 const field=$('#trash-query'),list=$('#trash-items'),status=$('.trash-status');field.value=query;
 let items=[];
 if(project){
  status.textContent='Carregando itens…';
  try{const records=await window.projectAdapter.listTrash();if(records.error)throw Error(records.error);
   if(!list.isConnected||!current())return;
   items=records.map(record=>({id:record.id,kind:record.kind||'file',label:record.path.split('/').at(-1),path:record.path,deletedAt:record.deletedAt}));
  }catch(error){status.textContent=error.message;return}
  status.textContent='';
 }else items=personalTrashItems();
 function refresh(){
  const term=AmagoSearch.normalize(field.value),matches=items.filter(item=>AmagoSearch.normalize(item.label+' '+item.path).includes(term));
  list.innerHTML=matches.map(item=>`<div class="version-row library-trash-row"><span class="library-trash-icon">${icon(item.kind==='folder'?'folder':'note')}</span><div><strong>${esc(item.label)}</strong><p>${esc(item.path)} · ${formatDate(item.deletedAt)}</p></div><button type="button" class="plain-button" data-library-restore="${esc(item.id)}">Restaurar</button><button type="button" class="plain-button danger-text" data-purge-trash="${esc(item.id)}">Excluir</button></div>`).join('')||'<p>'+(items.length?'Nenhum item encontrado.':'A lixeira está vazia.')+'</p>';
 }
 refresh();field.oninput=refresh;
 async function apply(item,action,button){
  if(!current())return;
  const controls=button.closest('.modal').querySelectorAll('button');controls.forEach(b=>b.disabled=true);
  const output=button.closest('.modal').querySelector('[role=status]');
  try{
   if(project){
    const result=await window.projectAdapter.trashAction(item.id,action);if(result.error)throw Error(result.error);
    if(!current())return;
    if(action==='restore')await refreshProject();
   }else changePersonalTrash(item,action);
   render();openLibraryTrash(field.value);toast(action==='restore'?'Item restaurado.':'Item excluído definitivamente.');
  }catch(error){if(output)output.textContent=error.message;controls.forEach(b=>b.disabled=false)}
 }
 list.onclick=e=>{
  const button=e.target.closest('[data-library-restore],[data-purge-trash]');if(!button)return;
  const item=items.find(row=>row.id===(button.dataset.libraryRestore||button.dataset.purgeTrash));if(!item)return;
  if(button.hasAttribute('data-library-restore')){apply(item,'restore',button);return}
  modal('Excluir definitivamente?',`<p><strong>${esc(item.label)}</strong> será apagado da lixeira. A exclusão é definitiva.</p><p role="status"></p><div class="modal-actions"><button class="plain-button" id="keep-trash">Cancelar</button><button class="solid-button" id="purge-trash">Excluir definitivamente</button></div>`);
  $('#keep-trash').onclick=()=>openLibraryTrash(field.value);$('#purge-trash').onclick=e=>apply(item,'purge',e.currentTarget);$('#keep-trash').focus();
 };
}
function listAffected(items){return items.length?'<ul class="operation-list">'+items.map(path=>'<li>'+esc(path)+'</li>').join('')+'</ul>':'<p>Nenhuma referência precisa ser alterada.</p>'}
async function startFileOperation(item,action){if(item.project&&!(await saveProjectFile()))return;persist();if(action==='rename'){const original=item.path.split('/').at(-1),value=!item.project&&!item.folder?original.replace(/\.md$/i,''):original;modal(item.folder?'Renomear pasta':'Renomear arquivo',`<form id="rename-item"><label>Novo nome<input id="rename-name" class="field" value="${esc(value)}" required maxlength="160"></label><p>O Âmago verificará os vínculos antes de alterar o nome${item.project&&!item.folder?'. Mantenha a extensão do arquivo':''}.</p><p class="operation-status" role="status"></p><div class="modal-actions"><button type="button" class="plain-button" data-action="close">Cancelar</button><button class="solid-button">Revisar alterações</button></div></form>`);$('#rename-item').onsubmit=async e=>{e.preventDefault();const name=$('#rename-name').value.trim(),button=$('#rename-item button[type="submit"]')||$('.modal-actions .solid-button');button.disabled=true;try{await previewFileOperation(item,action,name)}catch(error){$('.operation-status').textContent=error.message;button.disabled=false}};return}await previewFileOperation(item,action)}
function personalPlan(item,action,name){const docs=vault.notes.map(d=>({...d,path:AmagoLinks.documentPath(d),kind:'markdown'}));const from=item.path,selected=d=>item.folder?AmagoRefactor.inside(d.path,from):d.id===item.id;if(!docs.some(selected)&&!vault.folders.includes(from))throw Error('Este item não existe mais.');let to='';if(action==='rename'){AmagoRefactor.validName(name);to=item.folder?name:[...from.split('/').slice(0,-1),name+'.md'].join('/');if(to===from||docs.some(d=>d.path.toLowerCase()===to.toLowerCase())||item.folder&&vault.folders.some(f=>f.toLowerCase()===to.toLowerCase()))throw Error('Esse nome já está em uso.')}const plan=action==='rename'?AmagoRefactor.plan(docs,from,to):{changes:[],referenceCount:0};const references=action==='rename'?plan.changes.map(c=>c.path):docs.filter(d=>!AmagoRefactor.inside(d.path,from)&&AmagoSearch.metadata(d.body).links.some(link=>{const t=resolveLink(docs,d,link);return t&&AmagoRefactor.inside(t.path,from)})).map(d=>d.path);return {...plan,from,to,action,kind:item.folder?'directory':'markdown',files:docs.filter(selected).map(d=>d.path),references,snapshot:JSON.stringify(vault.notes),folders:JSON.stringify(vault.folders)}}
async function previewFileOperation(item,action,name){
 const plan=item.project?await window.projectAdapter.previewOperation({action,path:item.path,name}):personalPlan(item,action,name);
 if(plan.error)throw Error(plan.error);
 const purge=action==='purge',deleting=action!=='rename';
 const buttonLabel=purge?'Excluir definitivamente':deleting?'Enviar para a lixeira':'Renomear e adaptar links';
 const title=deleting?buttonLabel+'?':'Revisar renomeação';
 const message=purge?'A exclusão é definitiva.':deleting?'O item poderá ser restaurado em Coleções → '+(item.project?'Lixeira do projeto.':'Lixeira.'):`Passará a se chamar <strong>${esc(plan.to)}</strong>.`;
 modal(title,`<p class="file-operation-path">${icon(item.folder?'folder':'note')}<strong>${esc(plan.from)}</strong></p><p>${message}</p>
  ${deleting&&item.folder?`<details><summary>Arquivos na pasta (${plan.files.length})</summary>${plan.files.length?listAffected(plan.files):'<p>Pasta vazia.</p>'}</details>`:''}
  ${plan.references.length?`<details><summary>${deleting?'Documentos com referências a este item':'Documentos com links a atualizar'} (${plan.references.length})</summary>${listAffected(plan.references)}</details>`:''}
  <p class="operation-status" role="status"></p><div class="modal-actions"><button class="plain-button" data-action="close">Cancelar</button><button class="solid-button" id="apply-file-operation">${buttonLabel}</button></div>`);
 const confirm=$('#apply-file-operation'),status=$('.operation-status');
 if(deleting)confirm.previousElementSibling.focus();
 confirm.onclick=async()=>{
  confirm.disabled=true;window.amagoOperationBusy=true;document.body.classList.add('operation-busy');status.textContent='Aplicando alterações…';
  pendingFileOperation=applyFileOperation(item,plan);
  try{
   const applied=await pendingFileOperation;closeModal();
   if(item.project&&action==='rename'){
    modal('Item renomeado',`<p>A cópia anterior está em <code class="operation-status">${esc(applied.backup)}/original</code>.</p><div class="modal-actions"><button class="solid-button" data-action="close">Concluir</button></div>`);
   }else toast(purge?'Item excluído definitivamente.':deleting?'Item enviado para a lixeira.':'Item renomeado.');
  }catch(error){status.textContent=error.message;confirm.textContent='Revisar novamente';confirm.disabled=false;confirm.onclick=()=>startFileOperation(item,action,name).catch(err=>toast(err.message))}
  finally{pendingFileOperation=null;window.amagoOperationBusy=false;document.body.classList.remove('operation-busy')}
 };
}
async function applyFileOperation(item,plan){if(!item.project){if(plan.snapshot!==JSON.stringify(vault.notes)||plan.folders!==JSON.stringify(vault.folders))throw Error('As notas mudaram. Revise a operação novamente.');const selected=vault.notes.filter(d=>item.folder?AmagoRefactor.inside(AmagoLinks.documentPath(d),plan.from):d.id===item.id);if(plan.action==='rename'){for(const change of plan.changes){const doc=vault.notes.find(d=>AmagoLinks.documentPath(d)===change.path);doc.body=change.body;doc.updated=stamp()}if(item.folder){vault.folders=vault.folders.map(f=>AmagoRefactor.mapPath(f,plan.from,plan.to));for(const d of selected)d.folder=AmagoRefactor.mapPath(d.folder,plan.from,plan.to);state.openFolders.add(plan.to)}else selected[0].title=plan.to.split('/').at(-1).replace(/\.md$/i,'')}else{if(plan.action==='purge'){for(const d of selected)delete vault.history[d.id]}else{
  const deletedAt=stamp();for(const d of selected)vault.trash.push({...structuredClone(d),deletedAt});
  if(item.folder){vault.trashFolders??=[];vault.trashFolders.push({id:uid(),path:plan.from,folders:vault.folders.filter(folder=>AmagoRefactor.inside(folder,plan.from)),notes:selected.map(d=>d.id),deletedAt})}
 }const ids=new Set(selected.map(d=>d.id));vault.notes=vault.notes.filter(d=>!ids.has(d.id));state.tabs=state.tabs.filter(id=>!ids.has(id));studio.panes=studio.panes.filter(p=>p.source!=='vault'||!ids.has(p.id));if(item.folder)vault.folders=vault.folders.filter(f=>!AmagoRefactor.inside(f,plan.from));if(!vault.folders.length)vault.folders.push('Notas');if(!vault.notes.length)vault.notes.push({id:uid(),title:'Novo começo',folder:vault.folders[0],tags:[],body:'',favorite:false,created:stamp(),updated:stamp()});state.id=vault.notes[0]?.id;state.view='home'}persist();render();return {done:true}}
 const result=await window.projectAdapter.applyOperation(plan.id);if(result.error)throw Error(result.error);const map=p=>plan.action==='rename'?AmagoRefactor.mapPath(p,plan.from,plan.to):AmagoRefactor.inside(p,plan.from)?null:p,current=workbench.file?.path,next=current?map(current):null;
 const previousActive=studio.active;workbench.tabs=workbench.tabs.map(map).filter(Boolean);studio.panes=studio.panes.map(p=>p.source==='project'?{...p,id:map(p.id)}:p).filter(p=>p.id);workbench.expanded=new Set([...workbench.expanded].map(map).filter(Boolean));const retainedPanes=studio.panes;const prefs=graphPreferences();prefs.positions=Object.fromEntries(Object.entries(prefs.positions).map(([key,value])=>[map(key),value]).filter(([key])=>key));discovery.selected=discovery.selected?map(discovery.selected):null;discovery.localFocus=discovery.localFocus?map(discovery.localFocus):null;persist();studio.files.clear();workbench.file=null;studio.panes=[];studio.active=0;clearProjectImages();state.view='project-home';await refreshProject();if(discovery.indexPromise)await discovery.indexPromise;const active=next||retainedPanes[0]?.id;if(active)await openProjectFile(active);if(retainedPanes.length>1){for(const pane of retainedPanes){const doc=discovery.docs.find(d=>d.path===pane.id);if(doc&&AmagoFiles.editable(doc))studio.files.set(pane.id,{...doc,savedBody:doc.body,dirty:false})}studio.panes=retainedPanes.filter(p=>studio.files.has(p.id));studio.active=Math.min(previousActive,studio.panes.length-1);if(studio.panes[studio.active])workbench.file=studio.files.get(studio.panes[studio.active].id)}render();return result;
}
renderTree();
