'use strict';
// Registered before the editor handlers so a remapped key cannot run twice.
const configurableShortcuts=[
 ['new','Nova nota','Ctrl+N'],['save','Salvar documentos','Ctrl+S'],['edit','Alternar edição e leitura','Ctrl+E'],
 ['bold','Negrito','Ctrl+B'],['italic','Itálico','Ctrl+I'],['complete','Sugestões ao escrever','Ctrl+Space'],
 ['split','Abrir ao lado','Ctrl+Shift+D'],['quick','Abrir arquivo','Ctrl+P'],['close','Fechar aba','Ctrl+W'],
 ['reopen','Reabrir aba','Ctrl+Shift+T'],['commands','Paleta de comandos','Ctrl+Shift+P'],
 ['search','Buscar no espaço','Ctrl+K'],['find','Buscar no documento','Ctrl+F'],['replace','Substituir no documento','Ctrl+H'],
 ['focus','Modo foco','Ctrl+Shift+F'],['next','Próxima aba','Ctrl+PageDown'],['previous','Aba anterior','Ctrl+PageUp']
];
const translatedShortcuts=new WeakSet();
function shortcutChord(event){
 const key=event.key===' '?'Space':event.key.length===1?event.key.toUpperCase():event.key;
 return [event.ctrlKey||event.metaKey?'Ctrl':'',event.altKey?'Alt':'',event.shiftKey?'Shift':'',key].filter(Boolean).join('+');
}
function shortcutValue(id,fallback){return vault.interface?.keybindings?.[id]||fallback}
window.addEventListener('keydown',event=>{
 if(translatedShortcuts.has(event)||event.isComposing)return;
 if(event.target.closest?.('[data-keybinding]')&&event.key!=='Tab'){document.querySelector('#keybinding-list')?.onkeydown?.(event);event.stopImmediatePropagation();return}
 if(typeof vault==='undefined')return;
 const chord=shortcutChord(event),match=configurableShortcuts.find(([id,,fallback])=>shortcutValue(id,fallback)===chord);
 if(match&&match[2]!==chord){
  event.preventDefault();event.stopImmediatePropagation();const parts=match[2].split('+'),key=parts.pop();
  const translated=new KeyboardEvent('keydown',{key:key==='Space'?' ':key.length===1?key.toLowerCase():key,ctrlKey:parts.includes('Ctrl')&&!event.metaKey,metaKey:parts.includes('Ctrl')&&event.metaKey,shiftKey:parts.includes('Shift'),altKey:parts.includes('Alt'),bubbles:true,cancelable:true});
  translatedShortcuts.add(translated);event.target.dispatchEvent(translated);
 }else if(!match&&configurableShortcuts.some(([id,,fallback])=>fallback===chord&&shortcutValue(id,fallback)!==fallback)){
  event.preventDefault();event.stopImmediatePropagation();
 }
},true);
