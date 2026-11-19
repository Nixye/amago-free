'use strict';

// Workspace preferences contain metadata only; project documents stay in their folders.
function productivityWorkspaceKey(){return workbench.source==='project'?'project:'+(workbench.project?.root||workbench.project?.recentId||''):'vault'}
function productivityPreferences(){
 if(!vault.productivity||!Array.isArray(vault.productivity.workspaces))vault.productivity={workspaces:[]};
 const key=productivityWorkspaceKey();let prefs=vault.productivity.workspaces.find(p=>p?.key===key);
 if(!prefs){prefs={key,sort:'name',searches:[]};vault.productivity.workspaces.push(prefs)}
 if(!Array.isArray(prefs.searches))prefs.searches=[];
 return prefs;
}
function productivitySort(entries,mode=productivityPreferences().sort){
 const name=e=>String(e.name||e.title||e.path||'');
 const date=e=>{const value=typeof e.updated==='number'?e.updated:Date.parse(e.updated||'');return Math.max(Number.isFinite(value)?value:0,...(e.children||[]).map(date))};
 return [...entries].sort((a,b)=>{
  const folders=Number(b.kind==='directory')-Number(a.kind==='directory');if(folders)return folders;
  if(mode==='updated'){const changed=date(b)-date(a);if(changed)return changed}
  return (mode==='name-desc'?-1:1)*(name(a).localeCompare(name(b),'pt-BR',{numeric:true,sensitivity:'base'})||name(a).localeCompare(name(b)));
 });
}
const productivityProjectTree=projectTree;
projectTree=function(entries,depth=0){return productivityProjectTree(productivitySort(entries),depth)};
vaultTree=function(){
 const folders=productivitySort(vault.folders.map(name=>({name,kind:'directory',updated:vault.notes.filter(n=>n.folder===name).reduce((latest,n)=>String(n.updated||'')>latest?n.updated:latest,'')})));
 return folders.map(({name:folder})=>{
  const notes=productivitySort(vault.notes.filter(n=>n.folder===folder));
  return `<div><button class="project-entry" style="--depth:0" data-folder="${esc(folder)}" aria-expanded="${state.openFolders.has(folder)}"><span class="tree-chevron ${state.openFolders.has(folder)?'expanded':''}">${icon('chevron')}</span>${icon('folder')}<span>${esc(folder)}</span><small>${notes.length}</small></button>${state.openFolders.has(folder)?notes.map(n=>`<button class="project-entry ${state.id===n.id&&state.view==='notes'?'selected':''}" style="--depth:1" data-note="${esc(n.id)}"><span class="tree-spacer"></span>${icon('note')}<span>${esc(n.title)}</span>${n.favorite?'<small class="file-favorite" aria-label="Favorito">'+icon('star')+'</small>':''}</button>`).join(''):''}</div>`;
 }).join('');
};
const productivityRenderTree=renderTree;
renderTree=function(){
 productivityRenderTree();const toolbar=$('.tree-toolbar');if(!toolbar)return;
 const label=document.createElement('label');label.className='explorer-sort';label.innerHTML='<span>Ordenar</span><select aria-label="Ordenar arquivos"><option value="name">Nome A–Z</option><option value="name-desc">Nome Z–A</option><option value="updated">Mais recentes</option></select>';
 toolbar.after(label);label.querySelector('select').value=['updated','name-desc'].includes(productivityPreferences().sort)?productivityPreferences().sort:'name';
 label.querySelector('select').onchange=e=>{productivityPreferences().sort=e.target.value;persist();renderTree();$('.explorer-sort select')?.focus()};
};

