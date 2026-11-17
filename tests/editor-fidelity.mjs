import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const context=vm.createContext({localStorage:{getItem:()=>null},document:{querySelector:()=>({})},crypto:globalThis.crypto});
vm.runInContext(app.slice(0,app.indexOf("document.addEventListener('click'")),context);
const escape=vm.runInContext('esc',context);
const visual=readFileSync(new URL('../dist/document-tools.js',import.meta.url),'utf8');
vm.runInContext(visual.slice(visual.indexOf('function markdownLiteral'),visual.indexOf('const visualEditors')),context);
vm.runInContext(visual.slice(visual.indexOf('function markdownTableTemplate'),visual.indexOf('function insertMarkdownTable')),context);
const refinement=readFileSync(new URL('../dist/refinement.js',import.meta.url),'utf8');
vm.runInContext(refinement.slice(refinement.indexOf('function taskSourceLines'),refinement.indexOf('function metrics')),context);

for(const value of ['*literal*','_literal_','[texto]','<script>','C:\\notas','a|b','`literal`','![[destino]]']){
 assert.equal(context.inline(context.markdownLiteral(value)),escape(value),'literal text must survive round-trip: '+value);
}
for(const value of ['a ` b','`','``',' código ','   ','C:\\notas','<script>']){
 assert.equal(context.inline(context.markdownCodeSpan(value)),'<code>'+escape(value)+'</code>','inline code must survive: '+value);
}
assert.equal(context.inline('**forte** e *leve*'),' <strong>forte</strong> e <em>leve</em>'.trimStart());
assert.equal(context.inline('**forte e *leve***'),'<strong>forte e <em>leve</em></strong>');
assert.equal(context.inline('a_b_c'),'a_b_c');
assert.equal(context.inline('\\[x](https://example.com)'), '[x](https://example.com)');
assert.equal(context.inline('[x](javascript:alert)'), '[x](javascript:alert)');
assert(!context.inline('[[a" onmouseover="bad|x]]').includes('data-wiki="a"'));
assert.match(context.markdown('###### Seis ###'),/<h6[^>]*>Seis<\/h6>/);
assert.match(context.markdown('```` js\na\n```\nb\n````'),/<pre data-code-fence="````" data-code-info=" js"><code>a\n```\nb<\/code>/);
assert.match(context.markdown('Texto\n***\nDepois'),/<p>Texto<\/p><hr><p>Depois<\/p>/);
assert.match(context.markdown('\uFEFF---\r\ncustom: yes\r\n...\r\n# Visível'),/^<h1/);

const body=' \r\n\r\nPrimeiro  \r\n\r\n \t\r\nSegundo\r\n\r\n';
const parts=context.visualMarkdownSegments(body);
assert.equal(parts.length,2);assert.equal(parts[0].source,'Primeiro  ');assert.equal(parts[1].source,'Segundo');
let rebuilt='',cursor=0;for(const part of parts){rebuilt+=body.slice(cursor,part.start)+part.source;cursor=part.end}rebuilt+=body.slice(cursor);assert.equal(rebuilt,body);
assert.equal(context.visualMarkdownSegments('~~~~\n```\n\n| A |\n| - |\n~~~~').length,1);
for(const [rows,columns] of [[1,1],[2,3],[30,12]]){
 const table=context.markdownTableTemplate(rows,columns);assert.equal(table.split('\n').length,rows+2);assert.match(context.markdown(table),/<table>/);
}
for(const args of [[0,1],[1,0],[31,2],[2,13],[1.5,2],[NaN,2]])assert.throws(()=>context.markdownTableTemplate(...args));

const tasksBody='\uFEFF---\r\ntasks:\r\n- [ ] YAML\r\n---\r\n```md\r\n- [ ] Exemplo\r\n```\r\n<!--\r\n- [ ] HTML\r\n-->\r\n%%\r\n- [x] Obsidian\r\n%%\r\n~~~~\r\n~~~\r\n- [ ] Código\r\n~~~~\r\n- [ ] Real com `<!--`\r\n+ [X] Feita';
context.taskBody=tasksBody;
vm.runInContext('vault.notes=[{id:"task",body:taskBody}]',context);
assert.deepEqual(JSON.parse(JSON.stringify(context.tasks().map(t=>({index:t.index,text:t.text,done:t.done})))),[
 {index:17,text:'Real com `<!--`',done:false},{index:18,text:'Feita',done:true}
]);
console.log('Editor fidelity: literal escapes, code spans/fences, H1–H6, exact block ranges, table limits and task masking passed.');
