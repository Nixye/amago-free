const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'amago-metadata-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:900,height:780,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=code=>win.webContents.executeJavaScript(code);
 const screenshot=async name=>{
  await new Promise(resolve=>setTimeout(resolve,400));
  const dir=path.resolve(__dirname,'../artifacts');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'document-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  await run("(async()=>{interfacePrefs().splashEnabled=false;await finishStartup();closeModal();$('#startup-splash')?.remove();state.view='notes';state.mode='read';note().tags=[];note().title='Caderno de pesquisa';note().body='---\\r\\ndate: 2021-05-17\\r\\nother: preserved\\r\\naliases: [Pesquisa]\\r\\n---\\r\\n'+Array.from({length:75},(_,i)=>'Anotação '+i+' sobre #campo.').join('\\r\\n\\r\\n');render()})()");
  assert(await run("!$('.document-hint')&&!$('#studio-tools [data-action=focus]')&&!!$('.note-main [data-action=focus]')"));
  await run("const fav=$('.note-tools [data-action=favorite]');if(fav.getAttribute('aria-pressed')==='true')fav.click();$('.note-tools [data-action=favorite]').click()");
  assert(await run("$('.note-tools .starred').getAttribute('aria-pressed')==='true'&&getComputedStyle($('.note-tools .starred svg')).fill!=='none'"));
  await run("const view=$('.note-main');view.scrollTop=900;view.dispatchEvent(new Event('scroll'));");
  assert(await run("!$('#document-scroll-top').hidden"));
  await run("$('#document-scroll-top').click();");
  await new Promise(r=>setTimeout(r,1000));
  assert.equal(await run("$('.note-main').scrollTop"),0);
  await run("actions['edit-tags']();const entry=$('#add-document-tag');entry.value='gui';entry.dispatchEvent(new Event('input',{bubbles:true}))");
  assert(await run("$('#add-document-tag').list===null&&!$('#document-tag-options').hidden"));
  await screenshot('tag-picker');
  await run("$('#add-document-tag').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));$('#add-document-tag').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));");
  assert.equal(await run("$('#editable-tags [data-remove-tag]').dataset.removeTag"),'guia');
  await run("$('#add-document-tag').value='leituras/'+'longo'.repeat(65);$('#document-tag-form').requestSubmit();");
  assert(await run("AmagoSearch.metadata(note().body).tags.includes('guia')"));
  assert(await run("[...document.querySelectorAll('.document-tags .tag-chip')].every(el=>el.getBoundingClientRect().right<=document.querySelector('.note-meta').getBoundingClientRect().right+1)"));
  await run("actions['note-menu']();window.originalBody=note().body;$('#markdown-properties').requestSubmit()");
  assert.equal(await run("note().body===window.originalBody"),true);
  await run("actions['note-menu']();$('#markdown-properties').elements.aliases.value='Caderno, Campo';");
  await screenshot('properties');
  await run("$('#markdown-properties').requestSubmit();");
  assert(await run("note().body.includes('other: preserved\\r\\n')&&AmagoSearch.metadata(note().body).aliases.join(',')==='Caderno,Campo'"));
  win.setSize(480,650);
  await run("actions['edit-tags']();$('#add-document-tag').value='lon';$('#add-document-tag').dispatchEvent(new Event('input',{bubbles:true}))");
  assert(await run("$('.modal-body').scrollWidth<=$('.modal-body').clientWidth+1"));
  await screenshot('tag-narrow');
  await run("closeModal();studio.panes=[];studio.files.clear();workbench.source='project';state.view='project';workbench.mode='split';const file={path:'Pasta/Estudo.md',name:'Estudo.md',kind:'markdown',body:'---\\ntags: [ciência]\\nother: manter\\n---\\nOriginal',savedBody:'',version:'v1'};file.savedBody=file.body;workbench.project={name:'Pesquisa',root:'scope-test',entries:[file]};workbench.file=file;workbench.tabs=[file.path];discovery.docs=[file];window.projectAdapter.save=async(path,body)=>{window.savedMetadataBody=body;return {saved:true,version:'v2'}};render();actions['project-properties']();$('#markdown-properties').elements.aliases.value='Diário de campo';$('#markdown-properties').requestSubmit()");
  await new Promise(resolve=>setTimeout(resolve,100));
  assert(await run("window.savedMetadataBody.includes('other: manter')&&AmagoSearch.metadata(window.savedMetadataBody).aliases.includes('Diário de campo')"));
  assert.equal(await run("document.querySelectorAll('#main [data-action=focus]').length"),1);
  console.log('Document polish: favorite, scroll return, stylesheet tag picker, keyboard selection, long tags, changed-only Markdown metadata and compact layouts passed.');
 }catch(e){console.error(e);process.exitCode=1}finally{win.destroy();app.exit(process.exitCode||0)}
});
