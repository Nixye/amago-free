const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-layout-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1910,height:1067,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 const run=async code=>{const result=await win.webContents.executeJavaScript(`(async()=>{try{return await (${code})}catch(error){return {testError:error.stack}}})()`);if(result?.testError)throw Error(result.testError);return result};
 const capture=async name=>{await new Promise(r=>setTimeout(r,120));fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../artifacts/'+name+'.png'),(await win.webContents.capturePage()).toPNG())};
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  await run(String.raw`(async()=>{
   interfacePrefs().splashEnabled=false;await finishStartup();await new Promise(r=>setTimeout(r,1500));closeModal();$('#startup-splash')?.remove();
   window.amagoDesktop={fullscreen:async value=>({fullscreen:value===true})};
   workbench.source='project';workbench.project={root:'layout-fixture',name:'Caderno de ideias',entries:[{path:'Ideias.md',name:'Ideias.md',kind:'markdown',type:'file'},{path:'Pesquisa.md',name:'Pesquisa.md',kind:'markdown',type:'file'}]};
   workbench.file={path:'Ideias.md',name:'Ideias.md',kind:'markdown',body:'#design #pesquisa\n\n# Um lugar para pensar\n\nEscrever, organizar referências e conectar novas ideias.\n\n## Próximos passos\n\n- [ ] Revisar os detalhes\n- [ ] Compartilhar descobertas\n\n'+('Um parágrafo de exemplo para verificar a largura do editor e a rolagem do documento.\n\n').repeat(40),dirty:false,size:4000};
   workbench.file.savedBody=workbench.file.body;workbench.tabs=['Ideias.md'];workbench.mode='split';workbench.tab='explore';state.view='project';render();
  })()`);
  const geometry=String.raw`(()=>{const rect=s=>{const e=$(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,display:getComputedStyle(e).display,rows:getComputedStyle(e).gridTemplateRows}};return {bar:rect('.project-editor-grid>.format-toolbar'),editor:rect('#project-editor'),grid:rect('.project-editor-grid'),preview:rect('#project-preview')}})()`;
  const checkLayout=(g,split=true)=>{
   assert.ok(g.editor.y>=g.bar.bottom-1,'Toolbar overlaps document source');
   assert.ok(g.editor.bottom<=g.grid.bottom+1,'Editor overflows grid');
   assert.ok(g.bar.height>=30,'Toolbar row collapsed');
   if(split){assert.ok(g.preview.y>=g.bar.bottom-1,'Toolbar overlaps preview');assert.ok(g.editor.width>=g.grid.width*.35,'Source column collapsed')}
   else assert.ok(g.editor.width>=g.grid.width*.95,'Focus editor is squeezed beside toolbar');
  };
  checkLayout(await run(geometry));
  await run(String.raw`(()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   check(!$('.project-location')&&!$('.project-central-button'),'Duplicate project navigation remains');
   check($('.workspace-shortcuts [data-open-universe]'),'Map shortcut missing');
   const sidebar=$('#sidebar').getBoundingClientRect(),picker=$('.workspace-picker').getBoundingClientRect();check(picker.right<=sidebar.right,'Workspace picker overflows sidebar');
   check(!$('.explorer-options').open,'Explorer options are not initially collapsed');
   $('.explorer-options summary').click();check($('.explorer-options').open,'Options do not open');
   const select=$('.explorer-sort select');select.value='name-desc';select.dispatchEvent(new Event('change',{bubbles:true}));
   check($('.explorer-options').open&&document.activeElement===$('.explorer-sort select'),'Sorting lost menu/focus');
   check($('.workspace-tree [data-project-file]').dataset.projectFile==='Pesquisa.md','Sorting control no longer works');
   $('.explorer-options').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check(!$('.explorer-options').open,'Escape did not close options');
   const input=$('.workspace-tree-filter input');input.value='Ideias';input.dispatchEvent(new Event('input',{bubbles:true}));check(document.querySelectorAll('.workspace-tree [data-project-file]').length===1,'Sidebar filter no longer works');
   check($('.workspace-tree-filter input').type==='text'&&$('.workspace-tree-filter input').getAttribute('role')==='searchbox','Native duplicate clear button remains');
   $('.workspace-tree-filter>button').click();check(document.querySelectorAll('.workspace-tree [data-project-file]').length===2,'Clear filter no longer works');
  })()`);
  await capture('layout-project-split');
  await run("enterDocumentFocus().then(()=>document.querySelector('[data-focus-mode=edit]').click())");
  const focusGeometry=geometry.replace("preview:rect('#project-preview')","metadata:rect('.document-metadata')");
  const focus=await run(focusGeometry);checkLayout(focus,false);assert.equal(focus.metadata.display,'none');
  const viewportWidth=await run('innerWidth');
  assert.ok(focus.grid.width>=viewportWidth*.95,'Default focus does not use the available screen width');
  await capture('layout-focus-editor');
  await run("(()=>{vault.skin='cyberpunk';applyTheme();document.querySelector('[data-focus-mode=split]').click()})()");
  checkLayout(await run(geometry));await capture('layout-focus-split-cyberpunk');
  win.setContentSize(840,780);await new Promise(r=>setTimeout(r,150));checkLayout(await run(geometry));
  await run("document.querySelector('[data-focus-mode=edit]').click()");checkLayout(await run(focusGeometry),false);
  win.setContentSize(600,780);await new Promise(r=>setTimeout(r,150));checkLayout(await run(focusGeometry),false);
  await run("document.querySelector('[data-focus-mode=split]').click()");
  const narrow=await run(geometry);assert.ok(narrow.preview.y>=narrow.editor.bottom,'Narrow split panes overlap');
  await run("document.querySelector('[data-focus-mode=read]').click()");
  assert.equal(await run("getComputedStyle($('.visual-toolbar')).display"),'none');
  win.setContentSize(1440,960);await run("exitDocumentFocus()");
  await run("(()=>{workbench.mode='split';render();if(!$('.explorer-options').open)$('.explorer-options summary').click()})()");
  await capture('layout-sidebar-cyberpunk');
  assert.equal(await run("$('.explorer-options').open"),true);
  await run(String.raw`(()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   discovery.docs=[{path:'Alpha.md',title:'Alpha',kind:'markdown',body:'[[Beta]] #design @Luna'},{path:'Beta.md',title:'Beta',kind:'markdown',body:'#design @Luna'},{path:'Gamma.md',title:'Gamma',kind:'markdown',body:'@Luna'}];
   discovery.graphQuery='';discovery.linked=false;discovery.localFocus=null;delete graphPreferences().relation;state.view='graph';render();
   check(document.querySelectorAll('[data-atlas-relation]:checked').length===3,'Hybrid relation is not the default');
   check(document.querySelectorAll('#universe-edges line').length===3,'Hybrid relations did not render');
   check([...document.querySelectorAll('#universe-edges title')].some(e=>/Tags:.*Menções:/.test(e.textContent)),'Combined reasons missing in graph');
   $('[data-atlas-relation=tags]').click();$('[data-atlas-relation=mentions]').click();check(document.querySelectorAll('#universe-edges line').length===1,'Specific relations did not filter');
   $('[data-atlas-relation=tags]').click();$('[data-atlas-relation=mentions]').click();check(document.querySelectorAll('#universe-edges line').length===3,'Hybrid relations did not restore');
  })()`);
  await capture('layout-hybrid-graph');
  await run(String.raw`(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)};
   const mixed=$('[data-relation-types="links tags mentions"]');check(mixed&&mixed.style.stroke.startsWith('url('),'Mixed edge has no gradient');
   const gradient=$('#atlas-edge-'+mixed.dataset.edge);check(gradient.querySelectorAll('stop').length===3,'Gradient does not include all types');
   const single=$('[data-relation-types="mentions"]');check(single.style.stroke==='var(--relation-mentions)','Single relation color missing');
   mixed.setAttribute('x1','123');await new Promise(r=>setTimeout(r,0));check(gradient.getAttribute('x1')==='123','Gradient did not follow dragged endpoint');
   check($('.relation-legend').textContent.includes('Cores mescladas'),'Color legend missing');
   for(const input of [...document.querySelectorAll('[data-atlas-relation]')]){const current=document.querySelector('[data-atlas-relation="'+input.dataset.atlasRelation+'"]');if(current.checked)current.click()}
   check(!document.querySelectorAll('#universe-edges line').length&&graphPreferences().relations.length===0,'Empty selection ignored');
   renderUniverse();check(!document.querySelectorAll('[data-atlas-relation]:checked').length,'Empty selection was not preserved');
   $('[data-atlas-relation=tags]').click();$('[data-atlas-relation=mentions]').click();
   check(graphData().edges.every(edge=>!edge.types.includes('links')),'Unchecked links remain in graph');
   workbench.file={...discovery.docs[0],name:'Alpha.md',size:40,savedBody:discovery.docs[0].body,dirty:false};workbench.tabs=['Alpha.md'];state.view='project';workbench.mode='edit';render();
   check($('.related-documents .count').textContent==='2','Note panel does not show shared-tag/mention neighbors');
   check(document.querySelectorAll('.local-network line').length===2,'Local map disagrees with related notes');
   check($('.relation-reasons').textContent.includes('Tags:')&&$('.relation-reasons').textContent.includes('Menções:'),'Note panel reasons missing');
   check($('.relation-backlink').hasAttribute('data-project-file'),'Related document cannot be opened');
   const editor=$('#project-editor');editor.value='Sem relações';editor.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,400));
   check($('.related-documents .count').textContent==='0','Relations did not update from unsaved draft');
   editor.value='#design @Luna';editor.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,400));
   check($('.related-documents .count').textContent==='2','Relations did not restore after editing');
   // Personal notes use the same engine and the correct navigation attributes.
   const personal=connectionPanel({id:'a',title:'A',body:'#design'},[{id:'a',title:'A',body:'#design'},{id:'b',title:'B',body:'#design'}],false);
   check(personal.includes('data-note="b"')&&personal.includes('Tags: #design'),'Personal related notes missing');
   closeCompletion();const options=$('.explorer-options');if(options)options.open=false;
  })()`);
  await capture('layout-related-note');
  console.log('Layout regressions: project split, centered focus edit, hidden focus metadata, narrow modes, sidebar navigation, sort, filter and Escape passed.');
  app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});
