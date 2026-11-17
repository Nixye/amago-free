const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-focus-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 try{
  // Validate the real main-process handler, including sender/argument checks.
  let nativeHandler;
  const main=fs.readFileSync(path.resolve(__dirname,'../desktop/main.cjs'),'utf8');
  const start=main.indexOf("ipcMain.handle('window:fullscreen'");
  vm.runInNewContext(main.slice(start,main.indexOf("win.on('enter-full-screen'",start)),{ipcMain:{handle:(_name,handler)=>nativeHandler=handler},trusted:event=>event.authorized===true,win});
  assert.throws(()=>nativeHandler({authorized:false},true),/Invalid/);
  assert.throws(()=>nativeHandler({authorized:true},'true'),/Invalid/);
  nativeHandler({authorized:true},true);assert.equal(win.isFullScreen(),true);
  nativeHandler({authorized:true},false);assert.equal(win.isFullScreen(),false);
  let appearanceHandler;const theme={themeSource:'dark'},appearanceStart=main.indexOf("ipcMain.handle('appearance:set'");
  vm.runInNewContext(main.slice(appearanceStart,main.indexOf("ipcMain.handle('window:control'",appearanceStart)),{ipcMain:{handle:(_name,handler)=>appearanceHandler=handler},trusted:event=>event.authorized===true,nativeTheme:theme,acrylicSupported:false,win:{setBackgroundColor(){},setBackgroundMaterial(){}}});
  appearanceHandler({authorized:true},{enabled:false,theme:'light',followSystem:true});assert.equal(theme.themeSource,'system');
  appearanceHandler({authorized:true},{enabled:false,theme:'dark'});assert.equal(theme.themeSource,'system');
  appearanceHandler({authorized:true},{enabled:false,theme:'dark',followSystem:false});assert.equal(theme.themeSource,'dark');
  assert.throws(()=>appearanceHandler({authorized:true},{enabled:false,theme:'dark',followSystem:'yes'}),/Invalid/);
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  const result=await win.webContents.executeJavaScript(String.raw`(async()=>{
   const check=(condition,message)=>{if(!condition)throw Error(message)};
   interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(resolve=>setTimeout(resolve,1500));closeModal();document.querySelector('#startup-splash')?.remove();
   let nativeFull=false;const calls=[];
   window.amagoDesktop={fullscreen:async value=>{if(value!==undefined){nativeFull=value;calls.push(value)}return {fullscreen:nativeFull}}};
   state.view='notes';state.mode='edit';note().title='Um espaço para pensar';note().body='# Ideias em movimento\n\nUm documento ocupa o centro. Os controles ficam por perto, quando você precisa deles.\n\n## Próximos passos\n\n- [ ] Escrever com tranquilidade\n- [ ] Conectar uma nova ideia\n\n| Projeto | Estado |\n| --- | --- |\n| Âmago | Em movimento |';render();
   const prefs=JSON.stringify(interfacePrefs()),editor=document.querySelector('#editor');editor.focus();editor.setSelectionRange(3,8);const body=note().body;
   await enterDocumentFocus();
   check(document.body.classList.contains('focus-mode'),'Focus not active');
   check(calls.at(-1)===true,'Native fullscreen was not requested');
   check(document.querySelector('#editor')===editor,'Entering focus replaced the editor');
   check(editor.selectionStart===3&&editor.selectionEnd===8,'Selection was lost');
   check(getComputedStyle(document.querySelector('.sidebar')).display==='none','Sidebar still visible');
   check(JSON.stringify(interfacePrefs())===prefs,'Focus mutated workspace preferences');
   document.querySelector('[data-focus-mode="read"]').click();
   check(document.querySelector('#preview .visual-block').contentEditable==='false','Read mode permits edits');
   check(document.querySelector('#note-title').readOnly,'Read mode permits title edits');
   check(getComputedStyle(document.querySelector('.visual-toolbar')).display==='none','Read toolbar still visible');
   check(note().body===body,'Mode transition modified document');
   showFocusAppearance();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   check(!document.querySelector('.modal')&&documentFocus.active,'Escape should close the dialog first');
   document.querySelector('[data-focus-mode="split"]').click();
   check(document.querySelector('#preview .visual-block').contentEditable==='true','Split visual editor disabled');
   document.querySelector('#editor').value+='\n\nNovo rascunho';document.querySelector('#editor').dispatchEvent(new Event('input',{bubbles:true}));
   await exitDocumentFocus();
   check(!documentFocus.active&&!nativeFull,'Leaving focus did not restore window');
   check(note().body.endsWith('Novo rascunho'),'Leaving focus lost edits');
   check(JSON.stringify(interfacePrefs())===prefs,'Leaving focus changed layout preferences');
   // An already-fullscreen window is owned by the user and must stay fullscreen.
   nativeFull=true;await enterDocumentFocus();await exitDocumentFocus();check(nativeFull,'Pre-existing fullscreen was exited');nativeFull=false;
   // A denied fullscreen request still provides a usable focus view.
   window.amagoDesktop.fullscreen=async value=>{if(value===true)throw Error('Indisponível');return {fullscreen:false}};
   await enterDocumentFocus();check(documentFocus.active,'Fullscreen denial prevented focus');await exitDocumentFocus();
   window.amagoDesktop.fullscreen=async value=>{if(value!==undefined)nativeFull=value;return {fullscreen:nativeFull}};
   // Keep the active column and its draft; don't collapse or rewrite the layout.
   const other=vault.notes.find(n=>n.id!==state.id);studio.panes=[{source:'vault',id:state.id,mode:'edit'},{source:'vault',id:other.id,mode:'edit'}];studio.active=1;state.id=other.id;render();const panes=JSON.stringify(studio.panes);
   await enterDocumentFocus();check(document.querySelectorAll('.editing-pane.focus-active-pane').length===1,'Active focus column missing');
   check(getComputedStyle(document.querySelector('.editing-pane:not(.focus-active-pane)')).display==='none','Inactive column visible');
   document.querySelector('[data-focus-mode="read"]').click();document.querySelector('[data-focus-mode="edit"]').click();check(document.activeElement===document.querySelector('[data-pane-editor="1"]'),'Focus edit did not focus active column');
   await exitDocumentFocus();check(JSON.stringify(studio.panes)===panes,'Focus changed column configuration');studio.panes=[];
   // Text files receive a real read-only mode and retain dirty drafts on exit.
   workbench.source='project';workbench.project={name:'Projeto',root:'focus-test',entries:[{path:'rascunho.txt',name:'rascunho.txt',kind:'text'}]};
   workbench.file={path:'rascunho.txt',name:'rascunho.txt',kind:'text',body:'Texto sem salvar',savedBody:'Texto',dirty:true,size:16};workbench.tabs=['rascunho.txt'];state.view='project';render();
   await enterDocumentFocus();document.querySelector('[data-focus-mode="read"]').click();check(document.querySelector('#project-editor').readOnly,'Text file is not read-only');
   const readText=document.querySelector('#project-editor');readText.focus();readText.setSelectionRange(1,1);readText.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));check(workbench.file.body==='Texto sem salvar','Tab modified a read-only file');
   await exitDocumentFocus();check(!document.querySelector('#project-editor').readOnly,'Text file remained locked');check(workbench.file.dirty&&workbench.file.body==='Texto sem salvar','Text draft lost');
   // Screenshot of an ordinary Markdown reading session.
   workbench.file=null;studio.files.clear();workbench.source='vault';state.id=vault.notes[0].id;state.view='notes';state.mode='read';render();await enterDocumentFocus();
   document.querySelector('#toast').classList.remove('show');
   return 'Focus: native fullscreen validation, editor/selection preservation, true reading, modes, Escape, denied fullscreen, columns, draft retention and layout restoration passed.';
  })().catch(error=>({error:error.stack}))`);
  if(result.error)throw Error(result.error);console.log(result);
  await new Promise(resolve=>setTimeout(resolve,400));
  const dir=path.resolve(__dirname,'../artifacts');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'focus-preview.png'),(await win.webContents.capturePage()).toPNG());
  win.setContentSize(840,780);
  const compact=await win.webContents.executeJavaScript(String.raw`(async()=>{
   document.querySelector('[data-focus-mode="split"]').click();
   await new Promise(resolve=>setTimeout(resolve,150));
   const bar=document.querySelector('#focus-toolbar'),exit=bar.querySelector('[data-focus-exit]').getBoundingClientRect();
   if(bar.scrollWidth>innerWidth||exit.right>innerWidth||exit.left<0)throw Error('Compact focus controls overflow');
   if(!document.querySelector('#editor')||!document.querySelector('#preview'))throw Error('Split focus missing editor/preview');
   return true;
  })()`);assert.equal(compact,true);
  fs.writeFileSync(path.join(dir,'focus-split-compact.png'),(await win.webContents.capturePage()).toPNG());
  win.setContentSize(1440,960);
  await win.webContents.executeJavaScript("vault.theme='light';state.mode='read';render();document.querySelector('#toast').classList.remove('show')");
  await new Promise(resolve=>setTimeout(resolve,200));fs.writeFileSync(path.join(dir,'focus-light.png'),(await win.webContents.capturePage()).toPNG());
  app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});
