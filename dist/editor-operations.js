'use strict';

function exportSourceDocument(doc,project=false,draft=false){
 if(!doc||typeof doc.body!=='string'){toast('Abra um documento de texto para exportar.');return}
 const exported=AmagoEditorOperations.exportDocument(doc,{project,draft});download(exported.name,exported.body,exported.type);toast('Documento exportado sem alterar o conteúdo.');
}
actions['export-note']=()=>exportSourceDocument(note());
actions['export-current-document']=()=>{const target=navigationDocument();if(target)exportSourceDocument(target.doc,target.project);else toast('Abra um documento de texto para exportar.')};
workActions['export-draft']=()=>exportSourceDocument(workbench.file,true,true);
window.addEventListener('click',event=>{const button=event.target.closest('[data-pane-export]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();const pane=studio.panes[+button.dataset.paneExport];exportSourceDocument(paneDocument(pane),pane.source==='project',true)},true);
commandList.push(['Exportar documento ativo sem alterações','export-current-document','']);

async function importDocumentFiles(files){
 const reports=[];
 for(const file of files){
  try{
   if(file.size>20*1024*1024)throw Error('O arquivo excede 20 MiB.');
   let raw;try{raw=file.arrayBuffer?new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer()):await file.text()}catch{throw Error('Não foi possível ler o arquivo como UTF-8 válido.')}
   const plan=AmagoEditorOperations.prepareImport(file.name,raw,vault.notes.map(note=>note.title)),now=stamp();
   const notes=plan.map(note=>({...note,id:uid(),created:now,updated:now}));
   vault.notes.push(...notes);for(const note of notes)if(!vault.folders.includes(note.folder))vault.folders.push(note.folder);
   reports.push({name:file.name,count:notes.length});
  }catch(error){reports.push({name:file.name,error:error.message||'Arquivo inválido.'})}
 }
 return reports;
}
let importingDocuments=false;
const documentImportInput=$('#import-input');documentImportInput.accept='.md,.markdown,.txt,.json';
documentImportInput.onchange=async event=>{
 if(importingDocuments)return;importingDocuments=true;
 try{
  const files=Array.from(event.target.files||[]);if(!files.length)return;
  const reports=await importDocumentFiles(files),count=reports.reduce((total,report)=>total+(report.count||0),0);
  if(count){persist();vault.folders.forEach(folder=>state.openFolders.add(folder));render()}
  modal('Resultado da importação',`<p>${count} nota(s) adicionada(s). Cada arquivo é validado por inteiro antes de importar.</p><div class="import-report">${reports.map(report=>`<section><strong>${esc(report.name)}</strong><p class="${report.error?'import-error':''}">${report.error?esc(report.error):report.count+' nota(s) importada(s).'}</p></section>`).join('')}</div><p>Arquivos com erro não adicionam notas parciais. O corpo dos arquivos Markdown e TXT é preservado, incluindo seus títulos e propriedades.</p><div class="modal-actions"><button class="solid-button" data-action="close">Concluir</button></div>`);
 }finally{event.target.value='';importingDocuments=false}
};

function applySourceOperation(editor,change){
 if(!change||editor.readOnly||editor.disabled)return false;
 return sourceInsertion(editor,change.body,0,editor.value.length,[change.start,change.end]);
}
const operationsFormatSource=formatSourceEditor;
formatSourceEditor=function(kind,editor=activeSourceEditor()){
 if(!['bold','italic','strike'].includes(kind))return operationsFormatSource(kind,editor);
 editor=editor?.isConnected?editor:ensureSourceEditor();if(!editor||editor.readOnly||editorDocument(editor)?.kind==='text'){toast('Abra a edição de um documento Markdown para formatar.');return}
 applySourceOperation(editor,AmagoEditorOperations.toggleFormat(editor.value,editor.selectionStart,editor.selectionEnd,kind));
};
actions['format-strike']=()=>formatSourceEditor('strike');commandList.push(['Tachado no editor ativo','format-strike','']);
const operationsMountSource=mountSourceToolbars;
mountSourceToolbars=function(){
 operationsMountSource();for(const bar of document.querySelectorAll('.format-toolbar'))if(!bar.querySelector('[data-format="strike"]'))bar.insertAdjacentHTML('beforeend','<button type="button" data-format="strike" title="Tachado"><s>Tachado</s></button>');
};
window.addEventListener('keydown',event=>{
 const editor=event.target;if(event.defaultPrevented||event.isComposing||!editor.matches?.('#editor,#project-editor,[data-pane-editor]')||editor.disabled||$('.modal'))return;
 if(editor.readOnly){if(event.key==='Tab')event.stopImmediatePropagation();return}
 if(event.key==='Tab'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.stopImmediatePropagation();applySourceOperation(editor,AmagoEditorOperations.indent(editor.value,editor.selectionStart,editor.selectionEnd,event.shiftKey));return}
 const markdown=editorDocument(editor)?.kind!=='text';
 if(markdown&&(event.ctrlKey||event.metaKey)&&!event.shiftKey&&!event.altKey&&['b','i'].includes(event.key.toLowerCase())){event.preventDefault();event.stopImmediatePropagation();formatSourceEditor(event.key.toLowerCase()==='b'?'bold':'italic',editor);return}
 if(markdown&&event.key==='Enter'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
  const line=editor.value.slice(0,editor.selectionStart).split('\n').length-1;if(!taskSourceLines(editor.value)[line]?.trim())return;
  const change=AmagoEditorOperations.continueList(editor.value,editor.selectionStart,editor.selectionEnd);if(change){event.preventDefault();event.stopImmediatePropagation();applySourceOperation(editor,change)}
 }
},true);

async function copyEditorText(text,label='Texto'){
 try{if(!navigator.clipboard?.writeText)throw Error('Clipboard indisponível');await navigator.clipboard.writeText(text);toast(label+' copiado.');return true}
 catch{
  modal('Copiar '+label.toLocaleLowerCase(),`<p>A cópia automática não está disponível. Selecione o texto abaixo e use Ctrl C.</p><textarea class="field clipboard-fallback" readonly aria-label="Texto para copiar">${esc(text)}</textarea><div class="modal-actions"><button class="solid-button" data-action="close">Concluir</button></div>`);const field=$('.clipboard-fallback');field.focus();field.select();return false;
 }
}
const previewTaskObservers=new WeakMap();
function annotatePreviewTasks(preview){
 const current=visualEditors.get(preview);if(!current)return;
 const raw=current.doc.body.split('\n'),tasks=taskSourceLines(current.doc.body).flatMap((line,index)=>/^\s*(?:[-*+]|\d+\.)\s+\[[ xX]\]/.test(line)&&/^\s*(?:[-*+]|\d+\.)\s+\[[ xX]\]/.test(raw[index])?[index]:[]);
 preview.querySelectorAll('input[data-md-task-line]').forEach((input,index)=>{
  if(tasks[index]===undefined){input.disabled=true;delete input.dataset.documentTaskLine;return}
  input.dataset.documentTaskLine=String(tasks[index]);input.disabled=!input.closest('.visual-block')?.isContentEditable;
  input.setAttribute('aria-label',(input.checked?'Desmarcar':'Concluir')+' tarefa: '+(input.closest('li')?.querySelector('span')?.textContent||''));
 });
}
function mountPreviewOperations(){
 for(const preview of document.querySelectorAll('#preview,#project-preview,.pane-preview')){
  if(!visualEditors.has(preview))continue;
  annotatePreviewTasks(preview);
  if(!previewTaskObservers.has(preview)){const observer=new MutationObserver(()=>annotatePreviewTasks(preview));observer.observe(preview,{subtree:true,attributes:true,attributeFilter:['contenteditable']});previewTaskObservers.set(preview,observer)}
  for(const pre of preview.querySelectorAll('pre')){
   if(pre.previousElementSibling?.matches('[data-code-copy]'))continue;
   const button=document.createElement('button');button.type='button';button.className='code-copy-button';button.dataset.codeCopy='';button.dataset.editorUi='';button.contentEditable='false';button.textContent='Copiar código';button.setAttribute('aria-label','Copiar conteúdo do bloco de código');button.amagoCode=pre;
   pre.before(button);button.onclick=event=>{event.preventDefault();event.stopPropagation();copyEditorText(pre.querySelector('code')?.textContent??pre.textContent,'Código')};
  }
 }
}
const operationsMountVisual=mountVisualEditors;
mountVisualEditors=function(){operationsMountVisual();mountPreviewOperations()};
window.addEventListener('click',event=>{
 const input=event.target.closest('input[data-document-task-line]');if(!input)return;
 event.preventDefault();event.stopImmediatePropagation();const preview=input.closest('#preview,#project-preview,.pane-preview'),block=input.closest('.visual-block');if(!preview||!block?.isContentEditable)return;
 const current=visualEditors.get(preview);if(!current)return;const checked=input.checked;annotatePreviewTasks(preview);
 const line=Number(input.dataset.documentTaskLine),body=AmagoEditorOperations.toggleTask(current.doc.body,line,checked);if(body===null)return;
 assignVisualDocumentBody(preview,body);preview.removeAttribute('data-visual-ready');mountVisualEditors();if(typeof refreshFocus==='function')refreshFocus();
 preview.querySelector(`[data-document-task-line="${line}"]`)?.focus({preventScroll:true});
},true);
document.addEventListener('input',event=>{const preview=event.target.closest?.('#preview,#project-preview,.pane-preview');if(preview)annotatePreviewTasks(preview)});
window.addEventListener('amago-document-change',()=>{for(const preview of document.querySelectorAll('#preview,#project-preview,.pane-preview'))annotatePreviewTasks(preview)});
mountSourceToolbars();mountPreviewOperations();
