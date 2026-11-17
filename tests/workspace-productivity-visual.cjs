const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-productivity-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',event=>{if(event.level==='error')console.error(event.message)});
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  const loaded=await win.webContents.executeJavaScript('typeof productivityWorkspaceKey');
  if(loaded==='undefined')await win.webContents.executeJavaScript(fs.readFileSync(path.resolve(__dirname,'../dist/workspace-productivity.js'),'utf8'));
  const result=await win.webContents.executeJavaScript(String.raw`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const key=(target,name,extras={})=>target.dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true,...extras}));
   interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(r=>setTimeout(r,1500));document.querySelector('#startup-splash')?.remove();closeModal();
   // Searches keep exact hybrid syntax, kind filters and workspace boundaries.
   workbench.source='vault';workbench.query='tag:ideia -content:"rascunho antigo"';workbench.filter=null;search();
   check(!!document.querySelector('#saved-searches'),'Saved search controls missing');
   document.querySelector('#save-search-form input').value='Ideias ativas';document.querySelector('#save-search-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   const saved=productivityPreferences().searches[0];check(saved.title==='Ideias ativas','Search was not saved');
   workbench.query='outro';document.querySelector('[data-saved-search]').click();check(workbench.query===saved.query,'Query changed when restored');
   workbench.source='project';workbench.project={root:'test-a',name:'Teste',entries:[]};check(productivityPreferences().searches.length===0,'Saved searches leaked into project');
   workbench.source='vault';closeModal();search();document.querySelector('[data-delete-search]').click();check(productivityPreferences().searches.length===0,'Search was not removed');closeModal();
   // Each nested directory is sorted independently; underlying arrays stay intact.
   workbench.source='project';workbench.project.entries=[{kind:'markdown',path:'z.md',name:'z.md',updated:'2026-02-01'},{kind:'directory',path:'Pasta',name:'Pasta',children:[{kind:'markdown',path:'Pasta/Nota 10.md',name:'Nota 10.md'},{kind:'markdown',path:'Pasta/Nota 2.md',name:'Nota 2.md'}]},{kind:'markdown',path:'a.md',name:'a.md',updated:'2026-01-01'}];
   workbench.expanded.add('Pasta');productivityPreferences().sort='name';renderTree();
   let entries=[...document.querySelectorAll('.workspace-tree .project-entry')].map(e=>e.dataset.projectFile||e.dataset.projectDir);
   check(entries.join(',')==='Pasta,Pasta/Nota 2.md,Pasta/Nota 10.md,a.md,z.md','Explorer hierarchy or natural order incorrect');
   document.querySelector('.explorer-sort select').value='updated';document.querySelector('.explorer-sort select').dispatchEvent(new Event('change',{bubbles:true}));
   entries=[...document.querySelectorAll('.workspace-tree>.project-node>.project-entry')].map(e=>e.dataset.projectFile||e.dataset.projectDir);check(entries.join(',')==='Pasta,z.md,a.md','Recent sort incorrect');
   check(workbench.project.entries[0].path==='z.md','Sorting mutated source tree');
   document.querySelector('.explorer-sort select').value='name-desc';document.querySelector('.explorer-sort select').dispatchEvent(new Event('change',{bubbles:true}));
   entries=[...document.querySelectorAll('.workspace-tree .project-entry')].map(e=>e.dataset.projectFile||e.dataset.projectDir);check(entries.join(',')==='Pasta,Pasta/Nota 10.md,Pasta/Nota 2.md,z.md,a.md','Descending name sort incorrect');
   // Project draft markers update after edits and saves, including cached columns.
   workbench.project.entries=[{kind:'markdown',path:'a.md',name:'a.md',size:12},{kind:'markdown',path:'b.md',name:'b.md',size:12}];
   window.projectAdapter.read=async path=>({path,body:'# '+path,version:'v1'});
   window.projectAdapter.save=async()=>({version:'v2'});
   studio.panes=[];studio.files.clear();workbench.tabs=['a.md','b.md'];workbench.file={...workbench.project.entries[0],body:'edit',savedBody:'old',dirty:true};
   studio.files.set('b.md',{...workbench.project.entries[1],body:'edit b',savedBody:'old b',dirty:true});state.view='project';renderTabs();
   check(document.querySelectorAll('.tab-draft-indicator').length===2,'Draft indicators missing for active/cached documents');
   await saveProjectFile();check(document.querySelectorAll('.tab-draft-indicator').length===0,'Saved indicators did not clear');
   workbench.file.dirty=true;workbench.file.conflict=true;markFileStatus('Conflito');check(document.querySelector('.tab-draft-indicator').textContent==='!','Conflict marker missing');workbench.file.dirty=false;workbench.file.conflict=false;
   // Reopen restores the prior tab position and does not cross workspace boundaries.
   for(let i=0;i<12;i++)rememberClosedTab('test-limit',String(i),i);check(closedWorkspaceTabs.get('test-limit').length===10&&closedWorkspaceTabs.get('test-limit')[0].id==='2','Closed tabs history was not bounded');closedWorkspaceTabs.delete('test-limit');
   await closeProjectTab('b.md');check(!workbench.tabs.includes('b.md'),'Project tab failed to close');await reopenClosedWorkspaceTab();
   check(workbench.tabs.join(',')==='a.md,b.md'&&workbench.file.path==='b.md','Project tab failed to reopen');
   await closeProjectTab('b.md');workbench.project.root='test-b';await reopenClosedWorkspaceTab();check(!workbench.tabs.includes('b.md'),'Closed tab leaked across projects');workbench.project.root='test-a';
   workbench.project.entries=workbench.project.entries.filter(e=>e.path!=='b.md');await reopenClosedWorkspaceTab();check(!workbench.tabs.includes('b.md'),'Unavailable file reopened');
   window.projectAdapter.save=async()=>({conflict:true});workbench.file.dirty=true;
   const before=closedWorkspaceTabs.get(productivityWorkspaceKey())?.length||0;await closeProjectTab('a.md');check(workbench.tabs.includes('a.md'),'Conflicted tab was closed');check((closedWorkspaceTabs.get(productivityWorkspaceKey())?.length||0)===before,'Conflicted close entered reopen history');
   workbench.file.dirty=false;workbench.file.conflict=false;studio.files.clear();workbench.source='vault';studio.panes=[];state.tabs=vault.notes.slice(0,2).map(n=>n.id);state.id=state.tabs[0];const personal=state.tabs[1];closePersonalTab(personal);key(document.body,'T',{ctrlKey:true,shiftKey:true});await new Promise(r=>setTimeout(r,50));check(state.tabs.includes(personal),'Ctrl Shift T did not reopen personal tab');
   // Dialog focus wraps in both directions, cannot escape and returns to its opener.
   const opener=document.querySelector('[data-action="commands"]');opener.focus();modal('Teste','<input id="dialog-first"><button id="dialog-last">Último</button>');await new Promise(r=>setTimeout(r,50));
   const dialog=document.querySelector('.modal'),items=dialogFocusable(dialog);items[0].focus();key(items[0],'Tab',{shiftKey:true});check(document.activeElement===items.at(-1),'Backward focus wrap failed');
   key(items.at(-1),'Tab');check(document.activeElement===items[0],'Forward focus wrap failed');opener.focus();check(dialog.contains(document.activeElement),'Focus escaped modal: '+document.activeElement.outerHTML);
   modal('Segundo diálogo','<button>Voltar</button>');closeModal();check(document.activeElement===opener,'Nested modal lost original opener');
   // The same searchable palette exposes relevant commands in both workspaces.
   actions.commands();const query=document.querySelector('#command-query');query.value='reabrir';query.dispatchEvent(new Event('input'));check(document.querySelectorAll('[data-palette-index]').length===1,'Palette filtering failed');
   query.value='';query.dispatchEvent(new Event('input'));key(query,'ArrowDown');check(document.querySelector('#palette-command-1').getAttribute('aria-selected')==='true','Palette arrow navigation failed');
   const selected=document.querySelector('#palette-command-1');selected.focus();key(selected,'End');check(document.activeElement===document.querySelector('[data-palette-index]:last-child'),'Palette End navigation failed');key(document.activeElement,'Home');check(document.activeElement.id==='palette-command-0','Palette Home navigation failed');
   query.value='configuracoes';query.dispatchEvent(new Event('input'));check(document.querySelector('[data-palette-index] strong').textContent==='Configurações','Palette accent normalization failed');
   query.value='no-command-xyz';query.dispatchEvent(new Event('input'));check(document.querySelector('#command-list [role="status"]')&&!query.hasAttribute('aria-activedescendant'),'Palette empty state not accessible');closeModal();
   workbench.source='project';let saves=0;workActions.save=async()=>{saves++};actions.commands();
   const projectQuery=document.querySelector('#command-query');projectQuery.value='salvar arquivos';projectQuery.dispatchEvent(new Event('input'));key(projectQuery,'Enter');await new Promise(r=>setTimeout(r,30));check(saves===1,'Project palette did not execute project save');
   actions.commands();const projectQuery2=document.querySelector('#command-query');projectQuery2.value='diário';projectQuery2.dispatchEvent(new Event('input'));check(!document.querySelector('[data-palette-index]'),'Personal-only command leaked into project');closeModal();
   return 'Workspace productivity UI: saved queries, isolated sorting, reopen/conflict handling, draft tabs, modal focus and unified keyboard palette passed.';
  })().catch(error=>({error:error.stack}))`);
  if(result.error)throw Error(result.error);console.log(result);app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});
