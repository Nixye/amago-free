'use strict';

// Focus keeps the existing document/editor alive, including unsaved project drafts.
const documentFocus={active:false,fullscreen:false,ownsFullscreen:false,busy:false,returnFocus:null,textRead:false,exitRequested:false};
function focusDocument(){
 if(multiActive())return paneDocument(studio.panes[studio.active]);
 if(workbench.source==='project')return state.view==='project'?workbench.file:null;
 return state.view==='notes'&&!state.tag?note():null;
}
function focusPreferences(){
 const prefs=interfacePrefs();prefs.focus??={};
 return {size:Math.max(10,Math.min(48,Number(prefs.focus.size)||18)),width:['comfortable','wide','full'].includes(prefs.focus.width)?prefs.focus.width:'full'};
}
function applyFocusPreferences(){
 const prefs=focusPreferences();document.body.style.setProperty('--focus-font-size',prefs.size+'px');document.body.dataset.focusWidth=prefs.width;
 const width=$('.focus-width-choice');if(width)width.value=prefs.width;
}
function focusMode(){
 if(multiActive())return studio.panes[studio.active].mode;
 if(workbench.source==='project')return workbench.file?.kind==='text'?(documentFocus.textRead?'read':'edit'):workbench.mode;
 return state.mode;
}
function focusActiveEditor(){return multiActive()?document.querySelector(`[data-pane-editor="${studio.active}"]`):$('#editor,#project-editor')}
function focusToolbar(){
 let bar=$('#focus-toolbar');
 if(!bar){bar=document.createElement('header');bar.id='focus-toolbar';bar.className='focus-toolbar';bar.setAttribute('aria-label','Controles do modo foco');$('.workspace').prepend(bar)}
 const doc=focusDocument();bar.hidden=!documentFocus.active;
 if(!documentFocus.active||!doc)return;
 const image=doc.kind==='image',text=doc.kind==='text',mode=focusMode(),project=workbench.source==='project';
 bar.innerHTML=`<div class="focus-document-name"><span class="focus-eyebrow">MODO FOCO</span><div class="focus-file-name"><strong title="${esc(doc.path||doc.title||doc.name)}">${esc(doc.title||doc.name)}</strong><span class="focus-doc-indicator"></span></div></div>
 <div class="focus-modes" role="group" aria-label="Visualização do arquivo">${image?'<span>Imagem</span>':[['read','Ler'],['edit','Editar'],['split','Editor e prévia']].filter(([id])=>id!=='split'||(!text&&!multiActive())).map(([id,label])=>`<button type="button" data-focus-mode="${id}" aria-pressed="${mode===id}">${label}</button>`).join('')}</div>
 <div class="focus-utilities">${!image?'<button class="icon-button" data-focus-command="find-document" aria-label="Buscar no arquivo" title="Buscar no arquivo · Ctrl F">'+icon('search')+'</button><button class="plain-button" data-focus-command="document-outline" title="Sumário do documento">Sumário</button>':''}<button class="plain-button" data-focus-appearance aria-label="Ajustar leitura">Aa</button><button class="plain-button" data-focus-fullscreen aria-pressed="${documentFocus.fullscreen}" title="Alternar tela cheia">${documentFocus.fullscreen?'Em tela cheia':'Tela cheia'}</button>${project&&!image?'<button class="plain-button" data-focus-save>Salvar</button>':''}<button class="focus-exit" data-focus-exit title="Sair do foco · Esc">${icon('close')}<span>Sair <kbd>Esc</kbd></span></button></div>
 <div class="focus-status" role="status" aria-live="polite"></div>`;
 refreshFocusStatus();
 if(!image){
  bar.querySelector('.focus-utilities').insertAdjacentHTML('afterbegin','<select class="focus-width-choice" aria-label="Largura no modo foco" title="Largura no modo foco"><option value="comfortable">Compacta</option><option value="wide">Ampla</option><option value="full">Toda a largura</option></select>');
  const width=bar.querySelector('.focus-width-choice');width.value=focusPreferences().width;
  width.onchange=()=>{interfacePrefs().focus={...focusPreferences(),width:width.value};applyFocusPreferences();persist()};
 }
 const editor=$('#project-editor');if(editor&&text){editor.readOnly=documentFocus.textRead;editor.setAttribute('aria-label',documentFocus.textRead?'Leitura do arquivo de texto':'Editar arquivo de texto')}
}
function refreshFocusStatus(){
 if(!documentFocus.active)return;
 const output=$('#focus-toolbar .focus-status'),doc=focusDocument();if(!output||!doc)return;
 const indicator=$('#focus-toolbar .focus-doc-indicator'),project=workbench.source==='project';
 if(indicator)indicator.innerHTML=doc.kind==='image'||typeof documentStatusDot!=='function'?'':documentStatusDot(doc,project);
 output.hidden=doc.kind==='image'||!(doc.error||doc.conflict||!storageOK);
 output.textContent=doc.kind==='image'?'Visualização de imagem':workbench.source==='project'?paneStatus(doc):storageOK?'Salvamento automático':'Falha ao salvar · exporte uma cópia';
 output.classList.toggle('has-unsaved',!!(doc.dirty||doc.error||doc.conflict)||!storageOK);
}
function refreshFocus(){
 const doc=focusDocument();
 if(documentFocus.active&&!doc){exitDocumentFocus();return}
 document.body.classList.toggle('focus-mode',documentFocus.active);
 document.body.classList.toggle('focus-multiple',documentFocus.active&&multiActive());
 document.body.classList.toggle('focus-reading',documentFocus.active&&focusMode()==='read');
 applyFocusPreferences();focusToolbar();
 updateVisualEditability();
 const title=$('#note-title');if(title)title.readOnly=documentFocus.active&&focusMode()==='read';
 if(documentFocus.active){document.querySelectorAll('.editing-pane').forEach((pane,i)=>pane.classList.toggle('focus-active-pane',i===studio.active))}
 const host=$('.project-document-toolbar>div:last-child,.split-workspace-heading,.note-tools');
 if(doc&&host&&!host.querySelector('[data-action="focus"]')){
  host.insertAdjacentHTML('beforeend','<button class="icon-button" data-action="focus" title="Modo foco · Ctrl Shift F" aria-label="Modo foco">'+icon('focus')+'</button>');
 }
}
async function setFocusFullscreen(enabled){
 if(window.amagoDesktop?.fullscreen){const result=await window.amagoDesktop.fullscreen(enabled);documentFocus.fullscreen=result.fullscreen}
 else if(enabled){if(!document.fullscreenElement){if(!document.documentElement.requestFullscreen)throw Error('Este navegador não permite tela cheia.');await document.documentElement.requestFullscreen()}documentFocus.fullscreen=!!document.fullscreenElement}
 else {if(document.fullscreenElement)await document.exitFullscreen();documentFocus.fullscreen=false}
 document.body.classList.toggle('focus-fullscreen',documentFocus.active&&documentFocus.fullscreen);
 focusToolbar();
}
async function enterDocumentFocus(){
 if(documentFocus.active||documentFocus.busy)return;
 if(!focusDocument()){toast('Abra uma nota, arquivo de texto ou imagem para entrar no modo foco.');return}
 documentFocus.returnFocus=document.activeElement;documentFocus.active=true;documentFocus.busy=true;documentFocus.textRead=false;
 document.body.classList.remove('sidebar-peek');refreshFocus();
 try{
  const wasFull=window.amagoDesktop?.fullscreen?(await window.amagoDesktop.fullscreen()).fullscreen:!!document.fullscreenElement;
  documentFocus.ownsFullscreen=!wasFull;
  await setFocusFullscreen(true);
 }catch(error){documentFocus.ownsFullscreen=false;toast('Modo foco ativado. '+(error.message||'Tela cheia indisponível neste ambiente.'))}
 finally{documentFocus.busy=false;if(documentFocus.exitRequested){documentFocus.exitRequested=false;await exitDocumentFocus()}else{focusToolbar();$('#focus-toolbar [data-focus-exit]')?.focus({preventScroll:true})}}
}
async function exitDocumentFocus(){
 if(!documentFocus.active)return;
 if(documentFocus.busy){documentFocus.exitRequested=true;return}
 documentFocus.active=false;documentFocus.busy=true;document.body.classList.remove('focus-mode','focus-multiple','focus-fullscreen','focus-reading');
 updateVisualEditability();
 const editor=$('#project-editor');if(editor)editor.readOnly=false;
 const title=$('#note-title');if(title)title.readOnly=false;
 $('#focus-toolbar')?.setAttribute('hidden','');
 try{if(documentFocus.ownsFullscreen)await setFocusFullscreen(false)}catch{toast('Use Esc ou o controle do sistema para sair da tela cheia.')}
 finally{
  documentFocus.ownsFullscreen=false;documentFocus.textRead=false;documentFocus.busy=false;
  const target=documentFocus.returnFocus?.isConnected?documentFocus.returnFocus:focusActiveEditor()||$('.focus-active-pane .visual-block,.visual-block,[data-action="focus"]');
  target?.focus({preventScroll:true});documentFocus.returnFocus=null;applyInterface();
 }
}
actions.focus=()=>documentFocus.active?exitDocumentFocus():enterDocumentFocus();
const focusCommand=commandList.find(item=>item[1]==='focus');if(focusCommand){focusCommand[0]='Modo foco em tela cheia';focusCommand[2]='Ctrl Shift F'}