function mountSavedSearches(){
 const query=$('#hybrid-query');if(!query||$('#saved-searches'))return;
 const section=document.createElement('details');section.id='saved-searches';section.className='saved-searches';
 section.innerHTML='<summary>Buscas salvas neste espaço</summary><form id="save-search-form"><label>Nome da busca<input class="field" name="title" maxlength="80" placeholder="Ex.: Ideias de design" aria-label="Nome da busca salva"></label><button class="plain-button" type="submit">Salvar busca atual</button></form><div id="saved-search-list"></div><p id="saved-search-status" role="status"></p>';
 query.closest('.hybrid-modal-input').after(section);
 section.querySelector('form').onsubmit=e=>{
  e.preventDefault();const prefs=productivityPreferences(),value=workbench.query.trim(),filter=workbench.filter||null,status=$('#saved-search-status');
  if(!value&&!filter){status.textContent='Digite uma busca ou escolha um tipo de arquivo antes de salvar.';return}
  const title=e.target.elements.title.value.trim()||value||filter;
  const existing=prefs.searches.find(s=>s.query===value&&s.filter===filter);
  if(existing)existing.title=title.slice(0,80);else if(prefs.searches.length<30)prefs.searches.push({id:uid(),title:title.slice(0,80),query:value,filter});else{status.textContent='Até 30 buscas por espaço. Remova uma busca para adicionar outra.';return}
  persist();renderSavedSearches();status.textContent=existing?'Nome da busca atualizado.':'Busca salva neste espaço.';
 };
 renderSavedSearches();
}
function renderSavedSearches(){
 const list=$('#saved-search-list');if(!list)return;
 list.innerHTML=productivityPreferences().searches.map(s=>`<div class="saved-search-row"><button type="button" data-saved-search="${esc(s.id)}"><strong>${esc(s.title)}</strong><small>${esc(s.query||'Todos os arquivos')}${s.filter?' · '+esc(s.filter):''}</small></button><button class="icon-button" type="button" data-delete-search="${esc(s.id)}" aria-label="Remover busca ${esc(s.title)}" title="Remover busca">${icon('close')}</button></div>`).join('')||'<p class="empty-small">Salve filtros que você usa com frequência.</p>';
}
const productivitySearch=search;
search=actions.search=function(){productivitySearch();mountSavedSearches()};
window.addEventListener('click',e=>{
 const apply=e.target.closest('[data-saved-search]'),remove=e.target.closest('[data-delete-search]');if(!apply&&!remove)return;
 e.preventDefault();e.stopImmediatePropagation();const prefs=productivityPreferences();
 if(apply){const saved=prefs.searches.find(s=>s.id===apply.dataset.savedSearch);if(!saved)return;workbench.query=saved.query;workbench.filter=saved.filter;studio.searchLimit=60;$('#hybrid-query').value=saved.query;updateModalSearch();$('#hybrid-query').focus();$('#saved-search-status').textContent='Busca aplicada.'}
 else{prefs.searches=prefs.searches.filter(s=>s.id!==remove.dataset.deleteSearch);persist();renderSavedSearches();$('#saved-search-status').textContent='Busca removida.';$('#save-search-form input').focus()}
},true);

const closedWorkspaceTabs=new Map();
function rememberClosedTab(key,id,index){const stack=closedWorkspaceTabs.get(key)||[];stack.push({id,index});closedWorkspaceTabs.set(key,stack.slice(-10))}
const productivityClosePersonal=closePersonalTab;
closePersonalTab=function(id){const index=state.tabs.indexOf(id);productivityClosePersonal(id);if(index>=0&&!state.tabs.includes(id))rememberClosedTab('vault',id,index)};
const productivityCloseProject=closeProjectTab;
closeProjectTab=async function(path){const key=productivityWorkspaceKey(),index=workbench.tabs.indexOf(path);await productivityCloseProject(path);if(index>=0&&key===productivityWorkspaceKey()&&!workbench.tabs.includes(path))rememberClosedTab(key,path,index)};
let reopeningWorkspaceTab=false;
async function reopenClosedWorkspaceTab(){
 if(reopeningWorkspaceTab)return;const key=productivityWorkspaceKey(),stack=closedWorkspaceTabs.get(key)||[];let entry;
 while(stack.length){const candidate=stack.at(-1),available=workbench.source==='project'?projectFiles().some(f=>f.path===candidate.id):vault.notes.some(n=>n.id===candidate.id);if(available){entry=candidate;break}stack.pop()}
 if(!entry){toast('Nenhuma aba fechada disponível neste espaço.');return}
 reopeningWorkspaceTab=true;
 try{
  if(workbench.source==='project')await openProjectFile(entry.id);else await openNote(entry.id);
  if(key!==productivityWorkspaceKey())return;
  const project=workbench.source==='project',tabs=project?workbench.tabs:state.tabs;
  if(!tabs.includes(entry.id)||(project&&workbench.file?.path!==entry.id))return;
  const remaining=tabs.filter(id=>id!==entry.id);remaining.splice(Math.min(entry.index,remaining.length),0,entry.id);
  if(project)workbench.tabs=remaining;else state.tabs=remaining;stack.pop();renderTabs();
 }catch(error){toast(error.message)}finally{reopeningWorkspaceTab=false}
}
actions['reopen-tab']=reopenClosedWorkspaceTab;commandList.push(['Reabrir aba fechada','reopen-tab','Ctrl Shift T']);
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='t'&&!$('.modal')){e.preventDefault();e.stopImmediatePropagation();reopenClosedWorkspaceTab()}},true);

