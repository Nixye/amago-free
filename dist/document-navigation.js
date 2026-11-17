'use strict';
const documentFind={open:false,replace:false,query:'',replacement:'',caseSensitive:false,key:null,index:-1,matches:[],total:0,review:null,undo:null,message:''};

function navigationDocument(){
 const pane=multiActive()?studio.panes[studio.active]:null;
 const doc=pane?paneDocument(pane):workbench.source==='project'&&state.view==='project'?workbench.file:workbench.source==='vault'&&state.view==='notes'&&!state.tag?note():null;
 if(!doc||typeof doc.body!=='string')return null;
 const project=pane?pane.source==='project':workbench.source==='project';
 return {doc,project,pane,index:pane?studio.active:null,key:project?'project:'+workbench.project?.root+':'+doc.path:'vault:'+doc.id};
}
function navigationEditor(target=navigationDocument()){
 if(!target)return null;
 return target.pane?document.querySelector(`[data-pane-editor="${target.index}"]`):document.querySelector(target.project?'#project-editor':'#editor');
}
function navigationPreview(target=navigationDocument()){
 if(!target)return null;
 return target.pane?document.querySelector(`[data-pane="${target.index}"] .pane-preview`):document.querySelector(target.project?'#project-preview':'#preview');
}
function navigationEnsureEditor(target,editing=false){
 let editor=navigationEditor(target);
 if(editor&&editing&&editor.readOnly&&typeof documentFocus!=='undefined'&&documentFocus.active){documentFocus.textRead=false;refreshFocus()}
 if(editor)return editing&&editor.readOnly?null:editor;
 if(target.pane)target.pane.mode='edit';else if(target.project)workbench.mode='edit';else state.mode='edit';
 renderMain();return navigationEditor(target);
}
function closeDocumentFind(){documentFind.open=false;documentFind.review=null;document.querySelector('#document-find-panel')?.remove()}
function openDocumentFind(replace=false){
 const target=navigationDocument();if(!target){toast('Abra uma nota ou arquivo de texto para buscar.');return}
 const editor=navigationEditor(target),selected=editor?.value.slice(editor.selectionStart,editor.selectionEnd);
 if(selected&&selected.length<=200&&!selected.includes('\n'))documentFind.query=selected;
 documentFind.open=true;documentFind.replace=replace;documentFind.index=-1;documentFind.review=null;documentFind.message='';
 mountDocumentFind();const input=document.querySelector('#document-find-query');input.focus();input.select();
}
function mountDocumentFind(){
 if(!documentFind.open)return;
 const target=navigationDocument();if(!target){closeDocumentFind();return}
 let panel=document.querySelector('#document-find-panel');
 if(!panel){panel=document.createElement('section');panel.id='document-find-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','Buscar e substituir no documento');document.body.append(panel);
  panel.innerHTML=`<header><strong id="document-find-title"></strong><button type="button" class="icon-button" data-document-find="close" aria-label="Fechar busca no documento" title="Fechar · Esc">${icon('close')}</button></header><label class="document-find-field"><span>Buscar no Markdown ou texto</span><input class="field" id="document-find-query" type="search" autocomplete="off" spellcheck="false"></label><div class="document-find-options"><label><input type="checkbox" id="document-find-case">Distinguir maiúsculas</label><button type="button" class="plain-button" data-document-find="toggle-replace">Substituir</button></div><div class="document-find-navigation"><span id="document-find-count" role="status" aria-live="polite"></span><button type="button" class="plain-button" data-document-find="previous" aria-label="Ocorrência anterior" title="Anterior · Shift Enter">↑</button><button type="button" class="plain-button" data-document-find="next" aria-label="Próxima ocorrência" title="Próxima · Enter">↓</button></div><div id="document-replace-controls"><label class="document-find-field"><span>Substituir por</span><input class="field" id="document-replace-value" autocomplete="off" spellcheck="false"></label><div class="document-replace-actions"><button type="button" class="plain-button" data-document-find="replace">Substituir atual</button><button type="button" class="plain-button" data-document-find="review">Substituir todas…</button><button type="button" class="plain-button" data-document-find="undo">Desfazer substituição</button></div></div><div id="document-replace-review" role="status"></div><p id="document-find-message" role="status" aria-live="polite"></p><small>Busca literal. Enter seleciona a ocorrência na edição de origem.</small>`;
  panel.querySelector('#document-find-query').value=documentFind.query;panel.querySelector('#document-replace-value').value=documentFind.replacement;panel.querySelector('#document-find-case').checked=documentFind.caseSensitive;
  panel.addEventListener('input',e=>{if(e.target.id==='document-find-query')documentFind.query=e.target.value;if(e.target.id==='document-replace-value')documentFind.replacement=e.target.value;if(e.target.id==='document-find-case')documentFind.caseSensitive=e.target.checked;documentFind.index=-1;documentFind.review=null;documentFind.message='';refreshDocumentFind()});
  panel.addEventListener('click',e=>{const button=e.target.closest('[data-document-find]');if(!button)return;const command=button.dataset.documentFind;
   if(command==='close'){closeDocumentFind();navigationEditor()?.focus();return}
   if(command==='toggle-replace'){documentFind.replace=!documentFind.replace;documentFind.review=null;refreshDocumentFind();return}
   if(command==='previous'||command==='next'){navigateDocumentMatch(command==='previous'?-1:1);return}
   if(command==='replace')replaceDocumentMatch();if(command==='review')reviewDocumentReplace();if(command==='apply')applyDocumentReplace();if(command==='cancel'){documentFind.review=null;refreshDocumentFind()}if(command==='undo')undoDocumentReplace();
  });
 }
 refreshDocumentFind();
}
function refreshDocumentFind(){
 const panel=document.querySelector('#document-find-panel'),target=navigationDocument();if(!panel||!target)return;
 if(documentFind.key!==target.key){documentFind.key=target.key;documentFind.index=-1;documentFind.review=null;documentFind.message=''}
 const found=AmagoDocumentNavigation.find(target.doc.body,documentFind.query,documentFind.caseSensitive);
 documentFind.matches=found.matches;documentFind.total=found.total;documentFind.index=Math.min(documentFind.index,found.matches.length-1);
 panel.querySelector('#document-find-title').textContent=target.doc.title||target.doc.name||'Documento';
 panel.querySelector('#document-find-count').textContent=(!documentFind.query?'Digite para buscar':!found.total?'Nenhuma ocorrência':documentFind.index<0?`${found.total} ocorrência${found.total===1?'':'s'}`:`${documentFind.index+1} de ${found.total}`)+(found.truncated?' · navegação nas primeiras 5.000':'');
 panel.querySelector('#document-replace-controls').hidden=!documentFind.replace;
 panel.querySelector('[data-document-find="toggle-replace"]').setAttribute('aria-expanded',String(documentFind.replace));
 for(const command of ['previous','next','replace','review'])panel.querySelector(`[data-document-find="${command}"]`).disabled=!found.total;
 panel.querySelector('[data-document-find="undo"]').disabled=!(documentFind.undo?.key===target.key&&documentFind.undo.after===target.doc.body);
 const review=panel.querySelector('#document-replace-review');review.hidden=!documentFind.review;
 review.innerHTML=documentFind.review?`<p>Substituir <strong>${documentFind.review.count}</strong> ocorrência${documentFind.review.count===1?'':'s'} em <strong>${esc(target.doc.title||target.doc.name)}</strong>?</p><p>“${esc(documentFind.review.query)}” → “${esc(documentFind.review.replacement||'(vazio)')}”</p><button type="button" class="solid-button" data-document-find="apply">Aplicar substituições</button><button type="button" class="plain-button" data-document-find="cancel">Cancelar</button>`:'';
 panel.querySelector('#document-find-message').textContent=documentFind.message;
}
function selectDocumentRange(target,range){
 const editor=navigationEnsureEditor(target);if(!editor)return;
 window.dispatchEvent(new CustomEvent('amago-position-intent',{detail:{target:editor}}));
 editor.focus({preventScroll:true});editor.setSelectionRange(range.start,range.end);
 const line=editor.value.slice(0,range.start).split('\n').length-1;
 const lineHeight=parseFloat(getComputedStyle(editor).lineHeight)||22;
 editor.scrollTop=Math.max(0,line*lineHeight-editor.clientHeight/3);
 editor.dispatchEvent(new Event('select',{bubbles:true}));
}
function navigateDocumentMatch(direction=1){
 refreshDocumentFind();const target=navigationDocument(),matches=documentFind.matches;if(!target||!matches.length)return;
 documentFind.index=documentFind.index<0?(direction<0?matches.length-1:0):(documentFind.index+direction+matches.length)%matches.length;
 const index=documentFind.index;selectDocumentRange(target,matches[index]);documentFind.index=index;refreshDocumentFind();
}
function writeNavigationDocument(target,text,selection){
 const editor=navigationEnsureEditor(target,true);if(!editor||navigationDocument()?.key!==target.key)return false;
 editor.value=text;editor.dispatchEvent(new Event('input',{bubbles:true}));
 // Input handlers keep project drafts, save baselines, histories and previews owned by the existing editor.
 if(selection){editor.focus({preventScroll:true});editor.setSelectionRange(selection.start,selection.end)}
 closeCompletion();return true;
}
function replaceDocumentMatch(){
 refreshDocumentFind();const target=navigationDocument();if(!target||!documentFind.matches.length)return;
 if(documentFind.index<0)documentFind.index=0;
 const range=documentFind.matches[documentFind.index],before=target.doc.body;
 const change=AmagoDocumentNavigation.replaceAt(before,documentFind.query,documentFind.replacement,range,documentFind.caseSensitive);if(!change)return;
 if(writeNavigationDocument(target,change.text,{start:change.start,end:change.end})){documentFind.undo={key:target.key,before,after:change.text};documentFind.review=null;documentFind.index=-1;documentFind.message='Ocorrência substituída. O salvamento segue o documento.';refreshDocumentFind();const next=documentFind.matches.findIndex(match=>match.start>=change.end);documentFind.index=next>=0?next:documentFind.matches.length?0:-1;if(documentFind.index>=0)selectDocumentRange(target,documentFind.matches[documentFind.index]);refreshDocumentFind()}
}
function reviewDocumentReplace(){
 refreshDocumentFind();const target=navigationDocument();if(!target||!documentFind.total)return;
 documentFind.review={key:target.key,body:target.doc.body,query:documentFind.query,replacement:documentFind.replacement,caseSensitive:documentFind.caseSensitive,count:documentFind.total};documentFind.message='';refreshDocumentFind();
}
function applyDocumentReplace(){
 const target=navigationDocument(),review=documentFind.review;if(!target||!review)return;
 if(target.key!==review.key||target.doc.body!==review.body){documentFind.review=null;documentFind.message='O documento mudou. Revise as substituições novamente.';refreshDocumentFind();return}
 const result=AmagoDocumentNavigation.replaceAll(review.body,review.query,review.replacement,review.caseSensitive);
 if(writeNavigationDocument(target,result.text)){documentFind.undo={key:target.key,before:review.body,after:result.text};documentFind.review=null;documentFind.index=-1;documentFind.message=`${result.count} substituições aplicadas.${target.project?' Use Ctrl S para salvar o arquivo.':''}`;refreshDocumentFind()}
}
function undoDocumentReplace(){
 const target=navigationDocument(),undo=documentFind.undo;if(!target||!undo||undo.key!==target.key||target.doc.body!==undo.after)return;
 if(writeNavigationDocument(target,undo.before)){documentFind.undo=null;documentFind.index=-1;documentFind.review=null;documentFind.message='Substituição desfeita.';refreshDocumentFind()}
}

