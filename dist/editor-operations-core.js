(function(root){
 'use strict';
 const sourceName=name=>String(name||'documento').split(/[\\/]/).at(-1).replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-')||'documento';
 function exportDocument(doc,{project=false,draft=false}={}){
  let name=project?sourceName(doc.name||doc.path):sourceName(doc.title)+'.md';
  if(draft){const dot=name.lastIndexOf('.');name=dot>0?name.slice(0,dot)+'-rascunho'+name.slice(dot):name+'-rascunho'}
  const type=/\.(md|markdown)$/i.test(name)?'text/markdown;charset=utf-8':/\.json$/i.test(name)?'application/json;charset=utf-8':'text/plain;charset=utf-8';
  return {name,body:String(doc.body??''),type};
 }
 function prepareImport(name,raw,titles=[]){
  if(new TextEncoder().encode(raw).length>20*1024*1024)throw Error('O arquivo excede 20 MiB.');
  let notes;
  if(/\.json$/i.test(name)){
   let data;try{data=JSON.parse(raw.replace(/^\uFEFF/,''))}catch{throw Error('JSON inválido.')}
   if(data?.format!=='amago-v1'||!Array.isArray(data.notes))throw Error('Use um backup Âmago com format amago-v1 e uma lista de notas.');
   if(data.notes.length>5000)throw Error('Importe até 5.000 notas por arquivo.');
   for(const [index,note] of data.notes.entries())if(!note||typeof note.title!=='string'||typeof note.body!=='string')throw Error('Nota '+(index+1)+' inválida: título e conteúdo devem ser textos.');
   notes=data.notes;
  }else if(/\.(md|markdown|txt)$/i.test(name)){
   const content=raw.replace(/^\uFEFF/,'').replace(/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/,''),heading=content.match(/^\s*#\s+([^\r\n]+)/);
   notes=[{title:heading?heading[1].replace(/\s+#+\s*$/,''):sourceName(name).replace(/\.(md|markdown|txt)$/i,''),body:raw,folder:'Importadas'}];
  }else throw Error('Formato não suportado. Use Markdown, TXT ou backup JSON do Âmago.');
  // Validate the entire file before creating a plan or touching the live vault.
  for(const [index,note] of notes.entries())if(new TextEncoder().encode(note.body).length>5*1024*1024)throw Error('A nota '+(index+1)+' excede 5 MiB.');
  const key=value=>value.normalize('NFC').toLocaleLowerCase(),used=new Set(titles.map(key));
  return notes.map(note=>{
   const base=note.title.trim()||'Nota importada';let title=base,n=1;while(used.has(key(title))){title=base+' (importada'+(n>1?' '+n:'')+')';n++}used.add(key(title));
   return {title,body:note.body,folder:typeof note.folder==='string'&&note.folder.trim()?note.folder:'Importadas',tags:Array.isArray(note.tags)?[...new Set(note.tags.filter(tag=>typeof tag==='string'))]:[],favorite:!!note.favorite};
  });
 }
 function replace(body,start,end,text,selection){return {body:body.slice(0,start)+text+body.slice(end),start:selection?.[0]??start+text.length,end:selection?.[1]??start+text.length}}
 function indent(body,start,end,outdent=false,size=2){
  const spaces=' '.repeat(Math.max(1,Math.min(8,size)));
  if(start===end&&!outdent)return replace(body,start,end,spaces);
  const first=start?body.lastIndexOf('\n',start-1)+1:0,last=end>start&&body[end-1]==='\n'?end-1:end;
  const edits=[];for(let offset=first;offset<=last;){
   const next=body.indexOf('\n',offset),line=body.slice(offset,next<0?undefined:next),remove=outdent?(line[0]==='\t'?1:Math.min(spaces.length,line.match(/^ */)[0].length)):0;
   if(!outdent||remove)edits.push({offset,remove,text:outdent?'':spaces});
   if(next<0||next>=last)break;offset=next+1;
  }
  let value=body;for(const edit of [...edits].reverse())value=value.slice(0,edit.offset)+edit.text+value.slice(edit.offset+edit.remove);
  const map=(position,bias)=>{let delta=0;for(const edit of edits){if(position<edit.offset||(position===edit.offset&&!bias))break;if(position<=edit.offset+edit.remove)return edit.offset+delta+(bias?edit.text.length:0);delta+=edit.text.length-edit.remove}return position+delta};
  return {body:value,start:map(start,false),end:map(end,true)};
 }
 function insideFence(body,position){
  let fence=null;for(const line of body.slice(0,position).split(/\r?\n/).slice(0,-1)){const match=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);if(!match)continue;if(!fence)fence=match[1];else if(match[1][0]===fence[0]&&match[1].length>=fence.length&&!match[2].trim())fence=null}return !!fence;
 }
 function continueList(body,start,end){
  if(start!==end||insideFence(body,start))return null;
  const front=body.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/)?.[0];if(front&&start<front.length)return null;
  const lineStart=start?body.lastIndexOf('\n',start-1)+1:0,next=body.indexOf('\n',start),before=body.slice(lineStart,start),tail=body.slice(start,next<0?undefined:next),match=before.match(/^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)(?:\[([ xX])\]([ \t]+))?(.*)$/);
  if(!match)return null;
  if(!match[6].trim()&&!tail.trim())return replace(body,lineStart,start,'');
  const marker=/^\d/.test(match[2])?String(Number(match[2].slice(0,-1))+1)+match[2].at(-1):match[2],newline=body.includes('\r\n')?'\r\n':'\n';
  return replace(body,start,end,newline+match[1]+marker+match[3]+(match[4]!==undefined?'[ ]'+match[5]:''));
 }
 function toggleFormat(body,start,end,kind){
  const marker={bold:'**',italic:'*',strike:'~~'}[kind];if(!marker)return null;
  const selected=body.slice(start,end),width=marker.length;
  if(selected.length>=width*2&&selected.startsWith(marker)&&selected.endsWith(marker))return replace(body,start,end,selected.slice(width,-width),[start,end-width*2]);
  if(body.slice(start-width,start)===marker&&body.slice(end,end+width)===marker)return replace(body,start-width,end+width,selected,[start-width,end-width]);
  const text=selected||'texto';return replace(body,start,end,marker+text+marker,[start+width,start+width+text.length]);
 }
 function toggleTask(body,line,checked){
  const lines=body.split('\n'),text=lines[line];if(text===undefined)return null;
  const match=text.match(/^(\s*(?:[-*+]|\d+\.)\s+\[)([ xX])(\])/);if(!match)return null;
  lines[line]=text.slice(0,match[1].length)+(checked?'x':' ')+text.slice(match[1].length+1);return lines.join('\n');
 }
 const api={exportDocument,prepareImport,indent,continueList,toggleFormat,toggleTask};root.AmagoEditorOperations=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
