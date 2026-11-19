'use strict';

const workspaceNavigation={busy:false,historyJump:false,histories:new Map(),filters:new Map()};
function workspaceTabIds(){return workbench.source==='project'?workbench.tabs:state.tabs}
function workspaceActiveId(){return workbench.source==='project'?state.view==='project'?workbench.file?.path:null:state.view==='notes'&&!state.tag?state.id:null}
function workspacePinnedTabs(){const prefs=productivityPreferences();if(!Array.isArray(prefs.pinnedTabs))prefs.pinnedTabs=[];return prefs.pinnedTabs}
function workspaceHasDocument(id){return workbench.source==='project'?projectFiles().some(doc=>doc.path===id):vault.notes.some(doc=>doc.id===id)}
async function openWorkspaceDocument(id){
 if(!workspaceHasDocument(id)){toast('Este documento não está mais disponível. Atualize os arquivos.');return false}
 if(workspaceActiveId()===id)return true;
 const key=productivityWorkspaceKey();if(workbench.source==='project')await openProjectFile(id);else await openNote(id);
 return key===productivityWorkspaceKey()&&workspaceActiveId()===id;
}
function workspaceHistory(){const key=productivityWorkspaceKey();if(!workspaceNavigation.histories.has(key))workspaceNavigation.histories.set(key,{entries:[],cursor:-1});return workspaceNavigation.histories.get(key)}
function recordWorkspaceVisit(){
 const id=workspaceActiveId();if(!id||workspaceNavigation.historyJump)return;
 const history=workspaceHistory();if(history.entries[history.cursor]===id)return;
 history.entries=history.entries.slice(0,history.cursor+1);history.entries.push(id);history.entries=history.entries.slice(-100);history.cursor=history.entries.length-1;
}
function historyDestination(direction){const history=workspaceHistory();for(let index=history.cursor+direction;index>=0&&index<history.entries.length;index+=direction)if(workspaceHasDocument(history.entries[index]))return index;return -1}
async function navigateWorkspaceHistory(direction){
 if(workspaceNavigation.busy)return;recordWorkspaceVisit();const history=workspaceHistory(),index=historyDestination(direction);if(index<0)return;
 const key=productivityWorkspaceKey();workspaceNavigation.busy=true;workspaceNavigation.historyJump=true;
 try{if(await openWorkspaceDocument(history.entries[index])&&productivityWorkspaceKey()===key)history.cursor=index}
 catch(error){toast(error.message)}finally{workspaceNavigation.busy=false;workspaceNavigation.historyJump=false;recordWorkspaceVisit()}
}
async function cycleWorkspaceTab(direction){
 if(workspaceNavigation.busy)return;const tabs=workspaceTabIds();if(tabs.length<2)return;
 const current=tabs.indexOf(workspaceActiveId()),next=current<0?(direction<0?tabs.length-1:0):(current+(direction<0?-1:1)+tabs.length)%tabs.length;
 workspaceNavigation.busy=true;try{await openWorkspaceDocument(tabs[next])}catch(error){toast(error.message)}finally{workspaceNavigation.busy=false}
}
function toggleWorkspacePin(id=workspaceActiveId()){
 if(!id||!workspaceTabIds().includes(id))return;const prefs=productivityPreferences(),pins=workspacePinnedTabs();prefs.pinnedTabs=pins.includes(id)?pins.filter(pin=>pin!==id):[...pins,id];persist();renderTabs();
}
const workspaceNavigationRenderTabs=renderTabs;
renderTabs=function(){
 const ordered=AmagoDocumentNavigation.orderTabs(workspaceTabIds(),workspacePinnedTabs());if(workbench.source==='project')workbench.tabs=ordered;else state.tabs=ordered;
 workspaceNavigationRenderTabs();
 for(const tab of document.querySelectorAll('#tabbar .tab')){
  const id=tab.dataset.note||tab.querySelector('[data-project-file]')?.dataset.projectFile||tab.dataset.projectFile;if(!id)continue;tab.dataset.workspaceTab=id;
  if(workspacePinnedTabs().includes(id)){tab.classList.add('workspace-tab-pinned');const badge=document.createElement('span');badge.className='workspace-pin-badge';badge.textContent='◆';badge.title='Aba fixada';badge.setAttribute('aria-label','Aba fixada');tab.prepend(badge)}
 }
 const menu=document.createElement('button');menu.type='button';menu.className='tab-options icon-button';menu.dataset.workspaceTabOptions='';menu.title='Ações das abas';menu.setAttribute('aria-label','Ações das abas');menu.textContent='⋯';$('#tabbar').append(menu);
};
async function closeWorkspaceTabs(kind,anchor=workspaceActiveId()){
 if(workspaceNavigation.busy)return;
 const tabs=[...workspaceTabIds()],index=tabs.indexOf(anchor),pins=new Set(workspacePinnedTabs()),closing=tabs.filter((id,i)=>!pins.has(id)&&(kind==='all'||kind==='others'&&id!==anchor||kind==='right'&&index>=0&&i>index));
 if(!closing.length){toast('Nenhuma aba para fechar. As abas fixadas são mantidas.');return}
 const key=productivityWorkspaceKey(),project=workbench.source==='project';workspaceNavigation.busy=true;
 try{
  if(project&&!(await saveProjectFile()))return;
  if(key!==productivityWorkspaceKey()||tabs.join('\0')!==workspaceTabIds().join('\0')){toast('As abas mudaram. Revise a ação novamente.');return}
  if(!project)persist();
  const closed=new Set(closing),remaining=tabs.filter(id=>!closed.has(id)),active=workspaceActiveId();
  for(const id of closing)rememberClosedTab(key,id,tabs.indexOf(id));
  studio.panes=studio.panes.filter(pane=>!closed.has(pane.id));studio.active=Math.max(0,Math.min(studio.active,studio.panes.length-1));
  if(project){
   workbench.tabs=remaining;for(const id of closing)studio.files.delete(id);
   if(closed.has(active)){if(workbench.file?.url?.startsWith('blob:'))URL.revokeObjectURL(workbench.file.url);workbench.file=null;state.view='project-home';const next=studio.panes[studio.active]?.id||remaining.at(-1);if(next){const cached=studio.files.get(next);if(cached){workbench.file=cached;state.view='project'}else await openWorkspaceDocument(next)}}
  }else{state.tabs=remaining;if(closed.has(active)){const next=studio.panes[studio.active]?.id||remaining.at(-1);if(next)await openNote(next);else{state.view='home';state.tag=null}}}
  render();
 }catch(error){toast(error.message)}finally{workspaceNavigation.busy=false}
}
function removeWorkspaceTabMenu(){const menu=$('#workspace-tab-menu');if(!menu)return;const returnTo=menu.returnTo;menu.remove();if(returnTo?.isConnected)(returnTo.matches('button')?returnTo:returnTo.querySelector('button')||returnTo).focus({preventScroll:true})}
function showWorkspaceTabMenu(id,anchor,x,y){
 removeWorkspaceTabMenu();const tabs=workspaceTabIds(),valid=tabs.includes(id),pinned=workspacePinnedTabs().includes(id),menu=document.createElement('div');menu.id='workspace-tab-menu';menu.className='workspace-tab-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Ações das abas');menu.returnTo=anchor;
 menu.innerHTML=`${valid?`<button type="button" role="menuitem" data-tab-command="pin">${pinned?'Desafixar aba':'Fixar aba'}</button><button type="button" role="menuitem" data-tab-command="close">Fechar esta aba</button><button type="button" role="menuitem" data-tab-command="others">Fechar outras abas</button><button type="button" role="menuitem" data-tab-command="right">Fechar abas à direita</button>`:''}<button type="button" role="menuitem" data-tab-command="all">Fechar todas não fixadas</button><small>As ações em grupo preservam abas fixadas.</small>`;
 document.body.append(menu);menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button').focus();
 menu.onclick=async e=>{const button=e.target.closest('[data-tab-command]');if(!button)return;e.preventDefault();e.stopPropagation();const command=button.dataset.tabCommand;removeWorkspaceTabMenu();try{if(command==='pin')toggleWorkspacePin(id);else if(command==='close'){if(workbench.source==='project')await closeProjectTab(id);else closePersonalTab(id)}else await closeWorkspaceTabs(command,id)}catch(error){toast(error.message)}};
 menu.onkeydown=e=>{const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus()}};
}

