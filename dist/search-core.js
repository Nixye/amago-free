/* Shared metadata and hybrid search, compatible with Markdown vaults. */
(function(root){
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
const unique=values=>[...new Map(values.filter(Boolean).map(value=>[normalize(value),value])).values()];
function unquote(value){value=value.trim();if(value.startsWith('"'))try{return JSON.parse(value)}catch{}return value.replace(/^['"]|['"]$/g,'')}
function list(value){if(Array.isArray(value))return value.map(String);return String(value||'').replace(/^\[|\]$/g,'').split(/,(?=(?:[^"']|"[^"]*"|'[^']*')*$)/).map(unquote).map(x=>x.trim()).filter(Boolean)}
function stripCode(body){return body.replace(/^ {0,3}(`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?(?:^ {0,3}\1[^\r\n]*(?:\r?\n|$)|(?![\s\S]))/gm,'').replace(/(`+)[\s\S]*?\1/g,'').replace(/<!--[\s\S]*?(?:-->|$)/g,'').replace(/%%[\s\S]*?(?:%%|$)/g,'')}
function metadata(body=''){
 body=String(body||'');const front=body.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/),fields={};
 if(front){let key='';for(const line of front[1].split(/\r?\n/)){const match=line.match(/^([\w-]+):\s*(.*)$/);if(match){key=match[1].toLowerCase();fields[key]=unquote(match[2])}else if(key&&(fields[key]===''||Array.isArray(fields[key]))&&/^\s*-\s+/.test(line)){if(!Array.isArray(fields[key]))fields[key]=[];fields[key].push(unquote(line.replace(/^\s*-\s+/,'')))}}}
 const text=stripCode(front?body.slice(front[0].length):body);
 const inlineTags=[...text.matchAll(/(?:^|[^\p{L}\p{N}_/\\#])#([\p{L}\p{N}_/-]+)/gu)].map(m=>m[1]).filter(t=>/[\p{L}_/-]/u.test(t));
 const propertyTags=list(fields.tags||fields.tag).flatMap(t=>t.split(/\s+/)).map(t=>t.replace(/^#/,''));
 const references=AmagoLinks.references(body).filter(r=>AmagoLinks.local(r.target));
 const wiki=references.filter(r=>r.syntax==='wiki').map(r=>r.target).filter(Boolean);
 const localLinks=references.filter(r=>r.syntax==='markdown').map(r=>r.target).filter(Boolean);
 const at=[...text.matchAll(/(?:^|[^\p{L}\p{N}_\\])@([\p{L}\p{N}_][\p{L}\p{N}_.-]*)/gu)].map(m=>m[1].replace(/[.-]+$/,''));
 const aliases=list(fields.aliases||fields.alias);
 return {tags:unique([...propertyTags,...inlineTags]),propertyTags:unique(propertyTags),inlineTags:unique(inlineTags),mentions:unique([...wiki,...at]),links:unique([...wiki,...localLinks,...at]),aliases,properties:fields,color:/^#[\da-f]{6}$/i.test(fields.color||'')?fields.color:null,date:String(fields.date||''),front:front?.[0]||''};
}
function tokens(query){return (String(query||'').match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)||[]).map(raw=>{let value=raw,negative=false;if(value.startsWith('-')){negative=true;value=value.slice(1)}const match=value.match(/^(tag|tags|mention|mencao|menção|date|data|after|before|apos|antes|path|nome|name|content|conteudo|conteúdo|type|tipo|ext|is):(.+)$/i);let field=match?normalize(match[1]):'text';value=match?match[2]:value;if(!match&&value.startsWith('#')){field='tag';value=value.slice(1)}if(!match&&value.startsWith('@')){field='mention';value=value.slice(1)}return {raw,negative,field,value:normalize(value.replace(/^['"]|['"]$/g,''))}})}
function taskCounts(body=''){
 const text=String(body).replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/,'');let fence=null,comment=null,pending=0,done=0;
 for(const line of text.split(/\r?\n/)){
  const marker=!comment&&line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if(fence){if(marker&&marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;continue}
  if(marker){fence=marker[1];continue}
  let visible='';
  for(let i=0;i<line.length;){
   if(comment){const end=line.indexOf(comment,i);if(end<0)break;visible+=' '.repeat(end+comment.length-i);i=end+comment.length;comment=null;continue}
   if(line[i]==='\\'&&i+1<line.length){visible+=line.slice(i,i+2);i+=2;continue}
   if(line[i]==='`'){const run=line.slice(i).match(/^`+/)[0],end=line.indexOf(run,i+run.length);if(end>=0){visible+=line.slice(i,end+run.length);i=end+run.length;continue}}
   if(line.startsWith('<!--',i)){comment='-->';visible+='    ';i+=4;continue}
   if(line.startsWith('%%',i)){comment='%%';visible+='  ';i+=2;continue}
   visible+=line[i++];
  }
  const task=visible.match(/^\s*[-*+]\s+\[([ xX])\]\s+\S/);if(task)task[1]===' '?pending++:done++;
 }
 return {pending,done,total:pending+done};
}
function documentKind(doc){return doc.kind||(!doc.path?'markdown':/\.(?:md|markdown)$/i.test(doc.path)?'markdown':root.AmagoFiles?.kind?.(doc.path)||'file')}
function documentExtension(doc){const name=doc.path||doc.name||'';return normalize(name.match(/\.([^./\\]+)$/)?.[1]||(!doc.path&&!doc.kind?'md':''))}
function documentData(doc){const meta=metadata(doc.body);return {...doc,...meta,tags:unique([...(doc.tags||[]),...meta.tags]),date:meta.date||doc.updated||doc.created||''}}
function matches(doc,query){const d=documentData(doc),title=normalize((doc.title||doc.name||'')+' '+(doc.path||'')+' '+d.aliases.join(' ')),body=normalize(doc.body),date=String(d.date).slice(0,10);let tasks;return tokens(query).every(t=>{let yes;switch(t.field){case'tag':case'tags':yes=d.tags.some(x=>normalize(x).includes(t.value));break;case'mention':case'mencao':yes=d.mentions.some(x=>normalize(x).includes(t.value));break;case'date':case'data':yes=date.startsWith(t.value);break;case'after':case'apos':yes=!!date&&date>=t.value;break;case'before':case'antes':yes=!!date&&date<=t.value;break;case'path':case'nome':case'name':yes=title.includes(t.value);break;case'content':case'conteudo':yes=body.includes(t.value);break;case'type':case'tipo':yes=documentKind(doc)===({md:'markdown',texto:'text',imagem:'image',arquivo:'file'}[t.value]||t.value);break;case'ext':yes=documentExtension(doc)===t.value.replace(/^\./,'');break;case'is':tasks??=taskCounts(doc.body);yes=t.value==='task'?tasks.total>0:t.value==='todo'?tasks.pending>0:t.value==='done'?tasks.done>0:false;break;default:yes=(title+' '+body).includes(t.value)}return t.negative?!yes:yes})}
function matchRanges(text,terms){
 const map=[],ends=[];let folded='',offset=0;
 for(const char of String(text)){const value=normalize(char);if(!value&&/\p{M}/u.test(char)&&ends.length)ends[ends.length-1]=offset+char.length;for(let i=0;i<value.length;i++){map.push(offset);ends.push(offset+char.length)}folded+=value;offset+=char.length}
 const ranges=[];
 for(const term of unique(terms).filter(Boolean)){const needle=normalize(term);if(!needle)continue;let at=0;while((at=folded.indexOf(needle,at))>=0){ranges.push({start:map[at],end:ends[at+needle.length-1]});at+=needle.length;if(ranges.length>=500)break}}
 const merged=[];for(const range of ranges.sort((a,b)=>a.start-b.start||a.end-b.end)){const previous=merged.at(-1);if(previous&&range.start<=previous.end)previous.end=Math.max(previous.end,range.end);else merged.push({...range})}return merged;
}
function snippet(doc,query,size=200){
 const positive=tokens(query).filter(t=>!t.negative),d=documentData(doc),body=String(doc.body||'').slice(d.front.length),terms=positive.filter(t=>['text','content','conteudo'].includes(t.field)).map(t=>t.value);
 let text=body,ranges=matchRanges(text,terms),source='content';
 if(!ranges.length){
  source='metadata';const task=positive.some(t=>t.field==='is')?taskCounts(doc.body):null;
  text=[doc.title||doc.name,doc.path||doc.folder,d.aliases.length?'Aliases: '+d.aliases.join(', '):'',d.tags.length?d.tags.map(t=>'#'+t).join(' '):'',d.mentions.length?d.mentions.map(t=>'@'+t).join(' '):'',d.date?'Data: '+String(d.date).slice(0,10):'','Tipo: '+documentKind(doc),'Extensão: '+(documentExtension(doc)||'sem extensão'),task?task.pending+' pendentes · '+task.done+' concluídas':''].filter(Boolean).join(' · ');
  ranges=matchRanges(text,positive.filter(t=>!['content','conteudo','is'].includes(t.field)).map(t=>t.value.replace(/^\./,'')));
 }
 const first=ranges[0]?.start||0,start=Math.max(0,first-60),end=Math.min(text.length,start+size),prefix=start?'…':'',suffix=end<text.length?'…':'';
 return {text:prefix+text.slice(start,end)+suffix,source,ranges:ranges.filter(r=>r.end>start&&r.start<end).map(r=>({start:Math.max(r.start,start)-start+prefix.length,end:Math.min(r.end,end)-start+prefix.length}))};
}
// Replace only the chosen top-level YAML blocks; leave other properties and body intact.
function withProperties(body,values){const meta=metadata(body),newline=body.includes('\r\n')?'\r\n':'\n';let lines=meta.front?meta.front.replace(/^\uFEFF?---\r?\n/,'').replace(/\r?\n(?:---|\.\.\.)(?:\r?\n|$)$/,'').split(/\r?\n/):[];
 for(const [key,value] of Object.entries(values)){if(!/^[a-z][\w-]*$/i.test(key))throw Error('Propriedade inválida.');const start=lines.findIndex(l=>new RegExp('^'+key+':','i').test(l));if(start>=0){let end=start+1;while(end<lines.length&&!/^[^\s#][^:]*:/.test(lines[end])){if(/^#/.test(lines[end]))break;end++}lines.splice(start,end-start)}if(value!==null&&value!==undefined)lines.push(key+': '+JSON.stringify(value))}
 return (body.startsWith('\uFEFF')?'\uFEFF':'')+'---'+newline+lines.join(newline)+newline+'---'+newline+(meta.front?body.slice(meta.front.length):newline+body.replace(/^\uFEFF/,''));
}
function withColor(body,color){if(!/^#[\da-f]{6}$/i.test(color))throw Error('Cor inválida.');return withProperties(body,{color})}
root.AmagoSearch={normalize,metadata,tokens,documentData,matches,withColor,withProperties,taskCounts,documentKind,documentExtension,matchRanges,snippet};
if(typeof module!=='undefined')module.exports=root.AmagoSearch;
})(globalThis);