function updateDraftTabIndicators(){
 if(workbench.source!=='project')return;
 for(const button of document.querySelectorAll('#tabbar [data-project-file]')){
  const path=button.dataset.projectFile,doc=workbench.file?.path===path?workbench.file:studio.files.get(path),tab=button.closest('.tab');if(!tab)continue;
  const status=doc?.conflict||doc?.error?'Conflito ou erro ao salvar':doc?.saving?'Salvando':doc?.dirty?'Alterações não salvas':'';
  let badge=tab.querySelector('.tab-draft-indicator');
  if(!status){badge?.remove();tab.classList.remove('tab-has-draft');continue}
  if(!badge){badge=document.createElement('span');badge.className='tab-draft-indicator';button.append(badge)}
  badge.textContent=doc?.conflict||doc?.error?'!':'●';badge.title=status;badge.setAttribute('aria-label',status);badge.classList.toggle('draft-error',!!(doc?.conflict||doc?.error));tab.classList.add('tab-has-draft');
 }
}
const productivityRenderTabs=renderTabs;renderTabs=function(){productivityRenderTabs();updateDraftTabIndicators()};
const productivityMarkStatus=markFileStatus;markFileStatus=function(message){productivityMarkStatus(message);updateDraftTabIndicators()};
const productivityPaneStatus=renderPaneStatus;renderPaneStatus=function(){productivityPaneStatus();updateDraftTabIndicators()};
const productivitySaveProject=saveProjectFile;saveProjectFile=async function(){try{return await productivitySaveProject()}finally{updateDraftTabIndicators()}};workActions.save=saveProjectFile;
document.addEventListener('input',e=>{if(e.target.matches('#project-editor,[data-pane-editor]')||e.target.closest('#project-preview,.pane-preview'))queueMicrotask(updateDraftTabIndicators)},true);