function quickOpenDocuments(){return workbench.source==='project'?projectFiles().filter(doc=>['markdown','text','image'].includes(doc.kind)):vault.notes}
function showWorkspaceQuickOpen(){
 modal('Abrir documento',`<label for="quick-open-query">Nome ou caminho</label><input id="quick-open-query" class="field" role="combobox" aria-expanded="true" aria-controls="quick-open-results" aria-autocomplete="list" autocomplete="off" placeholder="Digite para encontrar…"><div id="quick-open-results" class="quick-open-results" role="listbox" aria-label="Documentos disponíveis"></div><p id="quick-open-count" class="empty-small" role="status"></p><p class="empty-small">↑ ↓ escolher · Enter abrir · Esc fechar</p>`);
 const query=$('#quick-open-query'),results=$('#quick-open-results');let docs=[],selected=0,limit=80;
 const select=index=>{selected=Math.max(0,Math.min(docs.length-1,index));for(const [i,button] of [...results.querySelectorAll('[data-quick-open]')].entries()){button.classList.toggle('quick-open-selected',i===selected);button.setAttribute('aria-selected',String(i===selected));button.tabIndex=i===selected?0:-1}if(docs.length){query.setAttribute('aria-activedescendant','quick-document-'+selected);results.children[selected]?.scrollIntoView({block:'nearest'})}else query.removeAttribute('aria-activedescendant')};
 const refresh=()=>{const terms=AmagoDocumentNavigation.normalizeName(query.value).trim().split(/\s+/).filter(Boolean),all=quickOpenDocuments().filter(doc=>terms.every(term=>AmagoDocumentNavigation.normalizeName((doc.title||doc.name)+' '+AmagoLinks.documentPath(doc)).includes(term)));docs=all.slice(0,limit);results.innerHTML=docs.map((doc,i)=>`<button type="button" role="option" id="quick-document-${i}" data-quick-open="${i}"><strong>${esc(doc.title||doc.name)}</strong><small>${esc(AmagoLinks.documentPath(doc))}</small></button>`).join('')||'<p class="empty-small">Nenhum documento encontrado.</p>';$('#quick-open-count').textContent=all.length+' documentos'+(all.length>docs.length?' · mostrando '+docs.length+'; refine o nome ou caminho.':'');select(0)};
 const open=async()=>{const doc=docs[selected];if(!doc)return;const id=doc.path||doc.id;closeModal();try{await openWorkspaceDocument(id)}catch(error){toast(error.message)}};
 query.oninput=refresh;results.onclick=e=>{const button=e.target.closest('[data-quick-open]');if(button){selected=+button.dataset.quickOpen;open()}};
 $('.modal').addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();if(docs.length)select((selected+(e.key==='ArrowDown'?1:docs.length-1))%docs.length)}else if(e.key==='Enter'&&(e.target===query||e.target.closest('[data-quick-open]'))){e.preventDefault();e.stopPropagation();open()}else if(['Home','End'].includes(e.key)&&e.target.closest('[data-quick-open]')){e.preventDefault();select(e.key==='Home'?0:docs.length-1);results.children[selected]?.focus()}});
 refresh();query.focus();
}

