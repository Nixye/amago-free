'use strict';
// Index affinity groups instead of constructing the complete workspace graph.
// Local neighborhoods can therefore reach notes beyond the 500 displayed points.
function atlasRelationshipData(all,{relation='hybrid',query='',linked=false,focus=null,depth=1,limit=500,incidentOnly=false,compact=false}={}){
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
 let compacted=false;
 const docs=filtered.slice(0,limit),shown=new Set(docs.map(docId)),pairs=new Map();
 function edge(a,b,kind,value){
  if(incidentOnly&&a!==focus&&b!==focus)return;
  const key=JSON.stringify([a,b].sort());let item=pairs.get(key);
  if(!item){item={a,b,types:[],tags:[],mentions:[],direction:'none'};pairs.set(key,item)}
  if(kind==='links')item.direction=item.direction==='both'||a!==item.a?'both':'forward';
  if(!item.types.includes(kind))item.types.push(kind);
  if(value)item[kind].push(value);
 }
 for(const {a,b} of references)if(shown.has(a)&&shown.has(b))edge(a,b,'links');
 for(const kind of ['tags','mentions'])for(const group of groups[kind].values()){
  const members=[...group.ids].filter(id=>shown.has(id));
  if(incidentOnly){if(group.ids.has(focus))for(const other of members)if(other!==focus)edge(focus,other,kind,group.value)}
  else if(compact&&members.length>20){
   compacted=true;
   for(let i=1;i<members.length;i++)edge(members[i-1],members[i],kind,group.value);
  }
  else for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++)edge(members[i],members[j],kind,group.value);
 }
 const names=new Map(docs.map(doc=>[docId(doc),doc.title||doc.name]));
 const edges=[...pairs.values()].map(item=>({...item,label:[
  item.direction!=='none'?'Link entre documentos · '+names.get(item.a)+(item.direction==='both'?' ↔ ':' → ')+names.get(item.b):'',
  item.tags.length?'Tags: '+item.tags.map(tag=>'#'+tag).join(', '):'',
  item.mentions.length?'Menções: '+item.mentions.join(', '):''
 ].filter(Boolean).join(' · ')}));
 return {docs,edges,total:filtered.length,compacted};
}
graphData=function(){
 const prefs=graphPreferences();
 return atlasRelationshipData(discoveryDocs(),{relation:atlasSelectedRelations(),query:discovery.graphQuery,linked:discovery.linked,focus:discovery.localFocus,depth:Infinity,limit:Infinity,compact:true});
};
const atlasRelationLabels={links:'Links',tags:'Tags em comum',mentions:'Menções em comum'};
function atlasSelectedRelations(){const prefs=graphPreferences();return Array.isArray(prefs.relations)?Object.keys(atlasRelationLabels).filter(type=>prefs.relations.includes(type)):prefs.relation&&prefs.relation!=='hybrid'?[prefs.relation]:Object.keys(atlasRelationLabels)}
function atlasRelationColor(type){return `var(--relation-${type})`}
function atlasRelationLegend(){return `<div class="relation-legend" aria-label="Legenda das relações">${Object.entries(atlasRelationLabels).map(([type,label])=>`<span><i style="background:${atlasRelationColor(type)}"></i>${label}</span>`).join('')}<span><i class="relation-mixed"></i>Cores mescladas: mais de um tipo</span><span data-flow-key>→ Referência · ↔ Referências nos dois sentidos</span></div>`}
function atlasGradientStops(types){return types.map((type,index)=>`<stop offset="${index*100/Math.max(1,types.length-1)}%" stop-color="${atlasRelationColor(type)}"/>`).join('')}
const atlasSVG='http://www.w3.org/2000/svg';
function atlasElement(tag,attributes={}){
 const element=document.createElementNS(atlasSVG,tag);
 for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);
 return element;
}
function atlasArrow(id){
 const marker=atlasElement('marker',{id,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:9,markerHeight:9,markerUnits:'userSpaceOnUse',orient:'auto-start-reverse'});
 marker.append(atlasElement('path',{d:'M1 1.5 9 5 1 8.5 3.2 5Z',fill:'var(--relation-links)'}));
 return marker;
}
function atlasColorEdges(svg,edges){
 const defs=atlasElement('defs'),signals=atlasElement('g',{class:'atlas-signals','aria-hidden':'true'});
 defs.append(atlasArrow('atlas-arrow'));svg.prepend(defs);
 svg.querySelector('#universe-nodes').before(signals);
 const groups=new Map();
 let moving=0;
 svg.querySelectorAll('[data-edge]').forEach(line=>{
  const index=Number(line.dataset.edge),edge=edges[index],types=edge.types;
  line.dataset.relationTypes=types.join(' ');line.dataset.direction=edge.direction;
  const title=atlasElement('title');title.textContent=edge.label;line.append(title);
  let gradient;
  if(types.length===1)line.style.stroke=atlasRelationColor(types[0]);
  else{
   gradient=atlasElement('linearGradient',{id:'atlas-edge-'+index,gradientUnits:'userSpaceOnUse'});
   gradient.innerHTML=atlasGradientStops(types);defs.append(gradient);line.style.stroke='url(#'+gradient.id+')';
  }
  if(edge.direction!=='none')line.setAttribute('marker-end','url(#atlas-arrow)');
  if(edge.direction==='both')line.setAttribute('marker-start','url(#atlas-arrow)');
  const motions=[];
  if(edge.direction!=='none'&&moving<96){
   moving++;
   for(const reverse of edge.direction==='both'?[false,true]:[false]){
    const pulse=atlasElement('g',{'data-flow':reverse?'reverse':'forward'});
    pulse.append(atlasElement('path',{d:'M-13 0 Q-7 -1.8 0 -1.8 A1.8 1.8 0 1 1 0 1.8 Q-7 1.8 -13 0Z',fill:'var(--relation-links)'}));
    const motion=atlasElement('animateMotion',{rotate:'auto',repeatCount:'indefinite',calcMode:'linear',begin:'-'+((index*.83+(reverse?1.7:0))%5).toFixed(2)+'s'});
    const fade=atlasElement('animate',{attributeName:'opacity',values:'0;1;1;0',keyTimes:'0;.09;.88;1',repeatCount:'indefinite',begin:motion.getAttribute('begin')});
    pulse.append(motion,fade);signals.append(pulse);motions.push({motion,fade,reverse});
   }
  }
  if(gradient||motions.length)groups.set(line,{gradient,motions});
 });
 const update=line=>{
  const group=groups.get(line);if(!group)return;
  const x1=line.getAttribute('x1'),y1=line.getAttribute('y1'),x2=line.getAttribute('x2'),y2=line.getAttribute('y2');
  if(group.gradient)for(const key of ['x1','y1','x2','y2'])group.gradient.setAttribute(key,line.getAttribute(key));
  const duration=Math.max(2,Math.min(9,Math.hypot(x2-x1,y2-y1)/65)).toFixed(2)+'s';
  for(const {motion,fade,reverse} of group.motions){
   motion.setAttribute('path',reverse?'M '+x2+' '+y2+' L '+x1+' '+y1:'M '+x1+' '+y1+' L '+x2+' '+y2);
   motion.setAttribute('dur',duration);fade.setAttribute('dur',duration);
  }
 };
 for(const line of groups.keys())update(line);
 const observer=new MutationObserver(records=>{for(const line of new Set(records.map(r=>r.target)))update(line)});
 observer.observe(svg.querySelector('#universe-edges'),{subtree:true,attributes:true,attributeFilter:['x1','y1','x2','y2']});
}
const atlasMotionPreference=matchMedia('(prefers-reduced-motion: reduce)');
function atlasApplyMotion(){
 const svg=$('#universe-svg');if(!svg)return;
 const enabled=graphPreferences().motion!==false&&!atlasMotionPreference.matches;
 svg.classList.toggle('atlas-motion',enabled);
 if(enabled)svg.unpauseAnimations();else svg.pauseAnimations();
}
atlasMotionPreference.addEventListener('change',atlasApplyMotion);
const atlasRender=renderUniverse;
renderUniverse=function(){atlasRender();const prefs=graphPreferences(),svg=$('#universe-svg');
 const selected=atlasSelectedRelations();
 $('.universe-toolbar').insertAdjacentHTML('beforebegin',`<fieldset class="atlas-relations"><legend>Relações visíveis</legend>${Object.entries(atlasRelationLabels).map(([type,label])=>`<label><input type="checkbox" data-atlas-relation="${type}" ${selected.includes(type)?'checked':''}><i style="background:${atlasRelationColor(type)}"></i>${label}</label>`).join('')}<small>${selected.length?'Combine os tipos que deseja explorar.':'Nenhum tipo selecionado: somente as notas são exibidas.'}</small></fieldset>${atlasRelationLegend()}`);
 document.querySelectorAll('[data-atlas-relation]').forEach(input=>input.onchange=()=>{prefs.relations=[...document.querySelectorAll('[data-atlas-relation]:checked')].map(item=>item.dataset.atlasRelation);persist();renderUniverse();document.querySelector(`[data-atlas-relation="${input.dataset.atlasRelation}"]`)?.focus()});
 $('.universe-toolbar').insertAdjacentHTML('afterbegin',`<label><input type="checkbox" id="atlas-motion" ${prefs.motion!==false?'checked':''}>Animar conexões</label>`);
 atlasApplyMotion();$('#atlas-motion').onchange=e=>{prefs.motion=e.target.checked;persist();atlasApplyMotion()};
 const data=svg.graphData,degrees=new Map();for(const e of data.edges){degrees.set(e.a,(degrees.get(e.a)||0)+1);degrees.set(e.b,(degrees.get(e.b)||0)+1)}let max=0;for(const degree of degrees.values())max=Math.max(max,degree);document.querySelectorAll('.universe-node').forEach(n=>{n.classList.toggle('atlas-hub',max>0&&degrees.get(n.dataset.node)===max)});
 atlasColorEdges(svg,data.edges);
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
 const localEdges=points.map((p,i)=>{
  const dx=p.x-130,dy=p.y-100,length=Math.hypot(dx,dy)||1;
  const hasLink=p.edge.direction!=='none',toSource=p.edge.direction==='both'||hasLink&&p.edge.b===id,toNeighbor=p.edge.direction==='both'||hasLink&&p.edge.a===id;
  const line=atlasElement('line',{x1:130+dx/length*12,y1:100+dy/length*12,x2:p.x-dx/length*9,y2:p.y-dy/length*9});
  line.style.stroke='url(#local-relation-'+i+')';line.style.strokeWidth=1.5;line.style.strokeOpacity=hasLink?'.85':'.48';
  if(toSource)line.setAttribute('marker-start','url(#local-flow-arrow)');if(toNeighbor)line.setAttribute('marker-end','url(#local-flow-arrow)');
  const title=atlasElement('title');title.textContent=p.edge.label;line.append(title);return line.outerHTML;
 }).join('');
 const preview=`<section class="local-network"><svg viewBox="0 0 260 200" aria-label="${neighbors.length} notas relacionadas"><defs>${atlasArrow('local-flow-arrow').outerHTML}${points.map((p,i)=>`<linearGradient id="local-relation-${i}" gradientUnits="userSpaceOnUse" x1="130" y1="100" x2="${p.x}" y2="${p.y}">${atlasGradientStops(p.edge.types)}</linearGradient>`).join('')}</defs>${localEdges}<circle cx="130" cy="100" r="10" style="fill:var(--accent)"><title>${esc(source.title||source.name)}</title></circle>${points.map(p=>`<g role="button" tabindex="0" ${link(p.doc)} aria-label="Abrir ${esc(p.doc.title||p.doc.name)}"><circle cx="${p.x}" cy="${p.y}" r="7" style="fill:${atlasRelationColor(p.edge.types[0])}"/><text x="${p.x}" y="${p.y+19}" text-anchor="middle">${esc((p.doc.title||p.doc.name||'').slice(0,13))}</text><title>${esc(p.doc.path||p.doc.title)} · ${esc(p.edge.label)}</title></g>`).join('')}</svg><button class="plain-button" data-local-atlas="${esc(id)}">${icon('graph')}Mapa desta nota · ${neighbors.length}</button>${neighbors.length>8?'<small>Prévia com 8 pontos. A lista abaixo contém as demais relações.</small>':''}</section>`;
 const list=`<section class="panel-section related-documents"><h3 class="context-title">Notas relacionadas <span class="count">${neighbors.length}</span></h3>${neighbors.map(({doc,edge})=>`<button class="backlink relation-backlink" ${link(doc)}>${icon('note')}<span>${esc(doc.title||doc.name)}<small>${esc(doc.path||doc.folder||'')}</small><small class="relation-reasons">${esc(edge.label)}</small></span></button>`).join('')||`<p class="empty-small">${project&&discovery.indexing?'Indexando relações do projeto…':atlasSelectedRelations().length?'Nenhuma relação dos tipos selecionados.':'Selecione tipos de relação no mapa para exibi-los aqui.'}</p>`}</section>`;
 // Preserve directional links and missing-target diagnostics behind a disclosure.
 const container=document.createElement('div');container.innerHTML=listConnectionPanel(source,docs,project);
 const panel=container.firstElementChild,details=document.createElement('details');details.className='panel-section relation-link-details';details.innerHTML='<summary>Links e destinos do documento</summary>';
 for(const child of [...panel.children].slice(1))details.append(child);
 panel.insertAdjacentHTML('beforeend',preview+atlasRelationLegend()+list);panel.append(details);
 return panel.outerHTML;
};
