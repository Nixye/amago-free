import vm from 'node:vm';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
const missing=()=>new DOMException('Not found','NotFoundError');
class FileHandle{constructor(name,body=''){this.name=name;this.kind='file';this.bytes=new TextEncoder().encode(body)}async getFile(){const bytes=this.bytes.slice();return {size:bytes.length,lastModified:1,arrayBuffer:async()=>bytes.buffer}}async createWritable(){let next;return {write:async value=>{next=typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(value)},close:async()=>{this.bytes=next},abort:async()=>{}}}}
class Directory{constructor(name){this.name=name;this.kind='directory';this.children=new Map()}async *values(){yield* this.children.values()}async getDirectoryHandle(name,{create=false}={}){let d=this.children.get(name);if(!d&&create){d=new Directory(name);this.children.set(name,d)}if(!d)throw missing();if(d.kind!=='directory')throw Error('Not directory');return d}async getFileHandle(name,{create=false}={}){let f=this.children.get(name);if(!f&&create){f=new FileHandle(name);this.children.set(name,f)}if(!f)throw missing();if(f.kind!=='file')throw Error('Not file');return f}async removeEntry(name,{recursive=false}={}){const entry=this.children.get(name);if(!entry)throw missing();if(entry.kind==='directory'&&entry.children.size&&!recursive)throw Error('Not empty');this.children.delete(name)}}
const root=new Directory('Browser project'),folder=await root.getDirectoryHandle('Notas',{create:true});folder.children.set('Destino.md',new FileHandle('Destino.md','# destino'));root.children.set('Leitor.md',new FileHandle('Leitor.md','[[Notas/Destino]]'));folder.children.set('Imagem.png',new FileHandle('Imagem.png','binary bytes'));await folder.getDirectoryHandle('Vazia',{create:true});
const ctx=vm.createContext({TextEncoder,TextDecoder,crypto:webcrypto,DOMException,URL,console,window:{showDirectoryPicker:async()=>root},recentFolders:{remember:async()=>({id:'browser-test'}),list:async()=>({projects:[]})}});
for(const name of ['file-core','link-core','search-core','refactor-core','project-ops-core','project-adapter'])vm.runInContext(readFileSync(new URL('../dist/'+name+'.js',import.meta.url),'utf8'),ctx);
const adapter=ctx.window.projectAdapter;assert.equal((await adapter.open()).name,'Browser project');let p=await adapter.previewOperation({action:'rename',path:'Notas',name:'Pesquisa'});assert.equal(p.referenceCount,1);const result=await adapter.applyOperation(p.id);assert(result.done,JSON.stringify(result));assert(!root.children.has('Notas'));assert(root.children.has('Pesquisa'));assert.equal((await adapter.read('Leitor.md')).body,'[[/Pesquisa/Destino.md]]');const changed=await root.getDirectoryHandle('Pesquisa');assert(changed.children.has('Vazia'));assert.equal(new TextDecoder().decode((await changed.getFileHandle('Imagem.png')).bytes),'binary bytes');
p=await adapter.previewOperation({action:'remove',path:'Pesquisa'});assert.equal(p.files.length,2);assert.equal(p.references.length,1);assert((await adapter.applyOperation(p.id)).done);assert(!root.children.has('Pesquisa'));const backup=await (await root.getDirectoryHandle('.amago')).getDirectoryHandle('operations');assert.equal(backup.children.size,2);
console.log('Browser operations: directory handles, folder rename, link repair, empty folders, binary preservation and recoverable removal passed.');

const discard=await root.getDirectoryHandle('Descartar',{create:true});
discard.children.set('Rascunho.md',new FileHandle('Rascunho.md','# teste'));
const preview=await adapter.previewOperation({action:'purge',path:'Descartar'});
assert(!preview.error,preview.error);const purged=await adapter.applyOperation(preview.id);
assert(purged.done);assert(!root.children.has('Descartar'));
assert(!(await (await root.getDirectoryHandle('.amago')).getDirectoryHandle('operations')).children.has(preview.id));

const rows=await adapter.listTrash();assert.equal(rows.length,1);assert.equal(rows[0].path,'Pesquisa');
const collision=await root.getDirectoryHandle('Pesquisa',{create:true});
assert.match((await adapter.trashAction(rows[0].id,'restore')).error,/Já existe/);
root.children.delete(collision.name);
assert((await adapter.trashAction(rows[0].id,'restore')).done);
assert.equal((await adapter.listTrash()).length,0);
const restoredFolder=await root.getDirectoryHandle('Pesquisa');
assert(restoredFolder.children.has('Vazia'));
assert.equal(new TextDecoder().decode((await restoredFolder.getFileHandle('Imagem.png')).bytes),'binary bytes');
const trashAgain=await adapter.previewOperation({action:'remove',path:'Pesquisa'});
assert((await adapter.applyOperation(trashAgain.id)).done);
assert((await adapter.trashAction(trashAgain.id,'purge')).done);
assert.equal((await adapter.listTrash()).length,0);assert(!backup.children.has(trashAgain.id));
console.log('Project trash: browser restore, path conflict, binary/empty subfolder recovery and purge passed.');
