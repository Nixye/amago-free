const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-writing-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',event=>{if(event.level==='error')console.error(event.message)});
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  if(await win.webContents.executeJavaScript('typeof writingPreferences')==='undefined')for(const name of ['writing-preferences-core','writing-preferences'])await win.webContents.executeJavaScript(fs.readFileSync(path.resolve(__dirname,'../dist/'+name+'.js'),'utf8'));
  const result=await win.webContents.executeJavaScript(String.raw`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(r=>setTimeout(r,1500));document.querySelector('#startup-splash')?.remove();closeModal();
   state.view='notes';state.mode='edit';note().body='Olá 😀\r\nLua';const original=note().body;render();
   actions['writing-preferences']();
   for(const [key,value] of [['fontSize',22],['lineHeight',2.1],['wrap',false],['spellcheck',true]]){const field=document.querySelector('[data-writing-preference="'+key+'"]');if(field.type==='checkbox')field.checked=value;else field.value=String(value);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}))}
   closeModal();let editor=document.querySelector('#editor');
   check(editor.style.fontSize==='22px'&&editor.style.lineHeight==='2.1'&&editor.wrap==='off'&&editor.spellcheck,'Editor preferences not applied');
   check(note().body===original,'Preferences rewrote document bytes');check(JSON.parse(localStorage.getItem(KEY)).writing.fontSize===22,'Preferences not persisted');
   showSettings('editing');await new Promise(r=>setTimeout(r,30));check(document.querySelector('#settings-content .writing-preferences'),'Editing settings lack editor preferences');closeModal();
   const native=[];window.amagoDesktop={appearance:async value=>{native.push(value);return {supported:true,enabled:true}},fullscreen:async value=>({fullscreen:!!value})};
   await enterDocumentFocus();check(document.querySelector('#editor').style.fontSize==='22px','Focus source editor ignored preferences');await exitDocumentFocus();
   const second=vault.notes.find(n=>n.id!==state.id);studio.panes=[{source:'vault',id:state.id,mode:'edit'},{source:'vault',id:second.id,mode:'edit'}];studio.active=0;renderMain();check([...document.querySelectorAll('[data-pane-editor]')].every(el=>el.style.fontSize==='22px'&&el.wrap==='off'),'Split columns ignored preferences');
   studio.panes=[];renderMain();editor=document.querySelector('#editor');editor.focus();editor.setSelectionRange(0,6);captureWritingSelection();actions['document-statistics']();
   const values=[...document.querySelectorAll('.document-statistics-grid dd')].map(el=>el.textContent);check(values.join(',')==='2,10,2,14,1,5,1,9','Document/selection Unicode statistics incorrect: '+values.join(','));check(note().body===original,'Statistics changed source');closeModal();
   // Active pane determines statistics, not the first column.
   second.body='outra coluna';studio.panes=[{source:'vault',id:state.id,mode:'edit'},{source:'vault',id:second.id,mode:'edit'}];studio.active=0;renderMain();activatePane(1);actions['document-statistics']();check(document.querySelector('#document-statistics-content h3').textContent===second.title,'Stats used inactive column');closeModal();studio.panes=[];renderMain();
   const personalId=state.id;workbench.source='project';workbench.project={root:'writing-test',name:'Teste',entries:[]};workbench.file={path:'texto.txt',name:'texto.txt',kind:'text',body:'texto\r\noriginal',savedBody:'texto\r\noriginal',size:15,dirty:false};state.view='project';renderMain();
   check(document.querySelector('#project-editor').style.fontSize==='22px'&&document.querySelector('#project-editor').spellcheck,'Project source preferences missing');check(!workbench.file.dirty&&workbench.file.body===workbench.file.savedBody,'Project preferences marked file dirty');workbench.source='vault';workbench.file=null;state.id=personalId;state.view='notes';renderMain();
   // System colors switch the selected palettes without deleting native themes.
   let dark=true;Object.defineProperty(writingSystemMedia,'matches',{configurable:true,get:()=>dark});
   const community=nativeThemes.find(t=>t.id==='forest');vault.themePreference={mode:'system',light:'daylight',dark:community.id};applyTheme();
   check(vault.skin===community.id&&native.at(-1).theme==='dark'&&native.at(-1).followSystem===true,'Automatic dark theme or acrylic mode incorrect');
   dark=false;writingSystemMedia.dispatchEvent(new Event('change'));check(vault.skin==='daylight'&&document.body.classList.contains('theme-light')&&native.at(-1).theme==='light','System light change not applied');
   actions.themes();document.querySelector('[data-theme-id="forest"]').click();check(systemThemePreferences().mode==='manual'&&vault.skin===community.id,'Manual palette did not disable auto');check(native.some(value=>value.followSystem===false),'Native appearance did not exit system mode');
   dark=false;writingSystemMedia.dispatchEvent(new Event('change'));check(vault.skin===community.id,'System event replaced manual/native palette');closeModal();
   actions['shortcut-help']();const help=document.querySelector('#shortcut-help-query');help.value='foco';help.dispatchEvent(new Event('input'));check(document.querySelector('#shortcut-help-results').textContent.includes('Ctrl Shift F'),'Searchable focus shortcut missing');help.value='Ctrl Page';help.dispatchEvent(new Event('input'));check(document.querySelector('#shortcut-help-results').textContent.includes('aba'),'Tab shortcut mislabeled');closeModal();
   // Snippets locate later matches, escape HTML and omit excluded words from marks.
   const doc=note();doc.body='Introdução '.repeat(60)+'AÇÃO <img src=x onerror=alert(1)> especial.';workbench.source='vault';workbench.query='acao -inexistente';search();
   const row=[...document.querySelectorAll('[data-hybrid-open]')].find(el=>el.dataset.hybridOpen===doc.id);check(row?.querySelector('mark')?.textContent==='AÇÃO','Context snippet failed to highlight late/accent match');check(!row.querySelector('img')&&row.querySelector('p').textContent.includes('<img'),'Search snippet created unsafe HTML');closeModal();
   workbench.query='type:markdown is:done';doc.body='- [x] Concluída';search();check([...document.querySelectorAll('[data-hybrid-open]')].some(el=>el.dataset.hybridOpen===doc.id),'New filters not applied in hybrid UI');closeModal();
   return 'Writing UI: persisted source preferences, focus/columns, Unicode selection stats, automatic/manual/native themes, acrylic system flag, searchable shortcuts and safe contextual snippets passed.';
  })().catch(error=>({error:error.stack}))`);
  if(result.error)throw Error(result.error);console.log(result);app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});
