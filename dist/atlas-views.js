'use strict';
// Index affinity groups instead of constructing the complete workspace graph.
// Local neighborhoods can therefore reach notes beyond the 500 displayed points.
function atlasRelationshipData(all,{relation='hybrid',query='',linked=false,focus=null,depth=1,limit=500,incidentOnly=false}={}){
 all=all.filter(d=>!d.kind||d.kind==='markdown');
 const enabled=new Set(Array.isArray(relation)?relation:relation==='hybrid'?['links','tags','mentions']:[relation]);
 const candidates=focus?all:all.filter(d=>AmagoSearch.matches(d,query));
 const ids=new Set(candidates.map(docId)),metadata=new Map(candidates.map(d=>[docId(d),AmagoSearch.metadata(d.body)]));
 const direct=new Map(candidates.map(d=>[docId(d),new Set()])),references=[],groups={tags:new Map(),mentions:new Map()},membership=new Map();
 for(const doc of candidates){
  const id=docId(doc),meta=metadata.get(id),own=[];
  if(enabled.has('links'))for(const link of meta.links){
   const target=resolveLink(all,doc,link),other=target&&docId(target);
   if(other!==id&&ids.has(other)){direct.get(id).add(other);direct.get(other).add(id);references.push({a:id,b:other})}
  }
  for(const kind of ['tags','mentions'])if(enabled.has(kind)){
   const values=kind==='tags'?[...meta.tags,...(doc.tags||[])]:meta.mentions;
   for(const value of values){
    const key=AmagoSearch.normalize(value);if(!key)continue;
    let group=groups[kind].get(key);
    if(!group){group={kind,value,ids:new Set()};groups[kind].set(key,group)}
    if(!group.ids.has(id)){group.ids.add(id);own.push(group)}
   }
  }
  membership.set(id,own);
 }
 let neighborhood=null;
 if(focus){
  neighborhood=new Set(ids.has(focus)?[focus]:[]);
  let frontier=[...neighborhood];const expanded=new Set();
  for(let level=0;level<(depth===Infinity?all.length:Math.max(1,Math.min(3,Number(depth)||1)));level++){
   const next=new Set();
   for(const id of frontier){
    for(const other of direct.get(id)||[])if(!neighborhood.has(other))next.add(other);
    for(const group of membership.get(id)||[])if(!expanded.has(group)){
     expanded.add(group);for(const other of group.ids)if(!neighborhood.has(other))next.add(other);
    }
   }
   for(const id of next)neighborhood.add(id);frontier=[...next];
   if(!frontier.length)break;
  }
 }
 const filtered=candidates.filter(d=>{
  const id=docId(d);return AmagoSearch.matches(d,query)&&(!neighborhood||neighborhood.has(id))&&(!linked||direct.get(id).size||(membership.get(id)||[]).some(group=>group.ids.size>1));
 });
 // Keep the focused note visible even in a densely connected neighborhood.
 if(focus){const at=filtered.findIndex(d=>docId(d)===focus);if(at>0)filtered.unshift(...filtered.splice(at,1))}
 const docs=filtered.slice(0,limit),shown=new Set(docs.map(docId)),pairs=new Map();
 function edge(a,b,kind,value){
  if(incidentOnly&&a!==focus&&b!==focus)return;
  const key=JSON.stringify([a,b].sort());let item=pairs.get(key);
  if(!item){item={a,b,types:[],tags:[],mentions:[]};pairs.set(key,item)}
  if(!item.types.includes(kind))item.types.push(kind);
  if(value)item[kind].push(value);
 }
 for(const {a,b} of references)if(shown.has(a)&&shown.has(b))edge(a,b,'links');
 for(const kind of ['tags','mentions'])for(const group of groups[kind].values()){
  const members=[...group.ids].filter(id=>shown.has(id));
  if(incidentOnly){if(group.ids.has(focus))for(const other of members)if(other!==focus)edge(focus,other,kind,group.value)}
  else for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++)edge(members[i],members[j],kind,group.value);
 }
 const edges=[...pairs.values()].map(item=>({...item,label:[
  item.types.includes('links')?'Link entre documentos':'',
  item.tags.length?'Tags: '+item.tags.map(tag=>'#'+tag).join(', '):'',
  item.mentions.length?'Menções: '+item.mentions.join(', '):''
 ].filter(Boolean).join(' · ')}));
 return {docs,edges,total:filtered.length};
}
graphData=function(){
 const prefs=graphPreferences();
 return atlasRelationshipData(discoveryDocs(),{relation:atlasSelectedRelations(),query:discovery.graphQuery,linked:discovery.linked,focus:discovery.localFocus,depth:Infinity});
};
const atlasRelationLabels={links:'Links',tags:'Tags em comum',mentions:'Menções em comum'};
function atlasSelectedRelations(){const prefs=graphPreferences();return Array.isArray(prefs.relations)?Object.keys(atlasRelationLabels).filter(type=>prefs.relations.includes(type)):prefs.relation&&prefs.relation!=='hybrid'?[prefs.relation]:Object.keys(atlasRelationLabels)}
function atlasRelationColor(type){return `var(--relation-${type})`}
function atlasRelationLegend(){return `<div class="relation-legend" aria-label="Legenda das relações">${Object.entries(atlasRelationLabels).map(([type,label])=>`<span><i style="background:${atlasRelationColor(type)}"></i>${label}</span>`).join('')}<span><i class="relation-mixed"></i>Cores mescladas: mais de um tipo</span></div>`}
function atlasGradientStops(types){return types.map((type,index)=>`<stop offset="${index*100/Math.max(1,types.length-1)}%" stop-color="${atlasRelationColor(type)}"/>`).join('')}
function atlasColorEdges(svg,edges){
 const ns='http://www.w3.org/2000/svg',defs=document.createElementNS(ns,'defs'),gradients=new Map();svg.prepend(defs);
 const update=line=>{const gradient=gradients.get(line);if(gradient)for(const key of ['x1','y1','x2','y2'])gradient.setAttribute(key,line.getAttribute(key))};
 svg.querySelectorAll('[data-edge]').forEach(line=>{
  const types=edges[+line.dataset.edge]?.types||['links'];line.dataset.relationTypes=types.join(' ');
  if(types.length===1)line.style.stroke=atlasRelationColor(types[0]);
  else{const gradient=document.createElementNS(ns,'linearGradient');gradient.id='atlas-edge-'+line.dataset.edge;gradient.setAttribute('gradientUnits','userSpaceOnUse');gradient.innerHTML=atlasGradientStops(types);defs.append(gradient);gradients.set(line,gradient);update(line);line.style.stroke=`url(#${gradient.id})`}
  line.style.strokeOpacity='.85';
 });
 const observer=new MutationObserver(records=>{for(const line of new Set(records.map(record=>record.target)))update(line)});observer.observe(svg.querySelector('#universe-edges'),{subtree:true,attributes:true,attributeFilter:['x1','y1','x2','y2']});
}
const atlasPosition=graphPosition,atlasOrders=new WeakMap();
const atlasLayers=new WeakMap();
graphPosition=function(docs,index,layout){
 if(layout==='flow'){
  if(!atlasLayers.has(docs)){
   const edges=graphData().edges,levels=new Map(),incoming=new Set(edges.map(e=>e.b)),queue=docs.filter(d=>!incoming.has(docId(d))).map(docId);
   if(!queue.length&&docs.length)queue.push(docId(docs[0]));for(const id of queue)levels.set(id,0);
   for(let i=0;i<queue.length;i++)for(const edge of edges)if(edge.a===queue[i]&&!levels.has(edge.b)){levels.set(edge.b,levels.get(edge.a)+1);queue.push(edge.b)}
   for(const doc of docs)if(!levels.has(docId(doc)))levels.set(docId(doc),0);
   atlasLayers.set(docs,levels);
  }
  const levels=atlasLayers.get(docs),level=levels.get(docId(docs[index])),group=docs.filter(d=>levels.get(docId(d))===level),depth=Math.max(...levels.values(),1);
  return {x:100+level*800/depth,y:70+group.indexOf(docs[index])*420/Math.max(1,group.length-1)};
 }
 if(layout==='columns'){const cols=3,rows=Math.ceil(docs.length/cols);return {x:100+(index%cols)*400,y:70+Math.floor(index/cols)*420/Math.max(1,rows-1)}}
 if(layout==='organic'){if(!atlasOrders.has(docs)){const degree=new Map();for(const e of graphData().edges){degree.set(e.a,(degree.get(e.a)||0)+1);degree.set(e.b,(degree.get(e.b)||0)+1)}atlasOrders.set(docs,[...docs].sort((a,b)=>(degree.get(docId(b))||0)-(degree.get(docId(a))||0)))}const ordered=atlasOrders.get(docs);if(ordered[0]===docs[index])return {x:500,y:290};return atlasPosition(ordered,ordered.indexOf(docs[index]),layout)}
 return atlasPosition(docs,index,layout);
};
const atlasRender=renderUniverse;
renderUniverse=function(){atlasRender();const prefs=graphPreferences(),svg=$('#universe-svg');
 const selected=atlasSelectedRelations();
 $('.universe-toolbar').insertAdjacentHTML('beforebegin',`<fieldset class="atlas-relations"><legend>Relações visíveis</legend>${Object.entries(atlasRelationLabels).map(([type,label])=>`<label><input type="checkbox" data-atlas-relation="${type}" ${selected.includes(type)?'checked':''}><i style="background:${atlasRelationColor(type)}"></i>${label}</label>`).join('')}<small>${selected.length?'Combine os tipos que deseja explorar.':'Nenhum tipo selecionado: somente as notas são exibidas.'}</small></fieldset>${atlasRelationLegend()}`);
 document.querySelectorAll('[data-atlas-relation]').forEach(input=>input.onchange=()=>{prefs.relations=[...document.querySelectorAll('[data-atlas-relation]:checked')].map(item=>item.dataset.atlasRelation);persist();renderUniverse();document.querySelector(`[data-atlas-relation="${input.dataset.atlasRelation}"]`)?.focus()});
 $('.universe-toolbar').insertAdjacentHTML('afterbegin',`<label><input type="checkbox" id="atlas-motion" ${prefs.motion!==false?'checked':''}>Animar conexões</label>`);
 const motion=()=>{const enabled=prefs.motion!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches;svg.classList.toggle('atlas-motion',enabled);enabled?svg.unpauseAnimations():svg.pauseAnimations()};motion();$('#atlas-motion').onchange=e=>{prefs.motion=e.target.checked;persist();motion()};
 const data=graphData(),degrees=new Map();for(const e of data.edges){degrees.set(e.a,(degrees.get(e.a)||0)+1);degrees.set(e.b,(degrees.get(e.b)||0)+1)}const max=Math.max(0,...degrees.values());document.querySelectorAll('.universe-node').forEach(n=>{n.classList.toggle('atlas-hub',max>0&&degrees.get(n.dataset.node)===max)});
 const ns='http://www.w3.org/2000/svg',signals=document.createElementNS(ns,'g');signals.classList.add('atlas-signals');$('#universe-camera').append(signals);
 [...document.querySelectorAll('[data-edge]')].slice(0,100).forEach((line,i)=>{const dot=document.createElementNS(ns,'circle');dot.setAttribute('r','3');dot.setAttribute('fill','var(--accent)');const animation=document.createElementNS(ns,'animateMotion');animation.setAttribute('dur','3s');animation.setAttribute('repeatCount','indefinite');animation.setAttribute('begin',(i%8)*.25+'s');const update=()=>animation.setAttribute('path','M '+line.getAttribute('x1')+' '+line.getAttribute('y1')+' L '+line.getAttribute('x2')+' '+line.getAttribute('y2'));update();const observer=new MutationObserver(update);observer.observe(line,{attributes:true,attributeFilter:['x1','y1','x2','y2']});dot.append(animation);signals.append(dot);const target=[...document.querySelectorAll('.universe-node')].find(n=>n.dataset.node===data.edges[i]?.b);if(target){const blink=document.createElementNS(ns,'animate');blink.setAttribute('attributeName','opacity');blink.setAttribute('values','1;1;.35;1');blink.setAttribute('keyTimes','0;0.85;0.92;1');blink.setAttribute('dur','3s');blink.setAttribute('begin',(i%8)*.25+'s');blink.setAttribute('repeatCount','indefinite');target.append(blink)}});
 atlasColorEdges(svg,data.edges);
 signals.querySelectorAll('circle').forEach((dot,i)=>{dot.setAttribute('fill',atlasRelationColor(data.edges[i]?.types[0]||'links'))});
 document.querySelectorAll('[data-edge]').forEach((edge,i)=>{const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=data.edges[i]?.label||'Referência entre documentos';edge.append(title)});
 if(['flow','columns'].includes(prefs.layout)){svg.classList.add('atlas-cards');document.querySelectorAll('.universe-node').forEach(node=>{const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v] of Object.entries({x:-70,y:-22,width:140,height:58,rx:9}))rect.setAttribute(k,v);node.insertBefore(rect,node.firstChild);node.querySelector('text').setAttribute('y','10')});$('#node-size').disabled=true}
};

