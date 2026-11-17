import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),L=require('../dist/link-core.js'),S=require('../dist/search-core.js');
const context=vm.createContext({AmagoSearch:S,docId:d=>d.id||d.path,resolveLink:(docs,source,link)=>L.resolve(docs,source,link,{aliases:d=>S.metadata(d.body).aliases})});
const source=readFileSync(new URL('../dist/atlas-views.js',import.meta.url),'utf8');
vm.runInContext(source.slice(source.indexOf('function atlasRelationshipData'),source.indexOf('graphData=function')),context);
const graph=context.atlasRelationshipData;
const docs=[
 {id:'a',title:'Alpha',body:'[[Beta]] [[Beta]] #Design #design @Luna',tags:['DESIGN']},
 {id:'b',title:'Beta',body:'[[Alpha]] #désiGn @luna'},
 {id:'c',title:'Gamma',body:'@Luna'},
 {id:'d',title:'Delta',body:'Sem conexões'},
 {id:'image',title:'Imagem',kind:'image',body:'#Design @Luna'}
];
const pairs=data=>Array.from(data.edges,e=>[e.a,e.b].sort().join(':')).sort();
let data=graph(docs);
assert.equal(data.docs.length,4);
assert.deepEqual(pairs(data),['a:b','a:c','b:c']);
const combined=data.edges.find(e=>e.a==='a'&&e.b==='b');
assert.equal(combined.types.join(','),'links,tags,mentions');
assert.equal(combined.tags.length,1,'Normalize and deduplicate frontmatter, inline and stored tags');
assert.equal(combined.mentions.length,1);
assert.match(combined.label,/Link entre documentos.*Tags: #design.*Menções: Luna/i);
assert.deepEqual(pairs(graph(docs,{relation:'links'})),['a:b']);
assert.deepEqual(pairs(graph(docs,{relation:'tags'})),['a:b']);
assert.deepEqual(pairs(graph(docs,{relation:'mentions'})),['a:b','a:c','b:c']);
assert.deepEqual(pairs(graph(docs,{relation:['links','tags']})),['a:b']);
assert.equal(graph(docs,{relation:[]}).edges.length,0);
assert.equal(graph(docs,{relation:[]}).docs.length,4);
assert.deepEqual(pairs(graph(docs,{focus:'a',incidentOnly:true})),['a:b','a:c']);
assert.equal(graph(docs,{focus:'a',incidentOnly:true,relation:['tags']}).edges[0].types.join(','),'tags');
assert.equal(graph(docs,{linked:true}).docs.map(d=>d.id).join(','),'a,b,c');
assert.equal(graph(docs,{linked:true,relation:'tags'}).total,2);
assert.equal(graph(docs,{query:'-name:Beta',relation:'hybrid'}).edges.length,1);
assert.equal(graph(docs,{query:'name:Alpha',linked:true}).total,0,'Only connections within the filtered graph count');
assert.equal(graph(docs,{focus:'missing'}).total,0);
assert.equal(graph(docs,{focus:'a',relation:'links'}).docs.map(d=>d.id).join(','),'a,b');
const reversed=graph([{id:'target',title:'Target',body:''},{id:'source',title:'Source',body:'[[Target]]'}],{relation:'links'}).edges[0];
assert.equal(reversed.a,'source');assert.equal(reversed.b,'target','Flow layout keeps the original link direction');
const chain=[{id:'a',title:'A',body:'[[B]]'},{id:'b',title:'B',body:'#shared'},{id:'c',title:'C',body:'#shared @person'},{id:'d',title:'D',body:'@person'}];
for(const [depth,expected] of [[1,'a,b'],[2,'a,b,c'],[3,'a,b,c,d']]){
 assert.equal(graph(chain,{focus:'a',depth}).docs.map(d=>d.id).join(','),expected);
}
// Truncate only after filtering and discovering the complete local neighborhood.
const many=Array.from({length:501},(_,i)=>({id:'isolated-'+i,title:'Isolada '+i,body:''}));
many.push({id:'focus',title:'Foco',body:'#rare'},{id:'neighbor',title:'Vizinha',body:'#rare'});
assert.equal(graph(many).docs.length,500);assert.equal(graph(many).total,503);
assert.equal(graph(many,{linked:true}).docs.map(d=>d.id).join(','),'focus,neighbor');
assert.equal(graph(many,{focus:'focus'}).docs.map(d=>d.id).join(','),'focus,neighbor');
const dense=Array.from({length:501},(_,i)=>({id:String(i),body:'#dense'}));
data=graph(dense,{focus:'500',limit:4});
assert.equal(data.total,501);assert.equal(data.docs[0].id,'500');assert.equal(data.edges.length,6);
assert.equal(new Set(pairs(data)).size,data.edges.length);
const code=[{id:'one',body:'```\n#hidden @ghost [[Two]]\n```'},{id:'two',title:'Two',body:'#hidden @ghost'}];
assert.equal(graph(code).edges.length,0,'Code examples must not create relations');
console.log('Atlas: hybrid deduplication, relation filters, readable reasons, combined neighborhoods, query filtering and display limits passed.');
