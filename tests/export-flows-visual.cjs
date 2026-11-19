const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'amago-export-flow-')));

async function verify(){
 const assert=(value,message)=>{if(!value)throw Error(message)};
 async function wait(check,message){
  for(let i=0;i<200;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,50))}
  throw Error(message+' · '+document.querySelector('#toast')?.textContent);
 }
 interfacePrefs().splashEnabled=false;await finishStartup();
 await wait(()=>window.amagoReady,'Biblioteca indisponível');closeModal();document.querySelector('#startup-splash')?.remove();
 const active=note();state.view='notes';state.mode='read';active.title='Caderno';
 active.body='# Notas\n\nUm texto **formatado** para exportar.';render();
 let saved;
 download=(name,value,type)=>{saved={name,blob:new Blob([value],{type})}};
 async function menuExport(format){
  saved=null;const trigger=document.querySelector('.export-trigger');assert(trigger,'Faltou o botão Exportar');trigger.click();
  const menu=document.querySelector('.view-export-menu');assert(menu.matches(':popover-open'),'Menu inacessível');
  let item=menu.querySelector('[data-export-format="'+format+'"]');assert(item,'Formato ausente '+format);item.click();
  await wait(()=>saved,'Falha na exportação de '+format);return saved;
 }
 const source=await menuExport('source');assert(source.name==='Caderno.md'&&await source.blob.text()===active.body,'Markdown alterado');
 async function readPng(blob){
  const bitmap=await createImageBitmap(blob);
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
  return {canvas,ctx};
 }
 const png=await menuExport('png');assert(png.name==='Caderno.png','Nome PNG incorreto');
 const picture=await readPng(png.blob),pixels=picture.ctx.getImageData(0,0,picture.canvas.width,picture.canvas.height).data;
 let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<130&&pixels[i+3]===255)ink++;
 assert(ink>350&&picture.canvas.width>=1000,'A imagem do documento perdeu o texto');
 active.body=Array.from({length:240},(_,i)=>'Parágrafo '+i+' do documento longo.').join('\n\n');render();
 const archive=await menuExport('png');assert(archive.name==='Caderno.zip','Documento longo incompleto');
 const entries=window.fflate.unzipSync(new Uint8Array(await archive.blob.arrayBuffer()));
 assert(Object.keys(entries).length>=2,'PNG paginado incompleto');
 const tail=await readPng(new Blob([Object.values(entries).at(-1)],{type:'image/png'}));assert(tail.canvas.height>0,'Última parte vazia');
 const [a,b,c]=vault.notes;a.title='Primeiro';b.title='Segundo';c.title='Terceiro';
 a.body='[[Segundo]] #comum';b.body='[[Primeiro]] #comum';c.body='#comum';
 studio.panes=[];state.view='graph';render();
 const svg=document.querySelector('#universe-svg'),both=svg.querySelector('[data-direction="both"]');assert(both,'Vínculo recíproco ausente');
 assert(both.hasAttribute('marker-start')&&both.hasAttribute('marker-end'),'Faltam setas recíprocas');
 const neutral=svg.querySelector('[data-direction="none"]');assert(neutral&&!neutral.hasAttribute('marker-end'),'Afinidade recebeu direção');
 assert(svg.querySelector('[data-flow="forward"]')&&svg.querySelector('[data-flow="reverse"]'),'Sinais direcionais ausentes');
 const motion=svg.querySelector('[data-flow="forward"] animateMotion'),before=motion.getAttribute('path'),x=Number(both.getAttribute('x1'));
 both.setAttribute('x1',String(x+9));await new Promise(resolve=>setTimeout(resolve,0));assert(motion.getAttribute('path')!==before,'Animação ficou fora do vínculo movimentado');
 const mapBox=printableMap().getAttribute('viewBox');document.querySelector('[data-universe-zoom="in"]').click();
 const vector=await menuExport('svg'),xml=new DOMParser().parseFromString(await vector.blob.text(),'image/svg+xml');
 assert(xml.documentElement.getAttribute('viewBox').split(' ').every((n,i)=>Math.abs(Number(n)-Number(mapBox.split(' ')[i]))<2),'Mapa exportado recortado pelo zoom');
 assert(xml.querySelectorAll('[data-node]').length===svg.querySelectorAll('[data-node]').length,'Nós omitidos');
 assert(xml.querySelector('marker')&&!xml.querySelector('animateMotion'),'Fluxo estático exportado incorretamente');
 const mapImage=await menuExport('png'),decoded=await readPng(mapImage.blob);
 assert(decoded.canvas.width>200&&decoded.canvas.height>100,'Mapa rasterizado vazio');
 workbench.source='project';workbench.project={name:'Imagens',root:'teste',entries:[]};
 const artwork='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#ed3377"/></svg>';
 workbench.file={kind:'image',name:'Teste.svg',path:'Teste.svg',url:'data:image/svg+xml;base64,'+btoa(artwork),size:artwork.length};
 state.view='project';render();await document.querySelector('.image-viewer-stage img').decode();
 const image=await menuExport('png'),original=await readPng(image.blob);assert(original.canvas.width===120&&original.canvas.height===80,'Imagem exportada com tamanho da prévia');
 const pixel=original.ctx.getImageData(70,45,1,1).data;assert(pixel[0]===237&&pixel[1]===51&&pixel[2]===119,'Cor perdida na exportação da imagem');
 workbench.source='vault';state.view='graph';render();
 return {documentPng:[picture.canvas.width,picture.canvas.height],pages:Object.keys(entries).length,mapPng:[decoded.canvas.width,decoded.canvas.height]};
}

app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 try{
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
  console.log('Exportação e fluxos verificados.',await win.webContents.executeJavaScript('('+verify.toString()+')()'));
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reduced=await win.webContents.executeJavaScript("(async()=>{await new Promise(r=>setTimeout(r,120));const svg=document.querySelector('#universe-svg');return svg.animationsPaused()&&!svg.classList.contains('atlas-motion')&&!!svg.querySelector('line[marker-end]')})()");
  if(!reduced)throw Error('Movimento reduzido ou indicação estática de direção não disponível');
  win.webContents.debugger.detach();
 }catch(error){console.error(error);process.exitCode=1}
 finally{win.destroy();app.exit(process.exitCode||0)}
});
