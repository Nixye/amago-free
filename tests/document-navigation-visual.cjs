const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-document-navigation-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  if(!await win.webContents.executeJavaScript('typeof AmagoDocumentNavigation!=="undefined"'))await win.webContents.executeJavaScript(fs.readFileSync(path.resolve(__dirname,'../dist/document-navigation-core.js'),'utf8'));
  if(!await win.webContents.executeJavaScript('typeof openDocumentFind!=="undefined"'))await win.webContents.executeJavaScript(fs.readFileSync(path.resolve(__dirname,'../dist/document-navigation.js'),'utf8'));
  await win.webContents.insertCSS(fs.readFileSync(path.resolve(__dirname,'../dist/document-navigation.css'),'utf8'));
  const result=await win.webContents.executeJavaScript(String.raw`(async()=>{
   const check=(ok,label)=>{if(!ok)throw Error(label)};
   interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(resolve=>setTimeout(resolve,1500));document.querySelector('#startup-splash')?.remove();closeModal();
   workbench.source='vault';state.view='notes';state.mode='read';state.tag=null;studio.panes=[];
   note().body='# First\n\nAlpha alpha $&\n\n## Second';render();
   check(document.querySelector('.document-navigation-tools'),'Navigation toolbar missing');
   actions['find-document']();const query=document.querySelector('#document-find-query');query.value='alpha';query.dispatchEvent(new Event('input',{bubbles:true}));
   check(documentFind.total===2,'Find count incorrect');navigateDocumentMatch(1);
   check(state.mode==='edit','Read search did not reveal source');check(document.querySelector('#editor').value.slice(document.querySelector('#editor').selectionStart,document.querySelector('#editor').selectionEnd)==='Alpha','Match selection incorrect');
   navigateDocumentMatch(-1);check(documentFind.index===1,'Previous did not wrap');
   documentFind.replacement='$&';documentFind.replace=true;reviewDocumentReplace();check(documentFind.review.count===2,'Replacement review count');applyDocumentReplace();
   check(note().body.includes('$& $& $&'),'Replacement interpreted dollar syntax');undoDocumentReplace();check(note().body.includes('Alpha alpha'),'Undo replacement failed');
   reviewDocumentReplace();note().body+='\nExternal edit';applyDocumentReplace();check(note().body.includes('Alpha alpha'),'Stale replacement overwrote new draft');check(documentFind.message.includes('mudou'),'Stale review not explained');
   closeDocumentFind();state.mode='read';renderMain();actions['document-outline']();check(document.querySelectorAll('[data-document-heading]').length===2,'Outline count');document.querySelector('[data-document-heading="1"]').click();check(state.mode==='read','Outline unnecessarily changed reading mode');check(document.activeElement.tagName==='H2','Outline did not focus heading');
   state.mode='edit';renderMain();actions['document-outline']();document.querySelector('[data-document-heading="1"]').click();let editor=document.querySelector('#editor');check(editor.value.slice(editor.selectionStart,editor.selectionEnd)==='## Second','Outline source selection');
   const first=note(),second={id:'navigation-test-other',title:'Outra',folder:first.folder,tags:[],body:'Only second needle',created:stamp(),updated:stamp()};vault.notes.push(second);studio.panes=[{source:'vault',id:first.id,mode:'edit'},{source:'vault',id:second.id,mode:'edit'}];studio.active=1;state.id=second.id;renderMain();
   actions['replace-document']();documentFind.query='needle';documentFind.replacement='changed';refreshDocumentFind();replaceDocumentMatch();check(second.body==='Only second changed','Replacement ignored active column');check(!first.body.includes('changed'),'Replacement touched wrong column');
   studio.panes=[];studio.active=0;closeDocumentFind();
   const file={path:'test.txt',name:'test.txt',kind:'text',body:'local local',savedBody:'local local',dirty:false,size:11};
   workbench.source='project';workbench.project={name:'Teste',root:'navigation-test',entries:[{...file}]};workbench.file=file;workbench.tabs=[file.path];state.view='project';render();
   actions['replace-document']();documentFind.query='local';documentFind.replacement='draft';refreshDocumentFind();reviewDocumentReplace();applyDocumentReplace();check(file.body==='draft draft'&&file.dirty,'Project replacement not dirty');check(file.savedBody==='local local','Project replacement altered saved baseline');
   document.querySelector('#document-find-query').value='draft';document.querySelector('#document-find-query').dispatchEvent(new Event('input',{bubbles:true}));check(documentFind.total===2,'Project search count');
   window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check(!document.querySelector('#document-find-panel'),'Escape did not close find');
   if(typeof enterDocumentFocus==='function'){
    const requestFullscreen=document.documentElement.requestFullscreen;document.documentElement.requestFullscreen=async()=>{throw Error('Fullscreen unavailable in test')};
    await enterDocumentFocus();document.documentElement.requestFullscreen=requestFullscreen;documentFocus.textRead=true;renderMain();
    check(document.querySelector('#project-editor').readOnly,'Focus text reading is editable');
    actions['replace-document']();documentFind.query='draft';documentFind.replacement='focus';refreshDocumentFind();replaceDocumentMatch();
    check(!document.querySelector('#project-editor').readOnly&&focusMode()==='edit','Replacement did not leave read-only focus');check(file.body==='focus draft','Focus replacement failed');
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check(documentFocus.active&&!documentFind.open,'Escape should close find before focus');await exitDocumentFocus();
   }
   return 'Document navigation visual: find/wrap, literal replacement/review/undo, stale drafts, reading/source outline, active columns and project dirty state passed.';
  })().catch(error=>({error:error.stack}))`);
  if(result.error)throw Error(result.error);console.log(result);app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});
