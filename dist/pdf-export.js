'use strict';

const exportColors={links:'#24699d',tags:'#966322',mentions:'#86549c'};
function printableMap(original=$('#universe-svg')){
 const copy=original.cloneNode(true),bounds=original.querySelector('#universe-nodes').getBBox(),padding=38;
 copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
 copy.setAttribute('viewBox',[bounds.x-padding,bounds.y-padding,Math.max(1,bounds.width)+padding*2,Math.max(1,bounds.height)+padding*2].join(' '));
 copy.removeAttribute('id');
 copy.querySelector('#universe-camera').removeAttribute('transform');
 copy.querySelectorAll('.atlas-signals,.node-halo,animate,animateMotion,title').forEach(el=>el.remove());
 const arrow=copy.querySelector('#atlas-arrow');
 if(arrow){arrow.id='export-flow-arrow';arrow.firstElementChild.setAttribute('fill',exportColors.links)}
 for(const line of copy.querySelectorAll('[data-edge]')){
  const types=line.dataset.relationTypes.split(' ');
  if(types.length>1){
   const gradient=copy.querySelector('#atlas-edge-'+line.dataset.edge);gradient.id='export-edge-'+line.dataset.edge;
   [...gradient.children].forEach((stop,i)=>stop.setAttribute('stop-color',exportColors[types[i]]));
   line.style.stroke='url(#'+gradient.id+')';
  }else line.style.stroke=exportColors[types[0]];
  for(const key of ['marker-start','marker-end'])if(line.hasAttribute(key))line.setAttribute(key,'url(#export-flow-arrow)');
  line.style.strokeOpacity=line.dataset.direction==='none'?'.46':'.86';
 }
 const names=graphPreferences().labels!==false;
 for(const node of copy.querySelectorAll('[data-node]')){
  const card=node.querySelector('rect'),circle=node.querySelector('circle'),label=node.querySelector('text');
  if(card){card.style.fill='#f6f7fb';card.style.stroke='#575e70';circle.remove()}
  else{circle.style.stroke='#fff';circle.style.strokeWidth='1.4'}
  if(!names)label.remove();else{label.style.font='12px sans-serif';label.style.fill='#232632';label.style.stroke='none'}
 }
 copy.querySelectorAll('g[id]').forEach(group=>group.removeAttribute('id'));
 return copy;
}
function currentExport(){
 if(state.view==='graph')return {kind:'map',title:'Mapa de conexões',svg:$('#universe-svg')};
 const image=state.view==='project'&&$('.image-viewer-stage img');
 if(image)return {kind:'image',title:workbench.file.name,image};
 const target=navigationDocument();if(!target)return null;
 return {kind:target.doc.kind==='text'?'text':'markdown',title:target.doc.title||target.doc.name,...target};
}
function exportSheet(view){
 const sheet=document.createElement('article'),heading=document.createElement('h1');heading.textContent=view.title;sheet.append(heading);
 if(view.kind==='map')sheet.append(printableMap(view.svg));
 else if(view.kind==='image')sheet.append(view.image.cloneNode());
 else if(view.kind==='text'){const pre=document.createElement('pre');pre.textContent=view.doc.body;sheet.append(pre)}
 else{
  const content=document.createElement('section'),body=view.doc.body.slice(AmagoSearch.metadata(view.doc.body).front.length);
  content.innerHTML=view.project?fileMarkdown(body,view.doc):markdown(body,false);sheet.append(content);
 }
 return sheet;
}
async function prepareExportSheet(sheet){
 if(sheet.querySelector('[data-linked-image]'))await hydrateLinkedImages();
 await Promise.all([...sheet.querySelectorAll('img')].map(img=>{img.loading='eager';return img.decode()}));
 await document.fonts.ready;
}
async function exportViewPdf(view=currentExport()){
 if($('#pdf-content')||!view)return;
 const sheet=exportSheet(view);sheet.id='pdf-content';document.body.append(sheet);
 const previousTitle=document.title;
 try{
  await prepareExportSheet(sheet);document.title=view.title;
  if(window.amagoDesktop?.exportPdf)await window.amagoDesktop.exportPdf(view.title,view.kind==='map');
  else window.print();
 }catch(error){toast('Não foi possível exportar o PDF. '+error.message)}
 finally{document.title=previousTitle;sheet.remove()}
}
actions['export-pdf']=()=>exportViewPdf();

