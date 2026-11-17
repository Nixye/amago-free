const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-editor-ops-')));
async function runOperationsTests(){
 const check=(value,message)=>{if(!value)throw Error(message)},key=(editor,value,options={})=>editor.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options}));
 interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(resolve=>setTimeout(resolve,1500));closeModal();
 studio.panes=[];workbench.source='vault';state.view='notes';state.mode='edit';const doc=note();
 const raw='\uFEFF---\r\nx: y\r\n...\r\n# Cabeçalho\r\n\r\nTexto  \r\n';doc.body=raw;render();
 const downloads=[],originalDownload=download;download=(...args)=>downloads.push(args);actions['export-note']();
 check(downloads.at(-1)[1]===raw,'Export altered source');
 workbench.file={name:'dados.json',path:'dados.json',kind:'text',body:'{"x":1}'};workActions['export-draft']();
 check(downloads.at(-1)[0]==='dados-rascunho.json'&&downloads.at(-1)[1]==='{"x":1}','Draft export lost extension/content');
 const paneFile={name:'log.txt',path:'log.txt',kind:'text',body:'a\r\nb'};studio.files.set('log.txt',paneFile);studio.panes=[{source:'project',id:'log.txt'}];
 const exportButton=document.createElement('button');exportButton.dataset.paneExport='0';document.body.append(exportButton);exportButton.click();exportButton.remove();
 check(downloads.at(-1)[0]==='log-rascunho.txt'&&downloads.at(-1)[1]==='a\r\nb','Pane draft export failed');download=originalDownload;studio.panes=[];studio.files.clear();workbench.file=null;

 const before=vault.notes.length,bad={format:'amago-v1',notes:[{title:'Partial should not exist',body:'one'},{title:'bad'}]};
 const reports=await importDocumentFiles([new File([JSON.stringify(bad)],'bad.json'),new File([raw],'original.md'),new File([new Uint8Array([0xff])],'invalid.md')]);
 check(vault.notes.length===before+1&&!vault.notes.some(n=>n.title==='Partial should not exist'),'Invalid import partially changed vault');
 check(reports[0].error&&reports[1].count===1&&reports[2].error,'Import reporting inaccurate');check(vault.notes.at(-1).body===raw,'Import removed BOM/H1/whitespace');

 doc.body='um\ndois\ntrês';state.mode='edit';renderMain();let editor=document.querySelector('#editor');editor.focus();editor.setSelectionRange(0,8);key(editor,'Tab');
 check(doc.body==='  um\n  dois\ntrês','Tab replaced selected lines');key(editor,'Tab',{shiftKey:true});check(doc.body==='um\ndois\ntrês','Shift Tab failed to reverse indentation');
 doc.body='  - [x] Feito';renderMain();editor=document.querySelector('#editor');editor.focus();editor.setSelectionRange(editor.value.length,editor.value.length);key(editor,'Enter');
 check(doc.body==='  - [x] Feito\n  - [ ] ','Task list did not continue/reset');key(editor,'Enter');check(doc.body==='  - [x] Feito\n','Empty list item did not exit');
 doc.body='9. item';renderMain();editor=document.querySelector('#editor');editor.setSelectionRange(7,7);key(editor,'Enter');check(doc.body==='9. item\n10. ','Ordered continuation failed');
 const immutable=doc.body;key(editor,'Enter',{isComposing:true});check(doc.body===immutable,'IME composition was intercepted');

 doc.body='seleção';renderMain();editor=document.querySelector('#editor');editor.focus();editor.setSelectionRange(0,7);key(editor,'b',{ctrlKey:true});check(doc.body==='**seleção**','Ctrl B failed');key(editor,'b',{ctrlKey:true});check(doc.body==='seleção','Ctrl B did not toggle');key(editor,'i',{ctrlKey:true});check(doc.body==='*seleção*','Ctrl I failed');
 editor.readOnly=true;const readonly=doc.body;key(editor,'Tab');key(editor,'b',{ctrlKey:true});check(doc.body===readonly,'Readonly editor changed');editor.readOnly=false;

 const taskBody='\uFEFF---\r\nx: y\r\n---\r\n```md\r\n- [ ] Exemplo\r\n```\r\n\r\n<!--\r\n- [ ] Comentário\r\n-->\r\n\r\n- [ ] Real  \r\n';
 doc.body=taskBody;state.mode='read';renderMain();let preview=document.querySelector('#preview');
 let task=preview.querySelector('input[data-document-task-line]');check(task&&!task.disabled,'Editable preview task not interactive');check(preview.querySelectorAll('input[data-document-task-line]').length===1,'Example/comment task incorrectly interactive');task.click();
 check(doc.body===taskBody.replace('- [ ] Real','- [x] Real'),'Task toggle changed more than its marker');
 documentFocus.active=true;state.mode='read';renderMain();await Promise.resolve();task=document.querySelector('#preview input[data-document-task-line]');
 check(task.disabled,'Focus read task is enabled');const focusBody=doc.body;task.click();check(doc.body===focusBody,'Focus read task changed source');documentFocus.active=false;refreshFocus();

 const project={path:'Tarefas.md',name:'Tarefas.md',kind:'markdown',body:taskBody,savedBody:taskBody,dirty:false,size:taskBody.length};
 workbench.source='project';workbench.project={name:'Fixture',root:'ops-test',entries:[project]};workbench.file=project;workbench.tabs=[project.path];discovery.docs=[project];state.view='project';workbench.mode='read';render();
 document.querySelector('#project-preview input[data-document-task-line]').click();
 check(project.dirty&&project.body===taskBody.replace('- [ ] Real','- [x] Real')&&project.savedBody===taskBody,'Task preview did not preserve project draft baseline');

 workbench.source='vault';workbench.file=null;studio.files.clear();state.view='notes';state.mode='read';state.id=doc.id;
 const code='const x = `valor`;\n  linha com espaços  ';doc.body='Intro\n```js\n'+code+'\n```\nFim';render();
 let copied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text}}});
 document.querySelector('[data-code-copy]').click();await Promise.resolve();check(copied===code,'Code copy included controls/fences or lost whitespace');
 preview=document.querySelector('#preview');preview.querySelector('p').textContent='Alterado';preview.querySelector('.visual-block').dispatchEvent(new Event('input',{bubbles:true}));
 check(!doc.body.includes('Copiar código')&&doc.body.includes(code),'Code controls polluted serialized source');
 navigator.clipboard.writeText=async()=>{throw Error('Denied')};await copyEditorText(code,'Código');check(document.querySelector('.clipboard-fallback').value===code,'Copy fallback lost code');closeModal();

 doc.body='feito';state.mode='split';renderMain();editor=document.querySelector('#editor');editor.setSelectionRange(0,5);editor.previousElementSibling.querySelector('[data-format="strike"]').click();
 check(doc.body==='~~feito~~'&&document.querySelector('#preview del'),'Strikethrough source command failed');
 const del=document.querySelector('#preview del');del.textContent='refeito';del.dispatchEvent(new Event('input',{bubbles:true}));check(doc.body==='~~refeito~~','Visual strikethrough was lost');
 doc.title='Ferramentas de Markdown';doc.body='# Escrita com menos passos\n\n~~Revisar o exemplo~~\n\n- [x] Exportação fiel\n- [ ] Próxima tarefa\n\n```js\nconst ideia = "continuar";\n```';state.mode='split';render();closeModal();
 return 'Editor operations UI: exports/import atomicity, multiline indentation, list continuation, keyboard toggles, readonly guards, exact tasks, project drafts, code copy/fallback and strikethrough passed.';
}
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 try{await win.loadFile(path.resolve(__dirname,'../dist/index.html'));const result=await win.webContents.executeJavaScript('('+runOperationsTests.toString()+')().catch(error=>({error:error.stack}))');if(result.error)throw Error(result.error);console.log(result);await new Promise(resolve=>setTimeout(resolve,400));fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../artifacts/editor-operations.png'),(await win.webContents.capturePage()).toPNG());app.exit(0)}catch(error){console.error(error);app.exit(1)}
});
