'use strict';
// Enhancements keep the original vault key and note IDs for a lossless upgrade.
vault.history??={};vault.trash??=[];
let baseline=structuredClone(vault.notes),nativeReady=false;
const basePersist=persist,baseMain=renderMain,baseStats=updateStats,baseOpen=openNote,baseSettings=settings;
function captureVersions(){
 const before=new Map(baseline.map(doc=>[doc.id,doc]));
 for(const current of vault.notes){
  const previous=before.get(current.id);
  const edited=previous&&(current.body!==previous.body||current.title!==previous.title);
  if(!previous||edited||current.updated!==previous.updated||current.favorite!==previous.favorite||current.folder!==previous.folder)noteChanged(current.id);
  if(!edited)continue;
  const versions=vault.history[current.id]??=[];
  const last=versions.at(-1);
  if(!last||Date.now()-new Date(last.savedAt).getTime()>30000)versions.push({...previous,savedAt:stamp()});
  vault.history[current.id]=versions.slice(-20);
 }
 baseline=structuredClone(vault.notes);
}
function saveVaultSnapshot(){
 captureVersions();
 const batch=beginVaultSave();
 basePersist();
 if(window.amagoDesktop&&nativeReady){
  return window.amagoDesktop.save(JSON.stringify(vault)).then(
   result=>{finishVaultSave(batch,true);return result},
   error=>{finishVaultSave(batch,false);throw error}
  );
 }
 finishVaultSave(batch,storageOK);
}
persist=function(){
 const write=saveVaultSnapshot();
 write?.catch(()=>toast('A gravação no disco falhou. Exporte uma cópia nas configurações.'));
};
function taskSourceLines(body){
 const front=body.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/)?.[0]||'',frontLines=front.split('\n').length-(front.endsWith('\n')?1:0);let fence=null,comment=null;
 return body.split(/\r?\n/).map((line,index)=>{
  if(front&&index<frontLines)return '';
  const marker=!comment&&line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if(fence){if(marker&&marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;return ''}
  if(marker){fence=marker[1];return ''}
  let text='';for(let i=0;i<line.length;){
   if(comment){const end=line.indexOf(comment,i);if(end===-1)return text;text+=' '.repeat(end+comment.length-i);i=end+comment.length;comment=null;continue}
   if(line[i]==='\\'&&i+1<line.length){text+=line.slice(i,i+2);i+=2;continue}
   if(line[i]==='`'){const run=line.slice(i).match(/^`+/)[0],end=inlineCodeEnd(line,i+run.length,run);if(end!==-1){text+=line.slice(i,end+run.length);i=end+run.length;continue}}
   if(line.startsWith('<!--',i)){comment='-->';text+='    ';i+=4;continue}
   if(line.startsWith('%%',i)){comment='%%';text+='  ';i+=2;continue}
   text+=line[i++];
  }return text;
 });
}
function tasks(){return vault.notes.flatMap(n=>taskSourceLines(n.body).flatMap((line,i)=>{const m=line.match(/^\s*[-*+] \[([ xX])\]\s+(.+)/);return m?[{note:n,index:i,done:m[1]!==' ',text:m[2].trimEnd()}]:[]}))}
function metrics(){const all=tasks(),edges=new Set();vault.notes.forEach(n=>links(n).forEach(t=>{const target=findTitle(t);if(target&&target.id!==n.id)edges.add([n.id,target.id].sort().join('|'))}));return{all,done:all.filter(t=>t.done).length,edges:edges.size,words:vault.notes.reduce((sum,n)=>sum+n.body.trim().split(/\s+/).filter(Boolean).length,0)}}
function taskRows(items){return items.map(t=>`<div class="orbit-task"><input type="checkbox" aria-label="Concluir ${esc(t.text)}" data-orbit-task="${esc(t.note.id)}" data-line="${t.index}" ${t.done?'checked':''}><button data-note="${esc(t.note.id)}">${esc(t.text)}<small>${esc(t.note.title)}</small></button></div>`).join('')||'<p class="empty-small">Tudo em dia. Tarefas escritas com - [ ] nas notas aparecem aqui.</p>'}
const libraryView={section:'recent',folder:null,expanded:false};
function libraryExcerpt(body){
 const plain=String(body||'').replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/,'').replace(/^`{3,}[^\n]*\n[\s\S]*?^`{3,}[^\n]*$/gm,'');
 return plain.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!/^#{1,6}\s|^[-*+]\s|^!\[/.test(line)).slice(0,1).join('').replace(/^>\s*/,'').replace(/\[\[([^\]]+)\]\]/g,(_,s)=>s.split('|').at(-1)).replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/(\*\*|__|`)/g,'').slice(0,230);
}
function libraryFeatured(doc){
 const excerpt=libraryExcerpt(doc.body);
 return `<button type="button" class="library-feature" data-note="${esc(doc.id)}">
  <span class="library-feature-label">${icon('history')}Última edição</span>
  <strong>${esc(doc.title)}</strong>${excerpt?`<span class="library-excerpt">${esc(excerpt)}</span>`:''}
  <span class="library-feature-foot"><span>${icon('folder')}${esc(doc.folder)}</span><time datetime="${esc(doc.updated)}">${formatDate(doc.updated)}</time></span>
  <span class="library-feature-open" aria-hidden="true">${icon('arrow')}</span>
 </button>`;
}
function libraryNoteRow(doc){
 return `<button class="library-note" data-note="${esc(doc.id)}">
  <span class="library-note-icon">${icon('note')}</span><span class="library-note-name"><strong>${esc(doc.title)}</strong><small>${esc(doc.folder)}</small></span>
  ${doc.favorite?`<span class="library-favorite" aria-label="Favorito">${icon('star')}</span>`:''}
  <time datetime="${esc(doc.updated)}">${formatDate(doc.updated)}</time>
 </button>`;
}
function dashboard(){
 const {section,folder,expanded}=libraryView;
 const sorted=[...vault.notes].sort((a,b)=>new Date(b.updated)-new Date(a.updated));
 const filtered=sorted.filter(doc=>(section!=='favorites'||doc.favorite)&&(!folder||doc.folder===folder));
 const featured=section==='recent'&&!folder?filtered[0]:null;
 const rows=featured?filtered.slice(1):filtered,visible=expanded?rows:rows.slice(0,6);
 const folders=new Map(vault.folders.map(name=>[name,0]));
 for(const doc of sorted)folders.set(doc.folder,(folders.get(doc.folder)||0)+1);
 const pending=tasks().filter(task=>!task.done);
 $('#crumb-folder').textContent='Biblioteca';
 $('#main').innerHTML=`<section class="library-page" aria-label="Minha biblioteca"><div class="library-shell">
  <header class="library-header"><div><h1>Minha biblioteca</h1><p>${sorted.length} ${sorted.length===1?'documento':'documentos'} <span aria-hidden="true">·</span> ${folders.size} ${folders.size===1?'pasta':'pastas'}</p></div>
   <div class="library-actions"><button class="plain-button" data-action="templates">${icon('layers')}Modelos</button><button class="solid-button" data-action="new">${icon('plus')}Nova nota</button></div>
  </header>
  <div class="library-columns"><section class="library-documents" aria-label="Documentos da biblioteca">
   <div class="library-switcher" aria-label="Seleção de documentos"><button type="button" data-library-section="recent" aria-pressed="${section==='recent'}">${icon('history')}Recentes</button><button type="button" data-library-section="favorites" aria-pressed="${section==='favorites'}">${icon('star')}Favoritos</button></div>
   ${folder?`<button type="button" class="library-filter" data-library-clear title="Limpar filtro de pasta">${icon('folder')}<span>${esc(folder)}</span>${icon('close')}</button>`:''}
   ${featured?libraryFeatured(featured):''}
   ${visible.map(libraryNoteRow).join('')}
   ${!filtered.length?`<p class="library-empty">${folder?'Nenhum documento nesta seleção.':section==='favorites'?'Marque a estrela de um documento para encontrá-lo aqui.':'Sua biblioteca ainda está vazia.'}</p>`:''}
   ${rows.length>6?`<button type="button" class="library-more" data-library-expand aria-expanded="${expanded}">${expanded?'Mostrar menos':'Ver todos os '+filtered.length+' documentos'}</button>`:''}
  </section><aside class="library-aside" aria-label="Organização da biblioteca">
   <section class="library-panel"><header><h2>Pastas</h2><button type="button" class="icon-button" data-action="folder" title="Criar pasta" aria-label="Criar pasta">${icon('folder-plus')}</button></header>
    <div class="library-folders">${[...folders].map(([name,count])=>`<button type="button" data-library-folder="${esc(name)}" aria-pressed="${folder===name}"><span class="library-folder-icon">${icon(folder===name?'folder-open':'folder')}</span><span>${esc(name)}</span><small>${count}</small></button>`).join('')||'<p class="library-empty">Nenhuma pasta.</p>'}</div>
   </section>
   <section class="library-panel"><header><h2>Tarefas pendentes</h2><button type="button" class="library-link" data-view="tasks">Ver todas</button></header>
    <div class="library-tasks">${pending.length?taskRows(pending.slice(0,3)):'<p class="library-empty">Todas as tarefas estão concluídas.</p>'}</div>
   </section>
   <button type="button" class="library-map-link" data-view="graph">${icon('graph')}<span>Mapa de conexões</span>${icon('chevron')}</button>
  </aside></div></div></section>`;
 const page=$('.library-page');
 page.onclick=event=>{
  const button=event.target.closest('[data-library-section],[data-library-folder],[data-library-clear],[data-library-expand]');if(!button)return;
  if(button.hasAttribute('data-library-section'))libraryView.section=button.dataset.librarySection;
  if(button.hasAttribute('data-library-folder'))libraryView.folder=libraryView.folder===button.dataset.libraryFolder?null:button.dataset.libraryFolder;
  if(button.hasAttribute('data-library-clear'))libraryView.folder=null;
  libraryView.expanded=button.hasAttribute('data-library-expand')&&!expanded;
  const scroll=page.scrollTop;dashboard();const next=$('.library-page');next.scrollTop=scroll;
  const matching=[...next.querySelectorAll('button')].find(el=>el.getAttribute('data-library-section')===button.dataset.librarySection||el.getAttribute('data-library-folder')===button.dataset.libraryFolder||button.hasAttribute('data-library-expand')&&el.hasAttribute('data-library-expand'));
  (matching||next.querySelector('[aria-pressed=true]'))?.focus({preventScroll:true});
 };
}
function allNotes(){const ns=[...vault.notes].sort((a,b)=>new Date(b.updated)-new Date(a.updated));$('#crumb-folder').textContent='Todas as notas';$('#main').innerHTML=`<section class="collection"><div class="eyebrow">ACERVO PESSOAL / ${ns.length} REGISTROS</div><h1>Todas as notas</h1><p class="collection-description">Seus pensamentos, ordenados pela última edição.</p><div class="note-grid">${ns.map(n=>`<button class="note-card" data-note="${esc(n.id)}">${icon('note')}<h3>${esc(n.title)}</h3><p>${esc(n.body.slice(0,230).replace(/[#*`>]/g,''))}</p><span class="tag-chip">${esc(n.folder)}</span></button>`).join('')}</div></section>`}
function toolbar(){const editor=$('#editor');if(!editor)return;const bar=document.createElement('div');bar.className='format-toolbar';bar.innerHTML='<button data-format="bold" title="Negrito">B</button><button data-format="italic" title="Itálico"><i>I</i></button><button data-format="heading">H2</button><button data-format="task">☑ Tarefa</button><button data-format="link">[[ Conexão ]]</button><button data-action="templates">Modelos</button>';editor.before(bar);if(state.mode==='split'){bar.style.gridColumn='1 / -1';$('.split-content').prepend(bar)}}
function wireGraph(){const box=$('.graph-large');if(!box)return;const svg=box.querySelector('svg');let zoom=1,x=0,y=0,drag=null;const apply=()=>svg.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;const controls=document.createElement('div');controls.className='graph-controls';controls.innerHTML='<button aria-label="Diminuir zoom">−</button><button aria-label="Centralizar mapa">1:1</button><button aria-label="Aumentar zoom">+</button>';box.append(controls);const buttons=controls.querySelectorAll('button');buttons[0].onclick=()=>{zoom=Math.max(.5,zoom-.2);apply()};buttons[1].onclick=()=>{zoom=1;x=0;y=0;apply()};buttons[2].onclick=()=>{zoom=Math.min(3,zoom+.2);apply()};box.onwheel=e=>{e.preventDefault();zoom=Math.min(3,Math.max(.5,zoom-e.deltaY*.001));apply()};box.onpointerdown=e=>{if(e.target.closest('circle,button'))return;drag={x:e.clientX-x,y:e.clientY-y};box.setPointerCapture(e.pointerId)};box.onpointermove=e=>{if(drag){x=e.clientX-drag.x;y=e.clientY-drag.y;apply()}};box.onpointerup=()=>drag=null;box.onpointercancel=()=>drag=null}
renderMain=function(){if(state.view==='home'){dashboard();return}if(state.view==='all'){allNotes();return}if(state.view==='tasks'){$('#crumb-folder').textContent='Tarefas';const m=metrics();$('#main').innerHTML=`<section class="collection"><div class="eyebrow">DA IDEIA À AÇÃO</div><h1>Um passo de cada vez.</h1><p class="collection-description">${m.all.length-m.done} pendentes · ${m.done} concluídas. Cada tarefa permanece conectada à sua nota.</p><section class="orbit-section">${taskRows(m.all.filter(t=>!t.done))}</section><details class="orbit-section"><summary>Concluídas (${m.done})</summary>${taskRows(m.all.filter(t=>t.done))}</details></section>`;return}baseMain();if(state.view==='graph')wireGraph();if(state.view==='notes'&&!state.tag){toolbar();const tools=$('.note-tools');tools?.insertAdjacentHTML('beforeend',`<button class="icon-button" data-action="history" aria-label="Histórico da nota" title="Histórico">${icon('calendar')}</button><button class="icon-button" data-action="focus" aria-label="Modo foco" title="Modo foco">${icon('focus')}</button>`);const pane=$('.note-main');if(pane){const progress=document.createElement('div');progress.className='reading-track';progress.innerHTML='<span></span>';pane.prepend(progress);pane.addEventListener('scroll',()=>{progress.style.top=pane.scrollTop+'px';progress.firstElementChild.style.width=100*pane.scrollTop/Math.max(1,pane.scrollHeight-pane.clientHeight)+'%'},{passive:true})}const n=note(),related=vault.notes.filter(x=>x.id!==n.id&&x.tags.some(t=>n.tags.includes(t))).slice(0,3);if(related.length)$('.context-panel')?.insertAdjacentHTML('beforeend',`<section class="panel-section"><h3 class="context-title">${icon('tag')}Afinidades por tag</h3>${related.map(x=>`<button class="backlink" data-note="${esc(x.id)}">${icon('note')}${esc(x.title)}</button>`).join('')}</section>`)}};
openNote=function(id){baseOpen(id);sessionStorage.setItem('amago-last-note',id)};
function uniqueTitle(base){let title=base,i=2;while(findTitle(title))title=base+' '+i++;return title}
const templates=[{name:'Projeto',description:'Objetivo, próximos passos e decisões.',body:'## Objetivo\n\nO que quero transformar?\n\n## Próximos passos\n\n- [ ] Definir o resultado esperado\n- [ ] Dar o primeiro passo\n\n## Decisões\n\n## Referências\n'},{name:'Reunião',description:'Pauta, decisões e responsabilidades.',body:'## Contexto\n\nData: '+new Date().toLocaleDateString('pt-BR')+'\nParticipantes: \n\n## Pauta\n\n- \n\n## Decisões\n\n## Ações\n\n- [ ] Registrar responsáveis e prazos\n'},{name:'Leitura',description:'Síntese, ideias e conexões.',body:'## Fonte\n\nTítulo e autoria: \n\n## Em poucas palavras\n\n## Ideias que ficam\n\n- \n\n## Conexões\n\nComo isso conversa com o que já sei?\n'},{name:'Revisão semanal',description:'Reconheça avanços e escolha o próximo passo.',body:'## O que avançou\n\n## O que aprendi\n\n## O que posso soltar\n\n## Próxima semana\n\n- [ ] Escolher uma prioridade\n'}];
actions.templates=()=>{modal('Um ponto de partida',`<p>Escolha uma estrutura. Depois, faça dela sua.</p><div class="template-grid">${templates.map((t,i)=>`<button data-template="${i}"><strong>${esc(t.name)}</strong><small>${esc(t.description)}</small></button>`).join('')}</div>`)};
actions.focus=()=>{if(state.view!=='notes'||state.tag){state.view='notes';state.tag=null;render()}document.body.classList.toggle('focus-mode')};
actions.history=()=>{persist();const versions=vault.history[note().id]||[];modal('Memória da nota',`<p>Até 20 versões anteriores. Edições próximas são agrupadas em intervalos de 30 segundos.</p>${[...versions].reverse().map((v,i)=>`<div class="version-row"><div><strong>${esc(v.title)}</strong><p>${new Date(v.savedAt).toLocaleString('pt-BR')}</p></div><button class="plain-button" data-version="${versions.length-1-i}">Inspecionar</button></div>`).join('')||'<p>Nenhuma edição anterior. O histórico começa quando você altera esta nota.</p>'}`)};
actions['delete-note']=()=>{const n=note();modal('Enviar para a lixeira?',`<p>“${esc(n.title)}” poderá ser restaurada na lixeira.</p><div class="modal-actions"><button class="plain-button" data-action="close">Cancelar</button><button class="solid-button" id="move-trash">Enviar para a lixeira</button></div>`);$('#move-trash').onclick=()=>{vault.trash.push({...structuredClone(n),deletedAt:stamp()});vault.notes=vault.notes.filter(x=>x.id!==n.id);state.tabs=state.tabs.filter(id=>id!==n.id);if(!vault.notes.length)vault.notes.push({id:uid(),title:'Novo começo',folder:vault.folders[0],tags:[],body:'',favorite:false,created:stamp(),updated:stamp()});state.id=vault.notes[0].id;persist();closeModal();state.view='home';render();toast('Nota guardada na lixeira.') }};
actions.trash=()=>{modal('Lixeira',`<p>Suas notas permanecem aqui até você restaurá-las.</p>${vault.trash.map(n=>`<div class="version-row"><div><strong>${esc(n.title)}</strong><p>${formatDate(n.deletedAt)}</p></div><button class="plain-button" data-restore="${esc(n.id)}">Restaurar</button></div>`).join('')||'<p>A lixeira está vazia.</p>'}`)};
actions.duplicate=()=>{const n={...structuredClone(note()),id:uid(),title:uniqueTitle(note().title+' — cópia'),created:stamp(),updated:stamp()};vault.notes.push(n);persist();closeModal();openNote(n.id)};
actions.settings=()=>{baseSettings();$('.modal-body').insertAdjacentHTML('beforeend',`<div class="backup-actions"><button class="plain-button" data-action="trash">Lixeira (${vault.trash.length})</button>${window.amagoDesktop?'<button class="plain-button" data-action="data-folder">Abrir pasta de dados</button>':''}</div><p>${window.amagoDesktop?'Windows: o espaço é gravado em vault.json. A primeira gravação de cada dia preserva a cópia anterior na pasta backups.':'Web: o espaço fica neste navegador. Use Exportar espaço para transferir suas notas ao aplicativo Windows.'}</p>`)};
actions['data-folder']=()=>window.amagoDesktop?.openDataFolder();
const commandList=[['Nova nota','new','Ctrl N'],['Buscar nas notas','search','Ctrl K'],['Nota do dia','daily',''],['Usar modelo','templates',''],['Modo foco','focus',''],['Histórico desta nota','history',''],['Duplicar nota','duplicate',''],['Exportar espaço','backup',''],['Importar notas','import',''],['Lixeira','trash',''],['Configurações','settings','']];
actions.commands=()=>{modal('O que você quer fazer?',`<input class="field" id="command-query" aria-label="Filtrar comandos" placeholder="Digite um comando…"><div id="command-list"></div>`);const refresh=()=>{const q=$('#command-query').value.toLocaleLowerCase();$('#command-list').innerHTML=commandList.filter(c=>c[0].toLocaleLowerCase().includes(q)).map(c=>`<button class="search-result" data-command="${c[1]}">${icon('chevron')}<strong>${c[0]}</strong><kbd class="command-shortcut">${c[2]||'↵'}</kbd></button>`).join('')||'<p class="empty-small">Nenhum comando encontrado.</p>'};$('#command-query').oninput=refresh;$('#command-query').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#command-list button')?.click()}};refresh();$('#command-query').focus()};
document.addEventListener('click',e=>{const target=e.target.closest('[data-template],[data-orbit-task],[data-restore],[data-version],[data-command],[data-format]');if(!target)return;
if(target.dataset.command){const action=target.dataset.command;closeModal();actions[action]?.()}
if(target.dataset.template!==undefined){const t=templates[+target.dataset.template],n={id:uid(),title:uniqueTitle(t.name),body:t.body,folder:note()?.folder||vault.folders[0],tags:[t.name.toLocaleLowerCase().replaceAll(' ','-')],favorite:false,created:stamp(),updated:stamp()};vault.notes.push(n);persist();closeModal();state.mode='edit';openNote(n.id)}
if(target.dataset.restore){const n=vault.trash.find(x=>x.id===target.dataset.restore);if(!n)return;vault.trash=vault.trash.filter(x=>x!==n);n.title=uniqueTitle(n.title);n.updated=stamp();if(!vault.folders.includes(n.folder))vault.folders.push(n.folder);state.openFolders.add(n.folder);vault.notes.push(n);persist();closeModal();openNote(n.id);toast('Nota restaurada.')}
if(target.dataset.version!==undefined){const n=note(),v=vault.history[n.id][+target.dataset.version];modal('Versão anterior',`<p>${new Date(v.savedAt).toLocaleString('pt-BR')} · ${esc(v.title)}</p><pre class="editor" style="min-height:150px;max-height:300px;overflow:auto;white-space:pre-wrap">${esc(v.body)}</pre><div class="modal-actions"><button class="plain-button" data-action="history">Voltar</button><button class="solid-button" id="restore-version">Restaurar conteúdo</button></div>`);$('#restore-version').onclick=()=>{vault.history[n.id].push({...structuredClone(n),savedAt:stamp()});n.body=v.body;n.updated=stamp();baseline=structuredClone(vault.notes);vault.history[n.id]=vault.history[n.id].slice(-20);persist();closeModal();state.view='notes';render();toast('Conteúdo restaurado. A versão substituída foi preservada.')}}
if(target.dataset.format)formatSourceEditor(target.dataset.format,target.closest('.format-toolbar')?.amagoEditor);
});
document.addEventListener('change',e=>{if(e.target.dataset.orbitTask){const n=vault.notes.find(n=>n.id===e.target.dataset.orbitTask),lines=n.body.split('\n'),i=+e.target.dataset.line;lines[i]=lines[i].replace(/\[[ xX]\]/,e.target.checked?'[x]':'[ ]');n.body=lines.join('\n');n.updated=stamp();persist();renderMain()}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();actions.commands()}if(e.key==='Escape'&&document.body.classList.contains('focus-mode'))document.body.classList.remove('focus-mode')});
document.querySelector('.primary-nav').insertAdjacentHTML('afterbegin',`<button data-view="home" class="nav-item">${icon('home')}Central</button>`);
document.querySelector('[data-view="notes"]').dataset.view='all';
document.querySelector('.primary-nav').insertAdjacentHTML('beforeend',`<button data-view="tasks" class="nav-item">${icon('check')}Tarefas</button>`);
document.querySelector('.header-right').insertAdjacentHTML('afterbegin',`<button class="plain-button" data-action="commands" title="Comandos — Ctrl Shift P">${icon('commands')}<span>Comandos</span></button>`);
document.body.insertAdjacentHTML('beforeend','<button class="floating-focus" data-action="focus">Sair do foco · Esc</button>');
$('.beta').textContent='2.3';$('.brand').onclick=e=>{e.preventDefault();state.view='home';state.tag=null;render()};
async function initialize(){if(window.amagoDesktop){try{const loaded=await window.amagoDesktop.load();if(loaded.error){toast(loaded.error);state.view='home';render();return}if(loaded.data&&Array.isArray(loaded.data.notes)&&loaded.data.notes.length&&Array.isArray(loaded.data.folders)){vault=loaded.data;vault.history??={};vault.trash??=[];state.id=vault.notes[0].id;state.tabs=[state.id];state.openFolders=new Set(vault.folders);baseline=structuredClone(vault.notes)}nativeReady=true}catch{toast('Não foi possível abrir o arquivo local. Exporte uma cópia antes de fechar.')}}state.view='home';render();persist();window.amagoReady=true;window.dispatchEvent(new Event('amago-ready'))}
if(window.amagoDesktop)$('.bottom-row>span').innerHTML='<i class="online-dot"></i>Espaço local · Windows';
const refinedMain=renderMain;
renderMain=function(){refinedMain();if(state.view!=='notes'||state.tag){const m=metrics();$('#connection-count').textContent=m.edges+' conexões no espaço';$('#word-count').textContent=m.words.toLocaleString('pt-BR')+' palavras no espaço';$('#reading-time').textContent=vault.notes.length+' notas'}};
window.amagoFlush=async()=>{await saveVaultSnapshot();if(!storageOK&&!(window.amagoDesktop&&nativeReady))throw Error('Falha ao salvar as alterações locais.')};
initialize();