function workspaceTreeQuery(){return workspaceNavigation.filters.get(productivityWorkspaceKey())||''}
const workspaceNavigationProjectTree=projectTree;
projectTree=function(entries,depth=0){
 const query=workspaceTreeQuery();if(!query.trim()||depth)return workspaceNavigationProjectTree(entries,depth);
 const filtered=AmagoDocumentNavigation.filterTree(entries,query),expanded=workbench.expanded;workbench.expanded=new Set(expanded);
 for(const entry of flatten(filtered))if(entry.kind==='directory')workbench.expanded.add(entry.path);
 try{return workspaceNavigationProjectTree(filtered,depth)||'<p class="side-empty">Nenhum arquivo corresponde ao filtro.</p>'}finally{workbench.expanded=expanded}
};
const workspaceNavigationVaultTree=vaultTree;
vaultTree=function(){
 const query=workspaceTreeQuery();if(!query.trim())return workspaceNavigationVaultTree();
 const terms=AmagoDocumentNavigation.normalizeName(query).trim().split(/\s+/).filter(Boolean),notes=vault.notes.filter(doc=>terms.every(term=>AmagoDocumentNavigation.normalizeName(AmagoLinks.documentPath(doc)).includes(term))),folders=productivitySort(vault.folders.filter(folder=>notes.some(doc=>doc.folder===folder)).map(name=>({name,kind:'directory'})));
 return folders.map(({name:folder})=>`<div><button class="project-entry" style="--depth:0" data-folder="${esc(folder)}" aria-expanded="true"><span class="tree-chevron expanded">${icon('chevron')}</span>${icon('folder')}<span>${esc(folder)}</span></button>${productivitySort(notes.filter(doc=>doc.folder===folder)).map(doc=>`<button class="project-entry ${doc.id===state.id?'selected':''}" style="--depth:1" data-note="${esc(doc.id)}"><span class="tree-spacer"></span>${icon('note')}<span>${esc(doc.title)}</span></button>`).join('')}</div>`).join('')||'<p class="side-empty">Nenhuma nota corresponde ao filtro.</p>';
};
const workspaceNavigationRenderTree=renderTree;
renderTree=function(){
 workspaceNavigationRenderTree();const toolbar=$('.explorer-sort')||$('.tree-toolbar');if(!toolbar)return;
 const label=document.createElement('div');label.className='workspace-tree-filter';label.innerHTML='<label><span class="sr-only">Filtrar árvore por nome ou caminho</span><input type="search" aria-label="Filtrar árvore por nome ou caminho" placeholder="Filtrar arquivos…" autocomplete="off"></label><button type="button" class="icon-button" aria-label="Limpar filtro" title="Limpar filtro">×</button>';toolbar.after(label);const input=label.querySelector('input');input.value=workspaceTreeQuery();label.querySelector('button').disabled=!input.value;
 const update=value=>{workspaceNavigation.filters.set(productivityWorkspaceKey(),value);renderTree();const current=$('.workspace-tree-filter input');current?.focus();current?.setSelectionRange(value.length,value.length)};
 input.oninput=()=>update(input.value);label.querySelector('button').onclick=()=>update('');input.onkeydown=e=>{if(e.key==='Escape'&&input.value){e.preventDefault();e.stopPropagation();update('')}};
};

