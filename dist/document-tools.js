'use strict';
async function gitPanel(){
 if(!projectHasGit())return;
 modal('Repositório Git',`<p>Use a autenticação e a identidade já configuradas no Git do Windows.</p><div class="settings-button-grid"><button class="plain-button" id="git-clone">Clonar repositório</button><button class="plain-button" id="git-status">Atualizar estado</button></div><pre id="git-result" style="white-space:pre-wrap;max-height:240px;overflow:auto">Consultando…</pre><label>Mensagem do commit<input class="field" id="git-message" placeholder="Descreva as alterações"></label><label>Branch para mesclar<select class="field" id="git-branch"></select></label><div class="modal-actions"><button class="plain-button" data-git="fetch">Buscar atualizações</button><button class="plain-button" data-git="merge">Mesclar branch</button><button class="plain-button" data-git="resolve">Marcar conflitos editados como resolvidos</button><button class="plain-button" data-git="commit">Commit de todas as alterações</button><button class="solid-button" data-git="push">Enviar commits</button></div><p>O commit inclui todos os arquivos alterados e não ignorados do projeto. Mesclagens exigem uma árvore limpa. Não há envio forçado.</p>`);
 const show=result=>{const output=$('#git-result');if(!output)return;output.textContent=result.error||`Branch: ${result.branch||'(sem branch)'}\n\n${result.changes?.join('\n')||'Nenhuma alteração local.'}`;if(result.branches)$('#git-branch').innerHTML=result.branches.map(b=>`<option>${esc(b)}</option>`).join('')};
 const inspect=async()=>show(await window.amagoDesktop.git('status'));$('#git-status').onclick=inspect;
 $('#git-clone').onclick=cloneGitProject;
 document.querySelectorAll('[data-git]').forEach(button=>button.onclick=async()=>{if(!(await saveProjectFile()))return;const op=button.dataset.git;if(['commit','push','merge'].includes(op)&&!confirm(op==='commit'?'Criar commit de todas as alterações listadas?':op==='push'?'Enviar os commits para o remoto configurado?':'Mesclar a branch selecionada? Conflitos serão preservados para resolução.'))return;document.querySelectorAll('[data-git]').forEach(b=>b.disabled=true);const result=await window.amagoDesktop.git(op,op==='commit'?$('#git-message').value:$('#git-branch').value);show(result);document.querySelectorAll('[data-git]').forEach(b=>b.disabled=false);if(op==='merge'){studio.files.clear();studio.panes=[];workbench.file=null;await refreshProject();renderMain()}});await inspect();
}
function projectHasGit(){
 return Boolean(window.amagoDesktop?.git&&workbench.source==='project'&&!workbench.project?.cloud&&workbench.project?.gitRepository);
}
function cloneGitProject(){modal('Clonar repositório',`<form id="git-clone-form"><label>URL HTTPS<input type="url" class="field" id="git-url" required placeholder="https://github.com/empresa/notas.git"></label><label>Nova pasta<input class="field" id="git-name" required value="notas"></label><p>A pasta será criada no local selecionado na próxima etapa.</p><button class="solid-button">Clonar e abrir</button><p id="clone-result" role="status"></p></form>`);$('#git-clone-form').onsubmit=async e=>{e.preventDefault();if(!(await saveProjectFile()))return;const button=e.target.querySelector('button');button.disabled=true;const result=await window.amagoDesktop.git('clone',{url:$('#git-url').value,name:$('#git-name').value});if(result.project){studio.files.clear();studio.panes=[];workbench.project=result.project;workbench.source='project';workbench.file=null;workbench.tabs=[];workbench.expanded=new Set();state.view='project';closeModal();render();indexProject(true)}else{button.disabled=false;$('#clone-result').textContent=result.error||'Operação cancelada.'}}}
actions['git-project']=gitPanel;
actions['git-clone']=cloneGitProject;
if(window.amagoDesktop?.git)commandList.push(['Repositório Git','git-project',''],['Clonar repositório Git','git-clone','']);
function refreshGitButton(){
 const button=$('.header-right [data-action="git-project"]');
 if(!projectHasGit()){button?.remove();return}
 if(!button)$('.header-right').insertAdjacentHTML('beforeend','<button class="plain-button" data-action="git-project" title="Repositório Git">'+icon('branch')+'Git</button>');
}
const gitRenderTree=renderTree;
renderTree=function(){gitRenderTree();refreshGitButton()};
refreshGitButton();

