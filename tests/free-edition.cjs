const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json');
app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'amago-free-isolation-')));
app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{sandbox:true,contextIsolation:true}});try{
 const network=[],errors=[];
 win.webContents.session.webRequest.onBeforeRequest((details,callback)=>{if(/^https?:/.test(details.url))network.push(details.url);callback({cancel:false})});
 win.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message)});
 assert.equal(pkg.name,'amago-free');assert.equal(pkg.build.appId,'app.amago.free');assert.equal(pkg.license,'GPL-3.0-only');assert.equal(pkg.dependencies,undefined);assert.equal(pkg.build.publish,undefined);
 for(const forbidden of ['desktop/community.cjs','desktop/community-config.json','desktop/auto-updates.cjs','desktop/updates.cjs','dist/plugin-frame.html','dist/plugin-runner.js','dist/extension-core.js','dist/community.js','dist/marketplace.js','dist/cloud.js'])assert(!fs.existsSync(path.join(root,forbidden)),forbidden);
 const preload=fs.readFileSync(path.join(root,'desktop/preload.cjs'),'utf8');assert(!/community:|updates:/.test(preload));
 await win.loadFile(path.join(root,'dist/index.html'));await new Promise(r=>setTimeout(r,1500));
 const outcome=await win.webContents.executeJavaScript(`(async()=>{
  interfacePrefs().splashEnabled=false;await finishStartup();closeModal();render();
  if(typeof pluginRuntime!=='undefined'||typeof AmagoExtensions!=='undefined'||actions.plugins)throw Error('Extension runtime leaked');
  if(settingTabs.some(t=>/plugins|community|account|updates|cloud/.test(t[0])))throw Error('Exclusive settings leaked');
  showLauncher();if(document.querySelector('[data-action="cloud-projects"],[data-action="create-project"]'))throw Error('Unavailable launcher action');closeModal();
  for(const tab of ['general','appearance','data','about']){showSettings(tab);if(!document.querySelector('#settings-content'))throw Error('Missing settings '+tab);closeModal()}
  showSettings('appearance');document.querySelector('[data-theme-id="forest"]').click();if(vault.skin!=='forest')throw Error('Native theme selection failed');closeModal();
  state.view='notes';state.mode='edit';render();const editor=document.querySelector('#editor');if(!editor)throw Error('Editor missing');editor.value='# Free isolation test';editor.dispatchEvent(new Event('input',{bubbles:true}));await window.amagoFlush();if(!note().body.includes('Free isolation test'))throw Error('Edit not saved');
  if(!localStorage.getItem('amago-free-vault-v1')||localStorage.getItem('amago-vault-v1'))throw Error('Storage not isolated');
  state.view='graph';render();if(!document.querySelector('.universe-stage'))throw Error('Graph missing');
  return {version:window.amagoVersion,tabs:settingTabs.map(t=>t[0])};
 })()`);
 assert.equal(outcome.version,pkg.version);assert.deepEqual(network,[],'Free must start with no network requests');assert.deepEqual(errors,[]);
 fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/free-preview.png'),(await win.webContents.capturePage()).toPNG());
 console.log('Free edition: no service/extension code or bridges, no startup network, independent storage, settings, themes, edits and graph passed.');app.exit(0);
}catch(error){console.error(error);app.exit(1)}});
