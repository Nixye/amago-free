const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-reading-image-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  const result=await win.webContents.executeJavaScript(String.raw`(async()=>{
   const check=(condition,message)=>{if(!condition)throw Error(message)};
   interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(resolve=>setTimeout(resolve,1500));closeModal();document.querySelector('#startup-splash')?.remove();
   workbench.source='vault';state.view='notes';state.mode='edit';const first=note(),second=vault.notes.find(n=>n!==first);first.body=Array.from({length:150},(_,i)=>'Parágrafo '+i+' sobre ideias e descobertas.').join('\n\n');render();
   let editor=document.querySelector('#editor');editor.setSelectionRange(220,240);editor.scrollTop=400;captureDocumentPositions();
   openNote(second.id);openNote(first.id);editor=document.querySelector('#editor');
   check(editor.selectionStart===220&&editor.selectionEnd===240,'Cursor/selection did not return to first document');check(editor.scrollTop>300,'Source scrolling not restored');
   state.mode='read';renderMain();let reader=document.querySelector('.note-main');reader.scrollTop=650;captureDocumentPositions();
   state.mode='edit';renderMain();state.mode='read';renderMain();reader=document.querySelector('.note-main');check(reader.scrollTop>=600,'Reading scroll lost across modes');
   state.mode='edit';renderMain();editor=document.querySelector('#editor');editor.setSelectionRange(300,350);captureDocumentPositions();openNote(second.id);first.body='curto';openNote(first.id);editor=document.querySelector('#editor');check(editor.selectionStart<=5&&editor.selectionEnd<=5,'Selection not clamped to shorter content');
   first.body='primeira coluna';second.body='segunda coluna com texto';studio.panes=[{source:'vault',id:first.id,mode:'edit'},{source:'vault',id:second.id,mode:'edit'}];studio.active=1;state.id=second.id;render();
   const column=document.querySelector('[data-pane-editor="1"]');column.setSelectionRange(8,14);captureDocumentPositions();renderMain();check(document.querySelector('[data-pane-editor="1"]').selectionStart===8,'Second-column cursor lost');check(document.querySelector('[data-pane-editor="0"]').selectionStart!==8,'Selection leaked into another document');
   studio.panes=[];workbench.source='project';workbench.project={root:'text-test',name:'Textos',entries:[]};state.view='project';
   const textA={path:'a.txt',name:'a.txt',kind:'text',body:'0123456789 primeira nota',savedBody:'0123456789 primeira nota'},textB={path:'b.txt',name:'b.txt',kind:'text',body:'outra nota',savedBody:'outra nota'};
   workbench.file=textA;render();document.querySelector('#project-editor').setSelectionRange(7,12);captureDocumentPositions();workbench.file=textB;render();workbench.file=textA;render();check(document.querySelector('#project-editor').selectionStart===7,'Project cursor not restored');
   workbench.project={root:'different-project',name:'Outro',entries:[]};workbench.file={...textA};render();check(document.querySelector('#project-editor').selectionStart===0,'Cursor leaked across project roots');
   workbench.project={root:'image-test',name:'Imagens',entries:[]};
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600"><rect width="2400" height="1600" fill="#16404d"/><circle cx="1200" cy="800" r="460" fill="#78e2df"/></svg>';
   const url='data:image/svg+xml;base64,'+btoa(svg);workbench.file={path:'imagens/exemplo.svg',name:'exemplo.svg',kind:'image',url,size:svg.length};workbench.tabs=[workbench.file.path];state.view='project';render();
   await new Promise(resolve=>setTimeout(resolve,100));let view=activeImageViewer;
   check(view.width===2400&&view.height===1600,'Image dimensions missing');check(view.fit&&view.scale<1,'Large image did not fit');
   check(document.querySelector('.image-viewer-dimensions').textContent.includes('2.400'),'Dimensions not displayed');
   document.querySelector('[data-image-view="actual"]').click();check(view.scale===1,'Actual size command failed');check(view.viewport.scrollWidth>view.viewport.clientWidth,'Actual size does not allow panning');
   view.viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'+',bubbles:true,cancelable:true}));check(view.scale>1,'Keyboard zoom failed');
   for(let i=0;i<30;i++)document.querySelector('[data-image-view="in"]').click();check(view.scale===8,'Maximum image zoom not bounded');
   view.viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));check(view.fit&&view.scale<1,'Keyboard fit failed');
   const before=view.scale;view.viewport.dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:-100,bubbles:true,cancelable:true,clientX:500,clientY:400}));check(view.scale>before&&!view.fit,'Ctrl-wheel did not zoom');
   // Focus changes viewport size, with the image controls still available.
   window.amagoDesktop={fullscreen:async value=>({fullscreen:value===true})};await enterDocumentFocus();check(document.querySelector('[data-image-view="fit"]'),'Focus hid image controls');await exitDocumentFocus();
   const prior=view;workbench.file={...workbench.file,path:'outra.svg',name:'outra.svg'};render();await new Promise(resolve=>setTimeout(resolve,100));view=activeImageViewer;check(view!==prior&&view.fit,'Image navigation retained old transforms');
   document.querySelector('#toast').classList.remove('show');
   return 'Reading/image: per-document/column cursor and scroll, mode restoration, shorter text, image fit/actual/limits/keyboard/wheel/dimensions and focus passed.';
  })().catch(error=>({error:error.stack}))`);
  if(result.error)throw Error(result.error);console.log(result);
  await new Promise(resolve=>setTimeout(resolve,200));fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../artifacts/image-viewer.png'),(await win.webContents.capturePage()).toPNG());app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});