function markdownLiteral(text){return String(text).replace(/([\\`*_[\]<>#!|~])/g,'\\$1')}
function markdownCodeSpan(text,table=false){
 const value=String(text),longest=Math.max(0,...[...value.matchAll(/`+/g)].map(m=>m[0].length)),marker='`'.repeat(longest+1);
 const padding=value.startsWith('`')||value.endsWith('`')||(/^ .+ $/.test(value)&&/[^ ]/.test(value))?' ':'';
 return marker+padding+(table?value.replace(/\|/g,'\\|'):value)+padding+marker;
}
function visualInlineMarkdown(node,table=false){
 if(node.nodeType===3)return markdownLiteral(node.textContent);
 if(node.nodeType!==1)return '';
 if(node.hasAttribute('data-editor-ui'))return '';
 const text=()=>[...node.childNodes].map(child=>visualInlineMarkdown(child,table)).join('');
 switch(node.tagName){
  case 'STRONG':case 'B':return '**'+text()+'**';
  case 'EM':case 'I':return '*'+text()+'*';
  case 'DEL':case 'S':return '~~'+text()+'~~';
  case 'CODE':return markdownCodeSpan(node.textContent,table);
  case 'BR':return table?' ':'\n';
  case 'A':return '['+text()+']('+(node.getAttribute('href')||'').replace(/([\\()])/g,'\\$1').replace(/\|/g,'%7C')+')';
  case 'INPUT':return node.type==='checkbox'?(node.checked?'[x] ':'[ ] '):'';
  case 'BUTTON':{
   const target=node.dataset.followReference||node.dataset.wiki;
   return target?(node.dataset.referenceEmbed==='true'?'!':'')+'[['+target+'|'+node.textContent+']]':text();
  }
  case 'P':case 'DIV':return text()+(table?' ':'\n\n');
  default:return text();
 }
}
function visualTableMarkdown(table){
 const rows=[...table.rows];if(!rows.length)return '';
 const columns=rows[0].cells.length;
 const row=cells=>'| '+Array.from({length:columns},(_,i)=>cells[i]?[...cells[i].childNodes].map(node=>visualInlineMarkdown(node,true)).join('').replace(/\r?\n/g,' ').trim():'').join(' | ')+' |';
 const separator='| '+[...rows[0].cells].map(cell=>({left:':---',center:':---:',right:'---:'}[cell.style.textAlign]||'---')).join(' | ')+' |';
 return [row(rows[0].cells),separator,...rows.slice(1).map(r=>row(r.cells))].join('\n')+'\n\n';
}
function visualCodeMarkdown(node){
 const text=node.querySelector('code')?.textContent??node.textContent,original=node.dataset.codeFence||'```',char=original[0]==='~'?'~':'`';
 const longest=Math.max(0,...[...text.matchAll(char==='`'?/`+/g:/~+/g)].map(m=>m[0].length)),fence=char.repeat(Math.max(3,original.length,longest+1));
 return fence+(node.dataset.codeInfo||'')+'\n'+text+'\n'+fence+'\n\n';
}
function visualMarkdown(element){
 const block=node=>{
  if(node.nodeType!==1)return visualInlineMarkdown(node);
  if(node.hasAttribute('data-editor-ui'))return '';
  const text=()=>[...node.childNodes].map(block).join('');
  switch(node.tagName){
   case 'TABLE':return visualTableMarkdown(node);
   case 'PRE':return visualCodeMarkdown(node);
   case 'HR':return '---\n\n';
   case 'H1':case 'H2':case 'H3':case 'H4':case 'H5':case 'H6':return '#'.repeat(+node.tagName[1])+' '+[...node.childNodes].map(n=>visualInlineMarkdown(n)).join('')+'\n\n';
   case 'P':case 'DIV':return text()+'\n\n';
   case 'BLOCKQUOTE':return text().trimEnd().split('\n').map(line=>'> '+line).join('\n')+'\n\n';
   case 'LI':return '- '+text().trim()+'\n';
   case 'OL':return [...node.children].map((li,i)=>(Number(node.getAttribute('start'))||1)+i+'. '+[...li.childNodes].map(block).join('').trim()).join('\n')+'\n\n';
   case 'UL':return text()+'\n';
   default:return visualInlineMarkdown(node);
  }
 };
 return [...element.childNodes].map(block).join('').trimEnd();
}

// Ranges retain the original separators; only edited ranges are serialized.
function visualMarkdownSegments(body){
 const records=[];let fence=null,start=null,end=0;
 for(const match of body.matchAll(/([^\n]*)(\n|$)/g)){
  if(!match[0])continue;
  const line=match[1].replace(/\r$/,''),marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim())fence=null}
  if(!fence&&!line.trim()){
   if(start!==null){records.push({start,end,source:body.slice(start,end)});start=null}
  }else{if(start===null)start=match.index;end=match.index+line.length}
 }
 if(start!==null)records.push({start,end,source:body.slice(start,end)});
 return records.length?records:[{start:0,end:0,source:''}];
}
function visualMarkdownBlocks(body){return visualMarkdownSegments(body).map(record=>record.source)}
function visualPreviewDocument(preview){
 const pane=preview.closest('[data-pane]'),ref=pane?studio.panes[+pane.dataset.pane]:null;
 const doc=ref?paneDocument(ref):preview.id==='project-preview'?workbench.file:note();
 return {ref,doc,project:ref?ref.source==='project':preview.id==='project-preview'};
}
const visualEditors=new WeakMap();let visualMetadataTimer;
function refreshVisualMetadata(doc,project){
 clearTimeout(visualMetadataTimer);visualMetadataTimer=setTimeout(()=>{
  if(project){if(workbench.file===doc){refreshProjectContext();updatePaneStats()}}
  else if(note()===doc&&workbench.source==='vault'){
   updateStats();const context=$('#main>.context-panel');if(context)context.outerHTML=renderContext(doc);updateStudioTools();
  }
  refreshSearchResults();
 },180);
}
function syncVisualEditor(preview){
 const current=visualEditors.get(preview);if(!current)return;
 const {doc,project,front,body,records,newline}=current;let value=front,cursor=0;
 for(const record of records){value+=body.slice(cursor,record.start)+(!record.edited||record.block.innerHTML===record.initial?record.source:visualMarkdown(record.block).replace(/\r\n?/g,'\n').replace(/\n/g,newline));cursor=record.end}
 value+=body.slice(cursor);assignVisualDocumentBody(preview,value);
}
function assignVisualDocumentBody(preview,value){
 const current=visualEditors.get(preview);if(!current)return;const {doc,project}=current;if(value===doc.body)return;
 doc.body=value;
 if(project){doc.dirty=doc.body!==doc.savedBody;studio.files.set(doc.path,doc);renderPaneStatus();if(workbench.file===doc){markFileStatus(doc.dirty?'Alterações não salvas':'Arquivo salvo');updatePaneStats()}}
 else{doc.updated=stamp();persist();if(note()===doc&&workbench.source==='vault')updateStats()}
 const owner=preview.closest('[data-pane]')||preview.parentElement,editor=owner.querySelector('textarea');if(editor&&editorDocument(editor)===doc)editor.value=doc.body;
 renderTabs();refreshVisualMetadata(doc,project);
 window.dispatchEvent(new CustomEvent('amago-document-change',{detail:{doc,source:project?'project':'vault'}}));
}
function rememberVisualSelection(preview){
 const selection=getSelection(),current=visualEditors.get(preview);if(!current||!selection?.rangeCount)return;
 const range=selection.getRangeAt(0);if(preview.contains(range.startContainer)&&preview.contains(range.endContainer))current.range=range.cloneRange();
}
function runVisualCommand(preview,command,value){
 const current=visualEditors.get(preview),before=current.records.map(record=>record.block.innerHTML);
 document.execCommand(command,false,value);
 current.records.forEach((record,i)=>{if(record.block.innerHTML!==before[i])record.edited=true});syncVisualEditor(preview);
}
document.addEventListener('selectionchange',()=>{
 const node=getSelection()?.anchorNode,element=node?.nodeType===1?node:node?.parentElement,preview=element?.closest('#preview,#project-preview,.pane-preview');if(preview)rememberVisualSelection(preview);
});
function updateVisualEditability(scope=document){
 const locked=document.body.classList.contains('focus-mode');
 for(const block of scope.querySelectorAll('.visual-block')){
  block.contentEditable=String(!locked);
  if(locked){
   for(const name of ['role','aria-label','aria-multiline'])block.removeAttribute(name);
  }else{
   block.setAttribute('role','textbox');block.setAttribute('aria-label','Editar trecho do documento');block.setAttribute('aria-multiline','true');
  }
 }
 if(typeof annotatePreviewTasks==='function'){
  const previews=scope.matches?.('.markdown')?[scope]:scope.querySelectorAll('#preview,#project-preview,.pane-preview');
  for(const preview of previews)annotatePreviewTasks(preview);
 }
}
function mountVisualEditors(){
 for(const preview of document.querySelectorAll('#preview,#project-preview,.pane-preview')){
  const {ref,doc,project}=visualPreviewDocument(preview);if(!doc||doc.kind==='text')continue;
  const previous=visualEditors.get(preview);
  if(preview.dataset.visualReady&&previous?.doc===doc&&previous.records.every(record=>preview.contains(record.block)))continue;
  if(preview.previousElementSibling?.classList.contains('visual-toolbar'))preview.previousElementSibling.remove();
  const front=doc.body.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/)?.[0]||(doc.body.startsWith('\uFEFF')?'\uFEFF':''),body=doc.body.slice(front.length),records=visualMarkdownSegments(body),newline=doc.body.includes('\r\n')?'\r\n':'\n';
  const current={ref,doc,project,front,body,records,newline};visualEditors.set(preview,current);preview.dataset.visualReady='true';preview.innerHTML='';
  const toolbar=document.createElement('div');toolbar.className='visual-toolbar';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Formatação visual');
  toolbar.innerHTML='<span>Edição visual</span><button type="button" data-visual-format="bold" aria-label="Negrito" title="Negrito"><b>B</b></button><button type="button" data-visual-format="italic" aria-label="Itálico" title="Itálico"><i>I</i></button><button type="button" data-visual-format="undo" aria-label="Desfazer edição visual">Desfazer</button>';
  preview.before(toolbar);toolbar.onpointerdown=event=>{if(event.target.closest('[data-visual-format]')){rememberVisualSelection(preview);event.preventDefault()}};
  toolbar.onclick=event=>{
   const button=event.target.closest('[data-visual-format]');if(!button)return;event.preventDefault();event.stopPropagation();
   if(!records.some(record=>record.block.isContentEditable))return;
   const range=current.range,selection=getSelection();if(range&&preview.contains(range.startContainer)){selection.removeAllRanges();selection.addRange(range)}else records[0].block.focus();
   runVisualCommand(preview,button.dataset.visualFormat);
  };
  for(const record of records){const block=document.createElement('div');block.className='visual-block';block.innerHTML=(project?fileMarkdown(record.source,doc):markdown(record.source,false,doc))||'<p><br></p>';record.block=block;record.initial=block.innerHTML;preview.append(block)}
  updateVisualEditability(preview);
  // Properties replace earlier handlers when the same preview is mounted again.
  preview.onpaste=event=>{if(!event.target.closest('.visual-block')?.isContentEditable)return;event.preventDefault();runVisualCommand(preview,'insertText',event.clipboardData?.getData('text/plain')||'')};
  preview.oninput=event=>{if(document.body.classList.contains('focus-mode'))return;const block=event.target.closest('.visual-block');for(const record of records)if(record.block===block||(!block&&record.block.innerHTML!==record.initial))record.edited=true;rememberVisualSelection(preview);syncVisualEditor(preview)};
 }
}

let lastSourceEditor=null;
function activeSourceEditor(){
 const selector='#editor,#project-editor,[data-pane-editor]';
 if(document.activeElement?.matches(selector))return document.activeElement;
 if(multiActive())return document.querySelector(`[data-pane-editor="${studio.active}"]`);
 if(lastSourceEditor?.isConnected&&lastSourceEditor.matches(selector))return lastSourceEditor;
 return document.querySelector(workbench.source==='project'?'#project-editor':'#editor');
}
function ensureSourceEditor(){
 if(document.body.classList.contains('focus-reading'))return null;
 let editor=activeSourceEditor();if(editor)return editor;
 const doc=multiActive()?paneDocument(studio.panes[studio.active]):workbench.source==='project'?workbench.file:note();
 if(!doc||(workbench.source==='project'&&!AmagoFiles.editable(doc))||!['notes','project'].includes(state.view))return null;
 if(multiActive())studio.panes[studio.active].mode='edit';else if(workbench.source==='project')workbench.mode='edit';else state.mode='edit';
 window.dispatchEvent(new CustomEvent('amago-edit-request'));
 renderMain();return activeSourceEditor();
}
document.addEventListener('focusin',event=>{if(event.target.matches('#editor,#project-editor,[data-pane-editor]'))lastSourceEditor=event.target});
function sourceInsertion(editor,value,start=editor?.selectionStart,end=editor?.selectionEnd,inner=null){
 if(!editor?.isConnected||editor.readOnly||editor.disabled)return false;
 const scroll=editor.scrollTop;editor.focus({preventScroll:true});editor.setRangeText(value,start,end,'end');
 if(inner)editor.setSelectionRange(start+inner[0],start+inner[1]);
 editor.dispatchEvent(new Event('input',{bubbles:true}));editor.scrollTop=scroll;lastSourceEditor=editor;return true;
}
function formatSourceEditor(kind,editor=activeSourceEditor()){
 editor=editor?.isConnected?editor:ensureSourceEditor();if(!editor||editorDocument(editor)?.kind==='text'){toast('Abra um documento Markdown para formatar.');return}
 if(kind==='table'){insertMarkdownTable(editor);return}
 const selected=editor.value.slice(editor.selectionStart,editor.selectionEnd);let value,inner=null;
 if(kind==='bold'||kind==='italic'||kind==='link'){
  const marker=kind==='bold'?'**':kind==='italic'?'*':'[[',close=kind==='link'?']]':marker,text=selected||(kind==='link'?'Nome da nota':'texto');value=marker+text+close;inner=[marker.length,marker.length+text.length];
 }else if(kind==='code'){value=markdownCodeSpan(selected||'código')}
 else if(kind==='heading'||kind==='task'){
  const prefix=editor.selectionStart>0&&editor.value[editor.selectionStart-1]!=='\n'?'\n':'';value=prefix+(kind==='heading'?'## ':'- [ ] ')+(selected||(kind==='heading'?'Título':'Próximo passo'));
 }else return;
 sourceInsertion(editor,value,editor.selectionStart,editor.selectionEnd,inner);
}
function markdownTableTemplate(rows,columns){
 if(!Number.isInteger(rows)||!Number.isInteger(columns)||rows<1||rows>30||columns<1||columns>12)throw Error('Use de 1 a 30 linhas e de 1 a 12 colunas.');
 const row=values=>'| '+values.join(' | ')+' |';
 return [row(Array.from({length:columns},(_,i)=>'Coluna '+(i+1))),row(Array(columns).fill('---')),...Array.from({length:rows},()=>row(Array(columns).fill('')))].join('\n');
}
function insertMarkdownTable(editor=ensureSourceEditor()){
 if(!editor||editorDocument(editor)?.kind==='text'){toast('Abra um documento Markdown para inserir a tabela.');return}
 const start=editor.selectionStart,end=editor.selectionEnd;
 modal('Inserir tabela',`<form id="insert-table-form"><label>Colunas<input class="field" type="number" name="columns" min="1" max="12" value="3" required></label><label>Linhas de conteúdo<input class="field" type="number" name="rows" min="1" max="30" value="2" required></label><p>O cabeçalho é adicionado automaticamente. Edite os nomes e valores no Markdown ou na prévia.</p><div class="modal-actions"><button class="plain-button" type="button" data-action="close">Cancelar</button><button class="solid-button">Inserir tabela</button></div></form>`);
 $('#insert-table-form').onsubmit=event=>{
  event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
  const value=markdownTableTemplate(Number(form.elements.rows.value),Number(form.elements.columns.value));
  if(!editor.isConnected){closeModal();toast('O documento mudou. Abra novamente a inserção de tabela.');return}
  const before=editor.value.slice(0,start),after=editor.value.slice(end),prefix=before&&!before.endsWith('\n\n')?(before.endsWith('\n')?'\n':'\n\n'):'',suffix=after&&!after.startsWith('\n\n')?(after.startsWith('\n')?'\n':'\n\n'):'';
  closeModal();sourceInsertion(editor,prefix+value+suffix,start,end);
 };
}
actions['insert-table']=()=>insertMarkdownTable();commandList.push(['Inserir tabela Markdown','insert-table','']);
for(const [kind,label] of [['bold','Negrito'],['italic','Itálico'],['heading','Título'],['task','Tarefa'],['link','Conexão']]){actions['format-'+kind]=()=>formatSourceEditor(kind);commandList.push([label+' no editor ativo','format-'+kind,''])}
function mountSourceToolbars(){
 for(const editor of document.querySelectorAll('#editor,#project-editor,[data-pane-editor]')){
  if(editorDocument(editor)?.kind==='text')continue;
  let bar=editor.previousElementSibling?.classList.contains('format-toolbar')?editor.previousElementSibling:null;
  if(bar?.amagoEditor===editor)continue;
  if(!bar){bar=document.createElement('div');bar.className='format-toolbar';editor.before(bar)}
  bar.amagoEditor=editor;bar.style.gridColumn='';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Formatação Markdown');
  bar.innerHTML='<button type="button" data-format="bold" title="Negrito" aria-label="Negrito"><b>B</b></button><button type="button" data-format="italic" title="Itálico" aria-label="Itálico"><i>I</i></button><button type="button" data-format="heading" title="Inserir título" aria-label="Inserir título">H2</button><button type="button" data-format="task">☑ Tarefa</button><button type="button" data-format="link">[[ Conexão ]]</button><button type="button" data-format="code">Código</button><button type="button" data-format="table">Tabela</button>'+(editor.id==='editor'?'<button type="button" data-action="templates">Modelos</button>':'');
  if(editor.hasAttribute('data-pane-editor')){
   const group=document.createElement('details'),summary=document.createElement('summary'),buttons=document.createElement('div');
   group.className='pane-formatting';summary.textContent='Formatação';buttons.append(...bar.children);group.append(summary,buttons);bar.append(group);
  }
  bar.onpointerdown=event=>{if(event.target.closest('button')){lastSourceEditor=editor;event.preventDefault()}};
 }
}
const visualRenderMain=renderMain;renderMain=function(){visualRenderMain();mountSourceToolbars();mountVisualEditors()};
document.addEventListener('input',event=>{
 if(!event.target.matches('#editor,#project-editor,[data-pane-editor]'))return;
 const owner=event.target.closest('[data-pane]')||event.target.parentElement,preview=owner.querySelector('.markdown');
 if(preview){preview.removeAttribute('data-visual-ready');mountVisualEditors()}
 renderTabs();
});
mountSourceToolbars();mountVisualEditors();
