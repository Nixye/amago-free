const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'amago-library-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:1440,height:940,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,sandbox:true}});
 const run=code=>win.webContents.executeJavaScript(code);
 async function capture(name){
  await new Promise(resolve=>setTimeout(resolve,180));const image=await win.webContents.capturePage();
  const out=path.resolve(__dirname,'../artifacts');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'library-'+name+'.png'),image.toPNG());
 }
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  await run(`(async()=>{interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(resolve=>setTimeout(resolve,1500));closeModal();$('#startup-splash')?.remove();state.view='home';render()})()`);
  assert(await run("!!$('.library-feature')"));
  const hasOverflow=()=>run("$('.library-page').scrollWidth>$('.library-page').clientWidth+1");
  assert(!await hasOverflow());assert(!await run("!!$('.modal')"));await capture('desktop');
  await run("$('[data-library-section=favorites]').click()");
  assert(await run("$('.library-documents').querySelectorAll('.library-note').length===vault.notes.filter(d=>d.favorite).length"));
  await run("$('[data-library-section=recent]').click();$('[data-library-folder]').click()");
  assert(await run("!!$('.library-filter')&&[...document.querySelectorAll('.library-note')].every(b=>vault.notes.find(n=>n.id===b.dataset.note).folder===libraryView.folder)"));
  await run("$('.library-filter').click();vault.skin=themeCatalog().find(t=>t.mode==='light').id;applyTheme();renderMain()");
  await capture('light');win.setSize(730,850);await new Promise(resolve=>setTimeout(resolve,120));
  assert(!await hasOverflow());await capture('compact');
  await run("$('.library-feature').click()");assert(await run("state.view==='notes'"));

  await run("vault.folders.push('Arquivar','Arquivar/Vazia');const doc={...note(),id:'trash-fixture',title:'Rascunho descartado',folder:'Arquivar',body:'Teste'};vault.notes.push(doc);window.trashFixture={project:false,folder:true,path:'Arquivar'};startFileOperation(trashFixture,'remove')");
  assert(await run("$('#apply-file-operation').textContent.includes('Enviar para a lixeira')"));await run("$('#apply-file-operation').previousElementSibling.click()");
  assert(await run("vault.notes.some(n=>n.id==='trash-fixture')"));
  await run("startFileOperation(trashFixture,'remove')");await run("$('#apply-file-operation').click()");
  await run("actions.trash()");assert(await run("document.querySelectorAll('[data-library-restore]').length===1"));
  await run("$('[data-purge-trash]').click();$('#keep-trash').click();$('[data-library-restore]').click()");
  assert(await run("vault.folders.includes('Arquivar/Vazia')&&vault.notes.some(n=>n.id==='trash-fixture')"));
  await run("closeModal();startFileOperation(trashFixture,'purge')");await run("$('#apply-file-operation').previousElementSibling.click()");assert(await run("vault.folders.includes('Arquivar')"));
  await run("startFileOperation(trashFixture,'purge')");await run("$('#apply-file-operation').click()");
  assert(!await run("vault.folders.includes('Arquivar')||vault.trash.some(n=>n.id==='trash-fixture')"));
  console.log('Library: filters, document navigation, light/dark and narrow layouts passed.');
 }catch(error){console.error(error);process.exitCode=1}finally{win.destroy();app.exit(process.exitCode||0)}
});