function showDocumentOutline(){
 const target=navigationDocument();if(!target){toast('Abra uma nota Markdown para ver o sumário.');return}
 if(target.doc.kind==='text'){toast('O sumário está disponível para documentos Markdown.');return}
 const body=target.doc.body,headings=AmagoDocumentNavigation.headings(body);
 modal('Sumário do documento',`<p>${esc(target.doc.title||target.doc.name)} · ${headings.length} títulos</p><nav class="document-outline" aria-label="Títulos do documento">${headings.map((heading,index)=>`<button type="button" data-document-heading="${index}" style="--heading-depth:${heading.level-1}"><span>H${heading.level}</span><strong>${esc(heading.title)}</strong><small>Linha ${heading.line}</small></button>`).join('')||'<p class="empty-small">Nenhum título. Use # até ###### no início de uma linha.</p>'}</nav>`);
 document.querySelector('.document-outline').addEventListener('click',e=>{const button=e.target.closest('[data-document-heading]');if(!button)return;
  const current=navigationDocument();if(!current||current.key!==target.key){closeModal();toast('O documento ativo mudou. Abra o sumário novamente.');return}
  if(current.doc.body!==body){showDocumentOutline();toast('O documento mudou. O sumário foi atualizado.');return}
  const heading=headings[+button.dataset.documentHeading];closeModal();
  const editor=navigationEditor(current);if(editor){selectDocumentRange(current,heading);return}
  const preview=navigationPreview(current),nodes=[...(preview?.querySelectorAll('h1,h2,h3,h4,h5,h6')||[])];
  const label=document.createElement('span');label.innerHTML=inline(heading.title);const title=label.textContent.trim();
  const candidates=nodes.filter(node=>node.tagName==='H'+heading.level&&node.textContent.trim()===title),rank=headings.slice(0,+button.dataset.documentHeading).filter(item=>item.level===heading.level&&item.title===heading.title).length;
  const node=candidates[rank];if(node){window.dispatchEvent(new CustomEvent('amago-position-intent',{detail:{target:node}}));node.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});node.setAttribute('tabindex','-1');node.focus({preventScroll:true});node.classList.add('document-heading-target');setTimeout(()=>node.classList.remove('document-heading-target'),1500)}else selectDocumentRange(current,heading);
 });
}
actions['find-document']=()=>openDocumentFind(false);actions['replace-document']=()=>openDocumentFind(true);actions['document-outline']=showDocumentOutline;
commandList.push(['Buscar no documento','find-document','Ctrl F'],['Substituir no documento','replace-document','Ctrl H'],['Sumário do documento','document-outline','']);
function mountDocumentNavigation(){
 const target=navigationDocument();if(!target){closeDocumentFind();return}
 const host=document.querySelector('.split-workspace-heading,.project-document-toolbar,.document-toolbar');
 if(host&&!host.querySelector('.document-navigation-tools')){const tools=document.createElement('div');tools.className='document-navigation-tools';tools.innerHTML=`<button type="button" class="icon-button" data-action="find-document" aria-label="Buscar no documento" title="Buscar no documento · Ctrl F">${icon('search')}</button><button type="button" class="plain-button" data-action="document-outline" ${target.doc.kind==='text'?'hidden':''}>Sumário</button>`;host.append(tools)}
 mountDocumentFind();
}
const documentNavigationRenderMain=renderMain;renderMain=function(){documentNavigationRenderMain();mountDocumentNavigation()};
const documentNavigationActivatePane=activatePane;activatePane=function(index){documentNavigationActivatePane(index);refreshDocumentFind()};
document.addEventListener('input',e=>{if(e.target.matches('#editor,#project-editor,[data-pane-editor]')||e.target.closest('.visual-block')){documentFind.review=null;documentFind.index=-1;refreshDocumentFind()}});
window.addEventListener('keydown',e=>{
 if(e.isComposing)return;
 if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&['f','h'].includes(e.key.toLowerCase())&&!document.querySelector('.modal')){if(!navigationDocument())return;e.preventDefault();e.stopImmediatePropagation();openDocumentFind(e.key.toLowerCase()==='h');return}
 if(!documentFind.open)return;
 if(e.key==='Escape'&&!document.querySelector('.modal')){e.preventDefault();e.stopImmediatePropagation();closeDocumentFind();navigationEditor()?.focus();return}
 if(e.key==='Enter'&&e.target.closest('#document-find-panel')&&!e.target.matches('button')){e.preventDefault();e.stopImmediatePropagation();navigateDocumentMatch(e.shiftKey?-1:1);document.querySelector('#document-find-query')?.focus({preventScroll:true})}
},true);
mountDocumentNavigation();