// The note panel shares the map's relation engine, without inheriting its text query.
function atlasNoteRelations(source,docs){
 const current=docs.find(doc=>docId(doc)===docId(source)||source.path&&doc.path===source.path);
 const active={...current,...source,id:current?docId(current):docId(source)};
 const all=[active,...docs.filter(doc=>docId(doc)!==docId(active))];
 return atlasRelationshipData(all,{relation:atlasSelectedRelations(),focus:docId(active),depth:1,limit:Infinity,incidentOnly:true});
}
connectionPanel=function(source,docs,project){
 const data=atlasNoteRelations(source,docs),id=docId(data.docs[0]||source),byId=new Map(data.docs.map(doc=>[docId(doc),doc]));
 const neighbors=data.edges.map(edge=>({edge,doc:byId.get(edge.a===id?edge.b:edge.a)})).filter(item=>item.doc);
 const link=doc=>project?`data-project-file="${esc(doc.path)}"`:`data-note="${esc(doc.id)}"`;
 const points=neighbors.slice(0,8).map((item,index)=>({...item,x:130+85*Math.cos(index*2*Math.PI/Math.min(8,neighbors.length)-Math.PI/2),y:100+65*Math.sin(index*2*Math.PI/Math.min(8,neighbors.length)-Math.PI/2)}));
 const preview=`<section class="local-network"><svg viewBox="0 0 260 200" aria-label="${neighbors.length} notas relacionadas"><defs>${points.map((p,i)=>`<linearGradient id="local-relation-${i}" gradientUnits="userSpaceOnUse" x1="130" y1="100" x2="${p.x}" y2="${p.y}">${atlasGradientStops(p.edge.types)}</linearGradient>`).join('')}</defs>${points.map((p,i)=>`<line x1="130" y1="100" x2="${p.x}" y2="${p.y}" style="stroke:url(#local-relation-${i});stroke-opacity:.85;stroke-width:2"><title>${esc(p.edge.label)}</title></line>`).join('')}<circle cx="130" cy="100" r="10" style="fill:var(--accent)"><title>${esc(source.title||source.name)}</title></circle>${points.map(p=>`<g role="button" tabindex="0" ${link(p.doc)} aria-label="Abrir ${esc(p.doc.title||p.doc.name)}"><circle cx="${p.x}" cy="${p.y}" r="7" style="fill:${atlasRelationColor(p.edge.types[0])}"/><text x="${p.x}" y="${p.y+19}" text-anchor="middle">${esc((p.doc.title||p.doc.name||'').slice(0,13))}</text><title>${esc(p.doc.path||p.doc.title)} · ${esc(p.edge.label)}</title></g>`).join('')}</svg><button class="plain-button" data-local-atlas="${esc(id)}">${icon('graph')}Mapa desta nota · ${neighbors.length}</button>${neighbors.length>8?'<small>Prévia com 8 pontos. A lista abaixo contém as demais relações.</small>':''}</section>`;
 const list=`<section class="panel-section related-documents"><h3 class="context-title">Notas relacionadas <span class="count">${neighbors.length}</span></h3>${neighbors.map(({doc,edge})=>`<button class="backlink relation-backlink" ${link(doc)}>${icon('note')}<span>${esc(doc.title||doc.name)}<small>${esc(doc.path||doc.folder||'')}</small><small class="relation-reasons">${esc(edge.label)}</small></span></button>`).join('')||`<p class="empty-small">${project&&discovery.indexing?'Indexando relações do projeto…':atlasSelectedRelations().length?'Nenhuma relação dos tipos selecionados.':'Selecione tipos de relação no mapa para exibi-los aqui.'}</p>`}</section>`;
 // Preserve directional links and missing-target diagnostics behind a disclosure.
 const container=document.createElement('div');container.innerHTML=listConnectionPanel(source,docs,project);
 const panel=container.firstElementChild,details=document.createElement('details');details.className='panel-section relation-link-details';details.innerHTML='<summary>Links e destinos do documento</summary>';
 for(const child of [...panel.children].slice(1))details.append(child);
 panel.insertAdjacentHTML('beforeend',preview+atlasRelationLegend()+list);panel.append(details);
 return panel.outerHTML;
};