function showFocusAppearance(){
 const prefs=focusPreferences();
 modal('Ajustar leitura',`<p>Escolha o tamanho do texto e a largura da página no modo foco.</p><label for="focus-font-size">Tamanho do texto <output id="focus-font-value">${prefs.size} px</output></label><input id="focus-font-size" type="range" min="10" max="48" step="1" value="${prefs.size}"><label for="focus-page-width">Largura da página</label><select class="field" id="focus-page-width"><option value="comfortable" ${prefs.width==='comfortable'?'selected':''}>Confortável</option><option value="wide" ${prefs.width==='wide'?'selected':''}>Ampla</option><option value="full" ${prefs.width==='full'?'selected':''}>Toda a largura</option></select><p>As preferências são lembradas. O conteúdo dos arquivos permanece no tamanho original.</p>`);
 $('#focus-font-size').oninput=e=>{interfacePrefs().focus={...focusPreferences(),size:+e.target.value};$('#focus-font-value').textContent=e.target.value+' px';applyFocusPreferences()};
 $('#focus-font-size').onchange=()=>persist();$('#focus-page-width').onchange=e=>{interfacePrefs().focus={...focusPreferences(),width:e.target.value};applyFocusPreferences();persist()};
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-focus-mode],[data-focus-exit],[data-focus-fullscreen],[data-focus-appearance],[data-focus-save],[data-focus-command]');if(!button)return;
 if(button.hasAttribute('data-focus-exit'))return exitDocumentFocus();
 if(button.hasAttribute('data-focus-appearance'))return showFocusAppearance();
 if(button.dataset.focusCommand)return actions[button.dataset.focusCommand]?.();
 if(button.hasAttribute('data-focus-save')){button.disabled=true;try{await saveProjectFile()}finally{if(button.isConnected)button.disabled=false;refreshFocusStatus()}return}
 if(button.hasAttribute('data-focus-fullscreen')){
  if(documentFocus.busy)return;documentFocus.busy=true;
  try{documentFocus.ownsFullscreen=!documentFocus.fullscreen;await setFocusFullscreen(!documentFocus.fullscreen)}catch(error){toast(error.message)}finally{documentFocus.busy=false;if(documentFocus.exitRequested){documentFocus.exitRequested=false;await exitDocumentFocus()}}return;
 }
 const mode=button.dataset.focusMode;if(!['read','edit','split'].includes(mode))return;
 if(multiActive())studio.panes[studio.active].mode=mode==='split'?'edit':mode;
 else if(workbench.source==='project'){if(workbench.file.kind==='text')documentFocus.textRead=mode==='read';else workbench.mode=mode}
 else state.mode=mode;
 renderMain();if(mode==='edit')focusActiveEditor()?.focus();else $('#focus-toolbar [data-focus-mode="'+mode+'"]')?.focus();
});
window.addEventListener('keydown',e=>{
 if(documentFocus.active&&e.target.matches?.('textarea[readonly]')&&e.key==='Tab'){e.stopImmediatePropagation();return}
 if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='f'&&!e.altKey){e.preventDefault();e.stopImmediatePropagation();if(!$('.modal'))actions.focus();return}
 if(e.key==='Escape'&&documentFocus.active){
  e.preventDefault();e.stopImmediatePropagation();
  if(e.target.id==='add-document-tag'&&$('#document-tag-options')&&!$('#document-tag-options').hidden){e.target.closest('.metadata-tag-picker').querySelector('.tag-show-options').click();return}
  if($('#editor-completion')){closeCompletion();return}
  if($('#document-find-panel')&&typeof closeDocumentFind==='function'){closeDocumentFind();return}
  if($('.modal')){closeModal();return}
  exitDocumentFocus();
 }
},true);
const focusRenderMain=renderMain;renderMain=function(){focusRenderMain();refreshFocus()};
const focusActivatePane=activatePane;activatePane=function(index){focusActivatePane(index);refreshFocus()};
document.addEventListener('input',()=>refreshFocusStatus());
window.addEventListener('amago-edit-request',()=>{documentFocus.textRead=false});
const focusMarkFileStatus=markFileStatus;markFileStatus=function(message){focusMarkFileStatus(message);refreshFocusStatus()};
function fullscreenChanged(fullscreen){
 const hadFullscreen=documentFocus.fullscreen;documentFocus.fullscreen=fullscreen;
 document.body.classList.toggle('focus-fullscreen',documentFocus.active&&fullscreen);
 if(documentFocus.active&&hadFullscreen&&!fullscreen&&!documentFocus.busy){documentFocus.ownsFullscreen=false;exitDocumentFocus()}else focusToolbar();
}
document.addEventListener('fullscreenchange',()=>fullscreenChanged(!!document.fullscreenElement));
window.amagoDesktop?.onFullscreenChange?.(fullscreenChanged);
refreshFocus();
