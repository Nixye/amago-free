(function(root){
 'use strict';
 function expression(query,caseSensitive=false){
  return query?new RegExp(String(query).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),caseSensitive?'gu':'giu'):null;
 }
 function find(body,query,caseSensitive=false,limit=5000){
  const regex=expression(query,caseSensitive),matches=[];let total=0;
  if(regex)for(const match of String(body).matchAll(regex)){if(matches.length<limit)matches.push({start:match.index,end:match.index+match[0].length});total++}
  return {matches,total,truncated:total>matches.length};
 }
 function replaceAll(body,query,replacement,caseSensitive=false){
  const regex=expression(query,caseSensitive);let count=0;
  const text=regex?String(body).replace(regex,()=>{count++;return String(replacement)}):String(body);
  return {text,count};
 }
 function replaceAt(body,query,replacement,range,caseSensitive=false){
  if(!range||range.start<0||range.end>body.length)return null;
  const match=find(body.slice(range.start,range.end),query,caseSensitive);
  if(match.total!==1||match.matches[0].start!==0||match.matches[0].end!==range.end-range.start)return null;
  return {text:body.slice(0,range.start)+replacement+body.slice(range.end),start:range.start,end:range.start+replacement.length};
 }
 function headings(body){
  const result=[];let offset=0,fence=null,comment=null,front=false;
  const lines=String(body).match(/[^\n]*\n|[^\n]+$/g)||[];
  for(let index=0;index<lines.length;index++){
   const raw=lines[index],line=raw.replace(/\r?\n$/,'');
   if(index===0&&/^\uFEFF?---\s*$/.test(line)){front=true;offset+=raw.length;continue}
   if(front){if(/^(?:---|\.\.\.)\s*$/.test(line))front=false;offset+=raw.length;continue}
   const marker=!comment&&line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
   if(marker&&(!fence||(marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim()))){fence=fence?null:marker[1];offset+=raw.length;continue}
   if(fence){offset+=raw.length;continue}
   let visible='';
   for(let i=0;i<line.length;){
    if(comment){const end=line.indexOf(comment,i);if(end<0){visible+=' '.repeat(line.length-i);break}visible+=' '.repeat(end+comment.length-i);i=end+comment.length;comment=null;continue}
    if(line.startsWith('<!--',i)||line.startsWith('%%',i)){comment=line.startsWith('<!--',i)?'-->':'%%';const length=comment==='-->'?4:2;visible+=' '.repeat(length);i+=length;continue}
    if(line[i]==='`'){const run=line.slice(i).match(/^`+/)[0],end=line.indexOf(run,i+run.length);if(end>=0){visible+=line.slice(i,end+run.length);i=end+run.length;continue}}
    visible+=line[i++];
   }
   const match=visible.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/);
   if(match){const title=match[2].replace(/[ \t]+#+[ \t]*$/,'').trim();result.push({level:match[1].length,title:title||'Sem título',line:index+1,start:offset,end:offset+line.length})}
   offset+=raw.length;
  }
  return result;
 }
 function normalizeName(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase()}
 function filterTree(entries,query){
  const terms=normalizeName(query).trim().split(/\s+/).filter(Boolean);if(!terms.length)return entries;
  const matches=entry=>terms.every(term=>normalizeName(entry.path||entry.name).includes(term));
  return entries.flatMap(entry=>{if(entry.kind!=='directory')return matches(entry)?[entry]:[];const children=filterTree(entry.children||[],query);return matches(entry)||children.length?[{...entry,children:matches(entry)?entry.children||[]:children}]:[]});
 }
 function orderTabs(tabs,pinned){const opened=new Set(tabs),pins=[...new Set(pinned)].filter(id=>opened.has(id));return [...pins,...tabs.filter(id=>!pins.includes(id))]}
 function referenceText(path,wiki=false){return wiki?'[[/'+String(path).split('/').map(encodeURIComponent).join('/')+']]':String(path)}
 const api={find,replaceAll,replaceAt,headings,normalizeName,filterTree,orderTabs,referenceText};root.AmagoDocumentNavigation=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