// A dialog owns keyboard focus until closed, including when its contents are replaced.
let productivityReturnFocus=null,redirectingDialogFocus=false;
const dialogBackgroundState=new Map();
function syncDialogBackground(){
 if($('.modal')){
  if(!productivityReturnFocus&&lastFocus?.isConnected&&!lastFocus.closest('#modal-root'))productivityReturnFocus=lastFocus;
  for(const element of document.body.children){if(element.id==='modal-root'||element.id==='toast'||['SCRIPT','STYLE','LINK'].includes(element.tagName))continue;if(!dialogBackgroundState.has(element))dialogBackgroundState.set(element,element.inert);element.inert=true}
 }else{for(const [element,inert] of dialogBackgroundState)element.inert=inert;dialogBackgroundState.clear()}
}
new MutationObserver(syncDialogBackground).observe($('#modal-root'),{childList:true});
function dialogFocusable(dialog){return [...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex],[contenteditable="true"]')].filter(el=>!el.disabled&&el.tabIndex>=0&&!el.closest('[hidden],[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden')}
const productivityModal=modal;
modal=function(...args){if(!$('.modal'))productivityReturnFocus=document.activeElement;const result=productivityModal(...args);syncDialogBackground();return result};
const productivityCloseModal=closeModal;
closeModal=function(){
 const target=productivityReturnFocus;productivityReturnFocus=null;productivityCloseModal();syncDialogBackground();
 if($('.modal'))return;
 if(target?.isConnected&&!target.closest('#modal-root'))target.focus({preventScroll:true});
 else if(document.activeElement===document.body||document.activeElement?.closest('#modal-root'))($('#editor,#project-editor,[data-pane-editor]')||$('[data-action="commands"]')||$('.workspace-picker'))?.focus({preventScroll:true});
};actions.close=closeModal;
window.addEventListener('keydown',e=>{
 const dialog=$('.modal');if(!dialog||e.key!=='Tab')return;
 const items=dialogFocusable(dialog),active=document.activeElement;
 if(!items.length){e.preventDefault();dialog.tabIndex=-1;dialog.focus();return}
 if(e.shiftKey&&(active===items[0]||!dialog.contains(active))){e.preventDefault();items.at(-1).focus()}
 else if(!e.shiftKey&&(active===items.at(-1)||!dialog.contains(active))){e.preventDefault();items[0].focus()}
},true);
document.addEventListener('focusin',e=>{const dialog=$('.modal');if(!dialog||dialog.contains(e.target)||redirectingDialogFocus)return;redirectingDialogFocus=true;const target=dialogFocusable(dialog)[0]||dialog;if(target===dialog)dialog.tabIndex=-1;target.focus();redirectingDialogFocus=false});

function workspacePaletteCommands(){
 const project=workbench.source==='project',personalOnly=new Set(['new','daily','templates','history','duplicate','export-note','backup','import','trash','delete-note']);
 const commands=commandList.filter(([,action])=>(action!=='git-project'||projectHasGit())&&(!project||!personalOnly.has(action))).map(([title,action,shortcut])=>({title,shortcut,run:()=>actions[action]?.()}));
 if(project)commands.unshift(...[['save','Salvar arquivos abertos','Ctrl S'],['new-file','Novo arquivo Markdown','Ctrl N'],['new-folder','Nova pasta',''],['refresh','Atualizar arquivos do projeto',''],['vault','Ir para Meu universo','']].map(([action,title,shortcut])=>({title,shortcut,run:()=>workActions[action]?.()})));
 return commands;
}
actions.commands=function(){
 modal('O que você quer fazer?',`<label class="palette-query-label" for="command-query">Encontrar comando</label><input class="field" id="command-query" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-label="Filtrar comandos" aria-controls="command-list" placeholder="Digite um comando…"><div id="command-list" class="workspace-command-list" role="listbox" aria-label="Comandos disponíveis"></div><p class="palette-help">↑ ↓ navegar · Home/End no resultado · Enter executar · Esc fechar</p>`);
 const query=$('#command-query'),list=$('#command-list');let matches=[],selected=0;
 const select=index=>{selected=Math.max(0,Math.min(matches.length-1,index));[...list.querySelectorAll('[data-palette-index]')].forEach((button,i)=>{button.classList.toggle('palette-selected',i===selected);button.setAttribute('aria-selected',String(i===selected));button.tabIndex=i===selected?0:-1});if(matches.length){query.setAttribute('aria-activedescendant','palette-command-'+selected);list.children[selected]?.scrollIntoView({block:'nearest'})}else query.removeAttribute('aria-activedescendant')};
 const refresh=()=>{const value=AmagoSearch.normalize(query.value);matches=workspacePaletteCommands().filter(c=>AmagoSearch.normalize(c.title).includes(value));list.innerHTML=matches.map((c,i)=>`<button type="button" role="option" id="palette-command-${i}" data-palette-index="${i}" class="search-result">${icon('chevron')}<strong>${esc(c.title)}</strong><kbd class="command-shortcut">${esc(c.shortcut||'↵')}</kbd></button>`).join('')||'<p class="empty-small" role="status">Nenhum comando encontrado.</p>';select(0)};
 const execute=async index=>{const command=matches[index];if(!command)return;closeModal();try{await command.run()}catch(error){toast(error.message)}};
 query.oninput=refresh;
 list.onclick=e=>{const button=e.target.closest('[data-palette-index]');if(button)execute(+button.dataset.paletteIndex)};
 list.onfocusin=e=>{const button=e.target.closest('[data-palette-index]');if(button)select(+button.dataset.paletteIndex)};
 $('.modal').addEventListener('keydown',e=>{
  if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopPropagation();if(matches.length)select((selected+(e.key==='ArrowDown'?1:matches.length-1))%matches.length)}
  else if(e.key==='Enter'&&(e.target===query||e.target.closest('[data-palette-index]'))){e.preventDefault();e.stopPropagation();execute(selected)}
  else if(['Home','End'].includes(e.key)&&e.target.closest('[data-palette-index]')){e.preventDefault();select(e.key==='Home'?0:matches.length-1);list.children[selected]?.focus()}
 });refresh();query.focus();
};
renderTree();updateDraftTabIndicators();
