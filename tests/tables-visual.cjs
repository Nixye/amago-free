const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-tables-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',event=>{if(event.level==='error')console.error(event.message)});
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  const result=await win.webContents.executeJavaScript(String.raw`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   interfacePrefs().splashEnabled=false;await finishStartup();
   await new Promise(resolve=>setTimeout(resolve,1500));
   document.querySelector('#startup-splash')?.remove();closeModal();
   const front='---\ncustom: preserve\ntags: [teste]\n---\n';
   const table='| Projeto | Estado | Valor |\n| :--- | :---: | ---: |\n| [[Jardim de ideias|Jardim]] | **Em andamento** | 42 |\n| Texto | a\\|b | \\*literal\\* |';
   state.view='notes';state.mode='read';note().body=front+table+'\n\nParágrafo preservado.';render();
   let preview=document.querySelector('#preview');
   check(preview.querySelectorAll('table').length===1,'Personal preview table missing');
   check(preview.querySelectorAll('tbody tr')[1].cells[1].textContent==='a|b','Escaped pipe rendering');
   const cell=preview.querySelector('tbody tr').cells[2];
   cell.textContent='100';cell.dispatchEvent(new Event('input',{bubbles:true}));
   check(note().body.startsWith(front),'Frontmatter changed');
   check(note().body.endsWith('Parágrafo preservado.'),'Other block changed');
   check(note().body.includes('[[Jardim de ideias|Jardim]]'),'Wikilink lost');
   check(note().body.includes('| :--- | :---: | ---: |'),'Alignment lost');
   check(note().body.includes('**Em andamento**'),'Formatting lost');
   renderMain();preview=document.querySelector('#preview');
   check(preview.querySelector('tbody tr').cells[2].textContent==='100','Visual edit did not survive render');
   check(preview.querySelectorAll('tbody tr')[1].cells[1].textContent==='a|b','Literal pipe did not survive edit');
   check(preview.querySelectorAll('tbody tr')[1].cells[2].textContent==='*literal*','Escaped punctuation did not survive edit');
   // Editing literal punctuation must not introduce links or emphasis.
   const literal=preview.querySelectorAll('tbody tr')[1].cells[0];
   literal.textContent='[literal] * text | C:\\notes';literal.dispatchEvent(new Event('input',{bubbles:true}));renderMain();
   check(document.querySelectorAll('#preview tbody tr')[1].cells[0].textContent==='[literal] * text | C:\\notes','Literal characters changed');
   const untouched=note().body;
   document.querySelector('#preview .visual-block:last-child').textContent='Novo parágrafo';
   document.querySelector('#preview .visual-block:last-child').dispatchEvent(new Event('input',{bubbles:true}));
   check(note().body.split('\n\n')[0]===untouched.split('\n\n')[0],'Untouched table source changed');
   // Project previews use the same renderer; editing only dirties the open draft.
   workbench.source='project';workbench.file={path:'Tabela.md',name:'Tabela.md',title:'Tabela',kind:'markdown',body:table,savedBody:table};
   const host=document.createElement('div');host.innerHTML='<textarea></textarea><div id="project-preview" class="markdown"></div>';document.body.append(host);mountVisualEditors();
   const projectCell=host.querySelector('tbody tr').cells[2];projectCell.textContent='7';projectCell.dispatchEvent(new Event('input',{bubbles:true}));
   check(workbench.file.dirty&&workbench.file.body.includes('| 7 |'),'Project draft was not updated');
   check(workbench.file.savedBody===table,'Project edit changed saved baseline');host.remove();workbench.source='vault';workbench.file=null;
   state.mode='split';render();
   const editor=document.querySelector('#editor');editor.value=front+table;editor.dispatchEvent(new Event('input',{bubbles:true}));
   check(document.querySelector('#preview table'),'Split preview missing after typing');
   const saved=note().body;check(saved===front+table,'Source editor unexpectedly rewrote Markdown');
   // Many columns stay inside a horizontally scrollable table region.
   const wide='| '+Array.from({length:12},(_,i)=>'Coluna '+i).join(' | ')+' |\n| '+Array(12).fill('---').join(' | ')+' |\n| '+Array(12).fill('Conteúdo').join(' | ')+' |';
   const small=document.createElement('div');small.className='markdown';small.style.width='320px';small.innerHTML=markdown(wide);document.body.append(small);
   const region=small.querySelector('.markdown-table-scroll');check(region.scrollWidth>region.clientWidth,'Wide table is not scrollable');check(region.getBoundingClientRect().width<=322,'Wide table escapes its container');small.remove();
   state.mode='read';
   note().body='~~~~md\n'+String.fromCharCode(96).repeat(3)+'\n\n'+table+'\n~~~~';renderMain();
   check(!document.querySelector('#preview table'),'A fenced example became an editable table');
   note().body=front+table;render();closeModal();
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   return 'Visual tables: personal/project drafts, alignment, links, literal characters, source preservation, split preview and overflow passed.';
  })().catch(error=>({error:error.stack}))`);
  if(result.error)throw Error(result.error);
  console.log(result);
  await new Promise(resolve=>setTimeout(resolve,500));
  await win.webContents.executeJavaScript('closeModal()');
  await new Promise(resolve=>setTimeout(resolve,300));
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  fs.writeFileSync(path.resolve(__dirname,'../artifacts/tables-preview.png'),(await win.webContents.capturePage()).toPNG());
  app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});
