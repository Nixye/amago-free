const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'amago-chrome-')));

app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:840,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 const run=code=>win.webContents.executeJavaScript(code);
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  await run("interfacePrefs().splashEnabled=false;finishStartup()");
  await run("closeModal();state.view='notes';state.mode='edit';render()");
  assert.match(await run("$('.brand').textContent"),/Âmago/);
  assert.equal(await run("!!$('.header-right [data-action=focus],.header-right [data-action=git-project],#save-state')"),false);
  assert.equal(await run("$('.header-right [data-action=commands] use').getAttribute('href')"),'#i-commands');
  const dot=()=>run("$('.note-category .document-save-dot').dataset.saveState");
  assert.equal(await dot(),'saved');
  await run("window.amagoDesktop={git:()=>{},save:()=>new Promise(resolve=>window.finishTestWrite=resolve)};nativeReady=true;$('#editor').value+='!';$('#editor').dispatchEvent(new Event('input',{bubbles:true}));clearTimeout(saveTimer)");
  assert.equal(await dot(),'dirty');
  await run('persist()');assert.equal(await dot(),'saving');
  await run("$('#editor').value+='?';$('#editor').dispatchEvent(new Event('input',{bubbles:true}));clearTimeout(saveTimer);finishTestWrite()");
  assert.equal(await dot(),'dirty');
  await run("persist();finishTestWrite()");assert.equal(await dot(),'saved');
  await run("nativeReady=false;workbench.source='project';workbench.project={name:'Projeto de teste',root:'teste',entries:[],gitRepository:true};const f={path:'Rascunhos/Design/Nota.md',name:'Nota.md',kind:'markdown',body:'Texto',savedBody:'Texto',size:5};workbench.file=f;studio.files.set(f.path,f);workbench.tabs=[f.path];state.view='project';render()");
  assert.equal(await run("$('#crumb-folder').textContent"),'Rascunhos / Design');
  assert.equal(await run("!!$('.header-right [data-action=git-project]')"),true);
  await run("workbench.project={...workbench.project,gitRepository:false};renderTree()");
  assert.equal(await run("!!$('.header-right [data-action=git-project]')"),false);
  await run("workbench.file.conflict=true;renderPaneStatus()");
  assert.equal(await run("$('.project-document-toolbar .document-save-dot').dataset.saveState"),'conflict');
  await run("workbench.source='vault';state.view='home';render()");
  assert.equal(await run("!!$('#main .document-save-dot')"),false);
  console.log('Document chrome: contextual Git, relative breadcrumb, commands icon and race-safe document save states passed.');
 }catch(error){console.error(error);process.exitCode=1}finally{win.destroy();app.exit(process.exitCode||0)}
});
