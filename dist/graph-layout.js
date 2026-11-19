'use strict';

const builtInGraphLayouts=[['organic','Orgânica'],['circle','Circular'],['folders','Por pasta'],['flow','Fluxograma'],['columns','Colunas']];
function graphLayoutChoices(){return builtInGraphLayouts}

function arrangeGraph(docs,edges,layout){
 const ids=docs.map(docId),positions=new Map(),neighbors=new Map(ids.map(id=>[id,new Set()]));
 const incoming=new Set();
 for(const {a,b,direction} of edges){
  neighbors.get(a).add(b);neighbors.get(b).add(a);
  if(direction!=='none')incoming.add(b);if(direction==='both')incoming.add(a);
 }
 // Reserve a label-width cell for every node, independent of the viewport.
 const dx=230,dy=85;
 function grid(group,left,top,cols){
  group.forEach((id,i)=>positions.set(id,{x:left+i%cols*dx,y:top+Math.floor(i/cols)*dy}));
 }
 if(layout==='circle'){
  const radius=Math.max(100,ids.length*dx/(2*Math.PI));
  ids.forEach((id,i)=>{const angle=i*2*Math.PI/ids.length;positions.set(id,{x:radius*Math.cos(angle),y:radius*Math.sin(angle)})});
 }else if(layout==='folders'){
  const folders=new Map();
  for(const doc of docs){const folder=doc.folder||doc.path?.split('/').slice(0,-1).join('/')||'';if(!folders.has(folder))folders.set(folder,[]);folders.get(folder).push(docId(doc))}
  let x=0,y=0,rowHeight=0;const wrap=Math.ceil(Math.sqrt(ids.length))*dx*1.6;
  for(const group of folders.values()){
   const cols=Math.ceil(Math.sqrt(group.length)),width=cols*dx;
   if(x&&x+width>wrap){x=0;y+=rowHeight+dy;rowHeight=0}
   grid(group,x,y,cols);x+=width+dx*.5;rowHeight=Math.max(rowHeight,Math.ceil(group.length/cols)*dy);
  }
 }else if(layout==='columns'){
  grid(ids,0,0,Math.max(1,Math.ceil(Math.sqrt(ids.length/2))));
 }else{
  const seen=new Set(),groups=[];
  const seeds=[...ids].sort((a,b)=>layout==='flow'?(Number(incoming.has(a))-Number(incoming.has(b))||neighbors.get(b).size-neighbors.get(a).size):neighbors.get(b).size-neighbors.get(a).size);
  for(const seed of seeds){
   if(seen.has(seed))continue;
   const layers=[[seed]];seen.add(seed);
   for(let i=0;i<layers.length;i++){
    const next=[];for(const id of layers[i])for(const other of neighbors.get(id))if(!seen.has(other)){seen.add(other);next.push(other)}
    if(next.length)layers.push(next);
   }
   groups.push(layers);
  }
  let left=0,top=0,height=0;
  const wrap=Math.max(3,Math.ceil(Math.sqrt(ids.length)))*dx*1.7;
  for(const layers of groups){
   const group=layers.flat(),cols=Math.ceil(Math.sqrt(group.length)),flow=layout==='flow';
   const width=(flow?layers.length:cols)*dx;
   if(left&&left+width>wrap){left=0;top+=height+dy*.5;height=0}
   if(flow){layers.forEach((layer,i)=>grid(layer,left+i*dx,top,1))}
   else{
    // Place nearby graph neighbors on successive rings around the component hub.
    group.forEach((id,i)=>{
     const radius=Math.sqrt(i)*dx*.87,angle=i*2.399963;
     positions.set(id,{x:left+cols*dx*.8+Math.cos(angle)*radius,y:top+cols*dy*.8+Math.sin(angle)*radius*dy/dx});
    });
   }
   left+=flow?width+dx:cols*dx*1.9;
   height=Math.max(height,(flow?Math.max(...layers.map(l=>l.length)):cols*1.9)*dy);
  }
 }
 return positions;
}
function fitGraphCamera(bounds){
 if(!bounds||!bounds.width&&!bounds.height)return {x:500,y:300,zoom:1};
 const zoom=Math.min(2,920/Math.max(1,bounds.width+32),510/Math.max(1,bounds.height+48));
 return {x:500-(bounds.x+bounds.width/2)*zoom,y:290-(bounds.y+bounds.height/2)*zoom,zoom};
}
