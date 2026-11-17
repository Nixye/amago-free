const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-editor-')));

async function runEditorTests(){
 const check=(value,message)=>{if(!value)throw Error(message)};
 interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(resolve=>setTimeout(resolve,1500));closeModal();
 workbench.source='vault';studio.panes=[];state.view='notes';state.mode='read';
 const originalNote=note(),front='\uFEFF---\r\ncustom: preserve\r\n...\r\n',body=' \r\n\r\nPrimeiro  \r\n\r\n \t\r\nSegundo\r\n\r\n';
 originalNote.body=front+body;render();
 let preview=document.querySelector('#preview'),blocks=preview.querySelectorAll('.visual-block');
 blocks[1].querySelector('p').textContent='Alterado';blocks[1].dispatchEvent(new Event('input',{bubbles:true}));
 check(originalNote.body===front+body.replace('Segundo','Alterado'),'Untouched separators, BOM or CRLF changed');
 check(document.querySelector('#word-count').textContent.includes('palavras'),'Visual stats missing');

 // Fences retain their info string and grow when edited code contains a closing run.
 originalNote.body='Antes\n---\n~~~ javascript\nconst x = 1;\n~~~\n###### Fim';renderMain();
 preview=document.querySelector('#preview');const block=preview.querySelector('.visual-block');
 block.querySelector('pre code').textContent='~~~\nconst x = `a`;';block.dispatchEvent(new Event('input',{bubbles:true}));
 check(originalNote.body.includes('~~~~ javascript\n~~~\nconst x = `a`;\n~~~~'),'Code fence/language lost');
 check(originalNote.body.includes('\n---\n'),'Horizontal rule lost');
 check(originalNote.body.includes('###### Fim'),'H6 was flattened');renderMain();
 check(document.querySelector('#preview pre code').textContent==='~~~\nconst x = `a`;','Code changed after rendering');

 originalNote.body='Literal\n\nOutra parte';renderMain();preview=document.querySelector('#preview');
 const literal=preview.querySelector('.visual-block p');literal.textContent='*texto* [literal] C:\\notas <tag> `crase`';literal.dispatchEvent(new Event('input',{bubbles:true}));renderMain();
 check(document.querySelector('#preview .visual-block p').textContent==='*texto* [literal] C:\\notas <tag> `crase`','Literal text changed during visual round-trip');
 const inlineHost=document.createElement('div');inlineHost.innerHTML='<p><code></code></p>';inlineHost.querySelector('code').textContent='a ` b';
 check(markdown(visualMarkdown(inlineHost)).includes('<code>a ` b</code>'),'Code span backtick lost');

 // Image hydration changes the DOM without being a user edit.
 originalNote.body='[[Jardim de ideias|Jardim]]\n\nEditar este bloco';renderMain();preview=document.querySelector('#preview');
 preview.querySelector('button[data-follow-reference]').innerHTML='<span>Rótulo temporário</span>';
 blocks=preview.querySelectorAll('.visual-block');blocks[1].querySelector('p').textContent='Editado';blocks[1].dispatchEvent(new Event('input',{bubbles:true}));
 check(originalNote.body.startsWith('[[Jardim de ideias|Jardim]]\n\n'),'Unedited hydrated block was serialized');

 originalNote.body='visual';state.mode='split';render();
 preview=document.querySelector('#preview');const text=preview.querySelector('p').firstChild,range=document.createRange();range.selectNodeContents(text);getSelection().removeAllRanges();getSelection().addRange(range);
 preview.previousElementSibling.querySelector('[data-visual-format="bold"]').click();
 check(originalNote.body==='**visual**','Visual toolbar applied twice or affected wrong source');
 check(document.querySelector('#editor').value===originalNote.body,'Source did not synchronize after visual formatting');
 const source=document.querySelector('#editor');
 for(let i=0;i<5;i++){source.value='Texto '+i;source.dispatchEvent(new Event('input',{bubbles:true}))}
 check(document.querySelectorAll('.visual-toolbar').length===1,'Visual toolbars accumulated');
 preview=document.querySelector('#preview');const pasteTarget=preview.querySelector('.visual-block');pasteTarget.focus();
 const pasteRange=document.createRange();pasteRange.selectNodeContents(pasteTarget);pasteRange.collapse(false);getSelection().removeAllRanges();getSelection().addRange(pasteRange);
 let pasteCalls=0;const exec=document.execCommand.bind(document);document.execCommand=(command,...args)=>{if(command==='insertText')pasteCalls++;return exec(command,...args)};
 const data=new DataTransfer();data.setData('text/plain',' colado');pasteTarget.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));document.execCommand=exec;
 check(pasteCalls===1,'Paste listener duplicated after source updates');
 check(originalNote.body==='Texto 4 colado','Paste applied more than once');

 const editorRect=source.getBoundingClientRect(),previewRect=preview.getBoundingClientRect();
 check(editorRect.left<previewRect.left&&Math.abs(editorRect.top-previewRect.top)<3,'Split preview is on the wrong grid row');
 const sourceBar=source.previousElementSibling,visualBar=preview.previousElementSibling;
 check(Math.abs(sourceBar.getBoundingClientRect().top-visualBar.getBoundingClientRect().top)<3,'Split toolbars are not aligned');

 // Each source toolbar owns its editor even if a different pane is active.
 const other={...originalNote,id:'editor-second',title:'Segunda coluna',body:'segundo'};vault.notes.push(other);originalNote.body='primeiro';
 studio.panes=[{source:'vault',id:originalNote.id,mode:'edit'},{source:'vault',id:other.id,mode:'edit'}];studio.active=1;state.id=other.id;render();
 const firstEditor=document.querySelector('[data-pane-editor="0"]');firstEditor.setSelectionRange(0,8);
 firstEditor.previousElementSibling.querySelector('[data-format="bold"]').click();
 check(originalNote.body==='**primeiro**'&&other.body==='segundo','Formatting changed the wrong pane');
 firstEditor.setSelectionRange(firstEditor.value.length,firstEditor.value.length);firstEditor.previousElementSibling.querySelector('[data-format="table"]').click();
 const form=document.querySelector('#insert-table-form');check(form,'Table dialog missing');form.elements.columns.value='2';form.elements.rows.value='2';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 check(originalNote.body.includes('| Coluna 1 | Coluna 2 |'),'Table not inserted in the selected pane');
 check(other.body==='segundo','Table insertion changed inactive document');

 studio.panes=[];studio.files.clear();workbench.source='project';state.view='project';workbench.mode='split';
 const file={path:'Documento.md',name:'Documento.md',kind:'markdown',body:'projeto',savedBody:'projeto',dirty:false,size:7};
 workbench.project={name:'Teste',root:'test-editor',entries:[file]};workbench.file=file;workbench.tabs=[file.path];discovery.docs=[file];render();
 const projectEditor=document.querySelector('#project-editor');projectEditor.setSelectionRange(0,7);projectEditor.previousElementSibling.querySelector('[data-format="italic"]').click();
 check(file.body==='*projeto*'&&file.dirty&&file.savedBody==='projeto','Project formatting failed or saved implicitly');
 const projectPreview=document.querySelector('#project-preview'),projectRect=projectEditor.getBoundingClientRect(),projectPreviewRect=projectPreview.getBoundingClientRect();
 check(projectRect.left<projectPreviewRect.left&&Math.abs(projectRect.top-projectPreviewRect.top)<3,'Project split layout is misaligned');
 projectPreview.querySelector('.visual-block p').textContent='rascunho visual';projectPreview.querySelector('.visual-block').dispatchEvent(new Event('input',{bubbles:true}));
 check(file.body==='rascunho visual'&&projectEditor.value===file.body&&file.dirty,'Project visual draft did not synchronize');
 check(document.querySelector('#word-count').textContent==='2 palavras','Project visual word count stale');

 file.kind='text';file.name='Documento.txt';renderMain();check(!document.querySelector('.format-toolbar'),'Markdown toolbar shown for plain text');
 const before=file.body;formatSourceEditor('bold');check(file.body===before,'Markdown formatting modified plain text');
 workbench.source='vault';workbench.file=null;studio.files.clear();state.id=originalNote.id;state.mode='split';originalNote.title='Edição preservada';
 originalNote.body='# Ferramentas de escrita\n\n**Texto** com *formatação*, código `a` e [[Jardim de ideias|conexões]].\n\n'+markdownTableTemplate(2,3);state.view='notes';render();closeModal();
 return 'Visual editor: exact separators, code/HR/H6, literal round-trip, hydration, isolated formatting, single paste, table insertion, pane ownership, draft sync and split layout passed.';
}

app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  const result=await win.webContents.executeJavaScript('('+runEditorTests.toString()+')().catch(error=>({error:error.stack}))');
  if(result.error)throw Error(result.error);console.log(result);
  await new Promise(resolve=>setTimeout(resolve,400));
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../artifacts/editor-improvements.png'),(await win.webContents.capturePage()).toPNG());
  app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});