const exportLibraries=new Map();
function loadExportLibrary(name,filename){
 if(!exportLibraries.has(name)){
  const load=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='assets/export/'+filename;
   script.onload=()=>resolve(window[name]);script.onerror=()=>{script.remove();reject(Error('Falha ao carregar o exportador de imagem.'))};
   document.head.append(script);
  });
  exportLibraries.set(name,load.catch(error=>{exportLibraries.delete(name);throw error}));
 }
 return exportLibraries.get(name);
}
function pngBlob(canvas){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Falha ao gerar o arquivo PNG.')),'image/png'));
}
function exportFilename(view){
 const name=String(view.title||'Documento').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-');
 return ((view.project||view.kind==='image')?name.replace(/\.[^.]+$/,''):name).trim()||'Documento';
}
function rasterSize(width,height,maxScale=1){
 const scale=Math.min(maxScale,8192/Math.max(width,height),Math.sqrt(16000000/(width*height)));
 return {width:Math.max(1,Math.ceil(width*scale)),height:Math.max(1,Math.ceil(height*scale))};
}
function mapSvgFile(view,raster=false){
 const svg=printableMap(view.svg),bounds=svg.viewBox.baseVal;
 const size=raster?rasterSize(bounds.width,bounds.height,2):bounds;
 svg.setAttribute('width',Math.ceil(size.width));svg.setAttribute('height',Math.ceil(size.height));
 return {width:size.width,height:size.height,blob:new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'})};
}
async function exportGraphic(view,format){
 let source=view.image,url,dimensions;
 try{
  if(view.kind==='map'){
   const svg=mapSvgFile(view,format==='png');
   if(format==='svg'){download(exportFilename(view)+'.svg',svg.blob,'image/svg+xml');return}
   url=URL.createObjectURL(svg.blob);source=new Image();source.src=url;dimensions=svg;
  }
  await source.decode();
  const size=dimensions||rasterSize(source.naturalWidth,source.naturalHeight);
  const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');
  if(view.kind==='map'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)}
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  download(exportFilename(view)+'.png',await pngBlob(canvas),'image/png');
 }finally{if(url)URL.revokeObjectURL(url)}
}
async function exportDocumentImage(view){
 const renderImage=await loadExportLibrary('html2canvas','html2canvas-1.4.1.min.js');
 const sheet=exportSheet(view);sheet.className='image-export-document';sheet.setAttribute('aria-hidden','true');sheet.inert=true;document.body.append(sheet);
 try{
  await prepareExportSheet(sheet);
  const name=exportFilename(view),height=Math.ceil(sheet.getBoundingClientRect().height),pageHeight=6400;
  const origin=sheet.getBoundingClientRect().top;
  const breaks=[...sheet.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,tr,pre,blockquote,img')].map(el=>Math.ceil(el.getBoundingClientRect().bottom-origin)).sort((a,b)=>a-b);
  const parts={};let offset=0,page=1;
  while(offset<height){
   let end=Math.min(offset+pageHeight,height);
   if(end<height){const boundary=breaks.findLast(y=>y<=end&&y>end-600);if(boundary)end=boundary}
   const canvas=await renderImage(sheet,{scale:1.5,y:offset,height:end-offset,backgroundColor:'#fff',logging:false,allowTaint:false,
    ignoreElements:el=>el.parentElement===document.body&&el!==sheet});
   const blob=await pngBlob(canvas);canvas.width=canvas.height=0;
   if(!offset&&end===height){download(name+'.png',blob,'image/png');return}
   parts['pagina-'+String(page++).padStart(4,'0')+'.png']=new Uint8Array(await blob.arrayBuffer());offset=end;
  }
  const zip=await loadExportLibrary('fflate','fflate-0.8.2.min.js');
  download(name+'.zip',zip.zipSync(parts,{level:0}),'application/zip');toast('Imagens numeradas salvas em um arquivo ZIP.');
 }finally{sheet.remove()}
}
function exportChoices(view){
 const options=[['pdf','Documento PDF','file'],['png','Imagem PNG','image']];
 if(view.kind==='map')options.push(['svg','Vetor SVG','graph']);
 else if(view.doc)options.push(['source',view.kind==='markdown'?'Markdown (.md)':'Arquivo de texto original','note']);
 return options;
}
let exportingImage=false;
async function exportFormat(view,format){
 try{
  if(format==='pdf')return await exportViewPdf(view);
  if(format==='source')return exportSourceDocument(view.doc,view.project);
  if(exportingImage){toast('A exportação de imagem está em andamento.');return}
  exportingImage=true;
  try{if(view.doc)await exportDocumentImage(view);else await exportGraphic(view,format)}
  finally{exportingImage=false}
 }catch(error){toast('Não foi possível exportar. '+error.message)}
}
function mountPdfExport(){
 const view=currentExport();if(!view)return;
 const host=documentFocus.active?$('.focus-utilities'):view.kind==='map'?$('.map-heading-actions'):view.kind==='image'?$('.image-viewer-toolbar'):$('.document-navigation-tools')||$('.note-tools')||$('.project-document-toolbar');
 for(const old of document.querySelectorAll('.export-trigger,.view-export-menu'))if(old.parentElement!==host)old.remove();
 if(!host||host.querySelector('.export-trigger'))return;
 const trigger=document.createElement('button'),menu=document.createElement('div');
 trigger.type='button';trigger.className='plain-button export-trigger';trigger.innerHTML=icon('download')+'Exportar'+icon('chevron');
 trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','view-export-options');
 menu.id='view-export-options';menu.className='view-export-menu';menu.popover='auto';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Formatos de exportação');
 for(const [format,label,glyph] of exportChoices(view)){
  const item=document.createElement('button');item.type='button';item.setAttribute('role','menuitem');item.dataset.exportFormat=format;
  item.innerHTML=icon(glyph)+'<span>'+esc(label)+'</span>';menu.append(item);
 }
 host.append(trigger,menu);
 menu.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
 trigger.onclick=()=>{
  if(menu.matches(':popover-open')){menu.hidePopover();return}
  menu.showPopover();const anchor=trigger.getBoundingClientRect(),rect=menu.getBoundingClientRect();
  menu.style.left=Math.max(6,Math.min(innerWidth-rect.width-6,anchor.right-rect.width))+'px';
  menu.style.top=Math.max(6,anchor.bottom+rect.height+6>innerHeight?anchor.top-rect.height-5:anchor.bottom+5)+'px';
  menu.firstElementChild.focus({preventScroll:true});
 };
 menu.onkeydown=e=>{
  const items=[...menu.children],index=items.indexOf(document.activeElement);
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();menu.hidePopover();trigger.focus();return}
  const offsets={ArrowDown:index+1,ArrowUp:index-1,Home:0,End:items.length-1};
  if(Object.hasOwn(offsets,e.key)){e.preventDefault();items[(offsets[e.key]+items.length)%items.length].focus()}
 };
 menu.onclick=e=>{
  const item=e.target.closest('[data-export-format]'),current=currentExport();if(!item||!current)return;
  menu.hidePopover();trigger.focus({preventScroll:true});exportFormat(current,item.dataset.exportFormat);
 };
}
const exportFocus=refreshFocus;refreshFocus=function(){exportFocus();mountPdfExport()};
const pdfRender=renderMain;renderMain=function(){pdfRender();mountPdfExport()};
const pdfGraph=renderUniverse;renderUniverse=function(){pdfGraph();mountPdfExport()};
commandList.push(['Exportar visualização para PDF','export-pdf','']);
mountPdfExport();
