const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-reading-async-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1100,height:800,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  win.webContents.focus();
  const result=await win.webContents.executeJavaScript(String.raw`(async()=>{
   const check=(ok,message)=>{if(!ok)throw Error(message)},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
   interfacePrefs().splashEnabled=false;await finishStartup();await wait(1500);closeModal();document.querySelector('#startup-splash')?.remove();
   const image={path:'image.svg',name:'image.svg',kind:'image'};
   const a={path:'A.md',name:'A.md',title:'A',kind:'markdown',body:'![[image.svg]]\n\n'+Array.from({length:24},(_,index)=>'Paragraph '+index+' content for the document.').join('\n\n')+'\n\n###### Explicit target\n\nEnd.',size:2000};
   const b={path:'B.md',name:'B.md',title:'B',kind:'markdown',body:'Short document',size:14};
   let delay=80;
   window.projectAdapter.image=async()=>{await wait(delay);return {url:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="teal"/></svg>')}};
   workbench.source='project';workbench.project={name:'Reading async',root:'reading-async-test',entries:[a,b,image]};workbench.tabs=[a.path,b.path];workbench.file=a;workbench.mode='read';state.view='project';studio.panes=[];discovery.docs=[a,b,image];render();await wait(240);
   const preview=()=>document.querySelector('#project-preview'),switchTo=doc=>{workbench.file=doc;state.view='project';renderMain()};
   preview().scrollTop=900;captureDocumentPositions();check(preview().scrollTop===900,'Fixture must allow scroll 900');
   switchTo(b);switchTo(a);const immediate=preview().scrollTop;await wait(240);
   check(immediate<900,'Fixture did not exercise the pre-hydration clamp');check(Math.abs(preview().scrollTop-900)<2,'Image hydration lost the saved reading position');
   check(!pendingDocumentPositions.has(preview()),'Restoration remained pending after image decode');check(preview().style.overflowAnchor==='','Temporary scroll anchoring was not restored');
   // A user scroll while the image request is pending cancels the late assignment.
   switchTo(b);projectImages.clear();delay=160;switchTo(a);
   check(pendingDocumentPositions.has(preview()),'No pending restoration to cancel');
   preview().dispatchEvent(new WheelEvent('wheel',{deltaY:-500,bubbles:true,cancelable:true}));preview().scrollTop=0;preview().dispatchEvent(new Event('scroll'));
   check(!pendingDocumentPositions.has(preview()),'Wheel did not cancel restoration');await wait(300);check(preview().scrollTop===0,'Late image decode overrode explicit scroll');
   // Explicit heading navigation must remain in control of the viewport.
   preview().scrollTop=900;captureDocumentPositions();switchTo(b);projectImages.clear();switchTo(a);
   check(pendingDocumentPositions.has(preview()),'No pending restoration before heading navigation');check(jumpWorkspaceFragment('Explicit-target'),'Fragment fixture was not found');
   check(!pendingDocumentPositions.has(preview()),'Heading focus did not cancel restoration: '+JSON.stringify({active:document.activeElement.tagName,inert:preview().closest('[inert]')?.className,contains:preview().contains(document.activeElement),pending:[...pendingDocumentPositions.values()].map(record=>record.key)}));await wait(300);check(document.activeElement.tagName==='H6','Late decode moved focus away from explicit heading');
   // Returning to a different source document before decode must not reuse A's cursor.
   preview().scrollTop=900;captureDocumentPositions();switchTo(b);projectImages.clear();switchTo(a);check(pendingDocumentPositions.has(preview()),'No pending restoration before leaving document');
   workbench.mode='edit';switchTo(b);const editor=document.querySelector('#project-editor');editor.focus();editor.setSelectionRange(2,5);editor.dispatchEvent(new Event('select',{bubbles:true}));await wait(300);
   check(workbench.file===b&&editor.selectionStart===2&&editor.selectionEnd===5,'Late restore changed another document selection');check(![...pendingDocumentPositions.keys()].some(element=>!element.isConnected),'Detached pending restoration was not cleaned');
   return 'Async reading images: saved position after hydrate/decode, wheel cancellation, explicit fragment priority and stale-document isolation passed.';
  })().catch(error=>({error:error.stack}))`);
  if(result.error)throw Error(result.error);console.log(result);app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});
