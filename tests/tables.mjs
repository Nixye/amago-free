import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const context=vm.createContext({localStorage:{getItem:()=>null},document:{querySelector:()=>({})},crypto:globalThis.crypto});
vm.runInContext(source.slice(0,source.indexOf("document.addEventListener('click'")),context);
const render=body=>context.markdown(body);
const sample='| Item | Estado | Valor |\n| :--- | :---: | ---: |\n| **Atlas** | *Pronto* | `42` |';
let html=render(sample);
assert.match(html,/<table><thead><tr><th scope="col" style="text-align:left">Item/);
assert.match(html,/<td style="text-align:center"><em>Pronto<\/em>/);
assert.match(html,/<td style="text-align:right"><code>42<\/code>/);
assert.match(html,/<strong>Atlas<\/strong>/);
assert.match(html,/tabindex="0" role="region" aria-label="Tabela Markdown"/);
assert.equal((html.match(/<th /g)||[]).length,3);
assert.equal((html.match(/<td /g)||[]).length,3);
assert.match(render('A | B\n--- | ---\nx | y'),/<td>x<\/td><td>y<\/td>/);
assert.match(render('| A | B |\n| --- | --- |\n| x |'),/<td>x<\/td><td><\/td>/);
assert.match(render('| A |\n| --- |\n| x | y |'),/<td>x<\/td><\/tr>/);
assert.match(render('| A |\n| --- |'),/<thead>.*<\/thead><\/table>/);
assert.match(render('| A | B |\n| --- | --- |\nx'),/<td>x<\/td><td><\/td>/);
for(const body of ['A | B\n--- | nope','A | B\n---','plain | text','| A |\n\n| --- |'])assert(!render(body).includes('<table>'));
for(const fence of ['```','~~~','````']){
 assert(!render(fence+'md\n'+sample+'\n'+fence).includes('<table>'));
 assert.match(render(fence+'md\n'+sample+'\n'+fence+'\n\n'+sample),/<\/pre>.*<table>/s);
}
assert(!render('````\n```\n'+sample+'\n````').includes('<table>'));
html=render('---\r\ntitle: Table\r\n---\r\n'+sample.replaceAll('\n','\r\n')+'\r\n\r\n- [ ] Depois');
assert.match(html,/<table>/);assert.match(html,/data-task="7"/);
for(const next of ['# Depois','> Citação','- Item','1. Item','---'])assert.match(render(sample+'\n'+next),/<\/table><\/div><(?:h1|blockquote|ul|ol|hr)/);
html=render('| A | B |\n| --- | --- |\n| a\\|b | `c\\|d` |');
assert.match(html,/<td>a\|b<\/td><td><code>c\|d<\/code><\/td>/);
html=render('| A | B |\n| --- | --- |\n| \\*literal\\* | <img src=x onerror=alert(1)> |');
assert.match(html,/<td>\*literal\*<\/td>/);assert(!html.includes('<img'));
assert.match(html,/&lt;img/);
assert(!render('| A |\n| --- |\n| [x](javascript:alert) |').includes('<a '));
assert.match(render('| A | B |\n| --- | --- |\n| [[Nota|Rótulo]] | x |'),/data-wiki="Nota">Rótulo<\/button><\/td><td>x/);

// Exercise the actual reference wrapper used by both workspaces.
for(const file of ['link-core','search-core'])vm.runInContext(readFileSync(new URL('../dist/'+file+'.js',import.meta.url),'utf8'),context);
context.discoveryDocs=()=>[{path:'Nota.md',title:'Nota',body:''}];
context.workbench={project:{root:'test'},file:{path:'Origem.md'}};
const interaction=readFileSync(new URL('../dist/interaction.js',import.meta.url),'utf8');
vm.runInContext(interaction.slice(interaction.indexOf('const plainMarkdown='),interaction.indexOf("window.addEventListener('click'")),context);
html=context.fileMarkdown('| Link | Valor |\n| --- | --- |\n| [[Nota|Rótulo]] | 1 |');
assert.match(html,/data-follow-reference="Nota"/);assert.match(html,/>Rótulo<\/button><\/td><td>1/);
console.log('Tables: alignment, escaped pipes, code, links, safe HTML, malformed rows, fences and task offsets passed.');