async function copyWorkspaceReference(item,kind){
 const text=AmagoDocumentNavigation.referenceText(item.path,kind==='link');
 try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);toast(kind==='link'?'Wikilink copiado.':'Caminho relativo copiado.')}
 catch{modal('Copiar referência',`<p>Selecione e copie com <kbd>Ctrl C</kbd>.</p><input class="field" id="workspace-copy-reference" aria-label="Referência para copiar" readonly value="${esc(text)}">`);const field=$('#workspace-copy-reference');field.focus();field.select()}
 return text;
}
const workspaceNavigationFileMenu=showFileMenu;
showFileMenu=function(row,x,y){
 workspaceNavigationFileMenu(row,x,y);const menu=$('#file-context-menu'),item=fileMenuItem(row);if(!menu||!item)return;
 const container=document.createElement('div');container.className='file-reference-actions';container.innerHTML='<button type="button" role="menuitem" data-reference-copy="path">Copiar caminho relativo</button>'+(!item.folder?'<button type="button" role="menuitem" data-reference-copy="link">Copiar wikilink</button>':'');menu.append(container);
 menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
 menu.addEventListener('click',e=>{const button=e.target.closest('[data-reference-copy]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();removeFileMenu();copyWorkspaceReference(item,button.dataset.referenceCopy)},true);
};

function fragmentHeadingTitle(value){const holder=document.createElement('span');holder.innerHTML=inline(value);return AmagoDocumentNavigation.normalizeName(holder.textContent).replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim()}
function jumpWorkspaceFragment(fragment){
 const current=navigationDocument();if(!current||current.doc.kind==='text')return false;
 const query=fragmentHeadingTitle(fragment),headings=AmagoDocumentNavigation.headings(current.doc.body),heading=headings.find(item=>fragmentHeadingTitle(item.title)===query);
 if(!heading){toast('Título não encontrado neste documento.');return false}
 const editor=navigationEditor(current);if(editor){selectDocumentRange(current,heading);return true}
 const preview=navigationPreview(current),node=[...(preview?.querySelectorAll('h1,h2,h3,h4,h5,h6')||[])].find(item=>item.tagName==='H'+heading.level&&fragmentHeadingTitle(item.textContent)===query);
 if(node){window.dispatchEvent(new CustomEvent('amago-position-intent',{detail:{target:node}}));node.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});node.tabIndex=-1;node.focus({preventScroll:true});return true}
 selectDocumentRange(current,heading);return true;
}
async function followWorkspaceReference(element){
 const project=element.dataset.referenceSpace==='project',raw=element.dataset.followReference,key=productivityWorkspaceKey();
 if(project&&discovery.indexPromise)await discovery.indexPromise;if(key!==productivityWorkspaceKey())return;
 const docs=project?discoveryDocs():vault.notes,source=docs.find(doc=>(doc.path||doc.id)===element.dataset.referenceSource),target=AmagoLinks.resolve(docs,source,raw,{root:project?workbench.project?.root:'',aliases:doc=>AmagoSearch.metadata(doc.body).aliases});
 if(!target){toast('Destino não encontrado. Use a pasta completa quando houver nomes repetidos.');return}
 const id=target.path||target.id;if(workspaceActiveId()!==id&&!(await openWorkspaceDocument(id)))return;
 const fragment=AmagoLinks.targetParts(raw).fragment;if(fragment)jumpWorkspaceFragment(fragment);
}

actions['quick-open']=showWorkspaceQuickOpen;actions['history-back']=()=>navigateWorkspaceHistory(-1);actions['history-forward']=()=>navigateWorkspaceHistory(1);actions['pin-tab']=()=>toggleWorkspacePin();actions['close-other-tabs']=()=>closeWorkspaceTabs('others');actions['close-right-tabs']=()=>closeWorkspaceTabs('right');actions['close-all-tabs']=()=>closeWorkspaceTabs('all');
commandList.push(['Abrir documento pelo nome','quick-open','Ctrl P'],['Voltar ao documento anterior','history-back','Alt ←'],['Avançar no histórico','history-forward','Alt →'],['Fixar ou desafixar aba','pin-tab',''],['Fechar outras abas não fixadas','close-other-tabs',''],['Fechar abas à direita não fixadas','close-right-tabs',''],['Fechar todas as abas não fixadas','close-all-tabs','']);
const workspaceNavigationRenderMain=renderMain;renderMain=function(){workspaceNavigationRenderMain();recordWorkspaceVisit()};
const workspaceNavigationActivatePane=activatePane;activatePane=function(index){workspaceNavigationActivatePane(index);recordWorkspaceVisit()};
window.addEventListener('keydown',e=>{
 if(e.isComposing||$('.modal'))return;
 if($('#workspace-tab-menu')&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();removeWorkspaceTabMenu();return}
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='p'&&!e.shiftKey){e.preventDefault();e.stopImmediatePropagation();showWorkspaceQuickOpen();return}
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='Tab'||e.key==='PageUp'||e.key==='PageDown')){e.preventDefault();e.stopImmediatePropagation();cycleWorkspaceTab(e.key==='PageUp'||e.key==='Tab'&&e.shiftKey?-1:1);return}
 if(e.altKey&&!e.ctrlKey&&!e.metaKey&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();navigateWorkspaceHistory(e.key==='ArrowLeft'?-1:1);return}
 const tab=e.target.closest('#tabbar [data-workspace-tab]');if(tab&&(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')){e.preventDefault();e.stopImmediatePropagation();const rect=tab.getBoundingClientRect();showWorkspaceTabMenu(tab.dataset.workspaceTab,tab,rect.left,rect.bottom)}
},true);
window.addEventListener('contextmenu',e=>{const tab=e.target.closest('#tabbar [data-workspace-tab]');if(!tab)return;e.preventDefault();e.stopImmediatePropagation();showWorkspaceTabMenu(tab.dataset.workspaceTab,tab,e.clientX,e.clientY)},true);
document.addEventListener('click',e=>{const history=e.target.closest('[data-workspace-history]'),options=e.target.closest('[data-workspace-tab-options]');if(history)navigateWorkspaceHistory(+history.dataset.workspaceHistory);if(options){const rect=options.getBoundingClientRect();showWorkspaceTabMenu(workspaceActiveId(),options,rect.left,rect.bottom)}});
window.addEventListener('pointerdown',e=>{if(!e.target.closest('#workspace-tab-menu'))removeWorkspaceTabMenu()},true);
renderTabs();renderTree();recordWorkspaceVisit();
