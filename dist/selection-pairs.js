'use strict';
(function(){
 const pairs=new Map();
 for(const pair of ['""',"''",'()','[]','{}','<>','“”','‘’','«»','「」','『』','【】','（）','［］','｛｝','\x60\x60']){pairs.set(pair[0],pair);pairs.set(pair[1],pair)}
 function wrap(event,symbol){
  const editor=event.target,pair=pairs.get(symbol);
  if(!pair||event.defaultPrevented||event.isComposing)return;
  const [key,close]=pair;
  if(editor.matches?.('#editor,#project-editor,[data-pane-editor]')&&!editor.disabled&&!editor.readOnly){
   const start=editor.selectionStart,end=editor.selectionEnd,direction=editor.selectionDirection;
   if(start===end)return;
   event.preventDefault();event.stopImmediatePropagation();
   const replacement=key+editor.value.slice(start,end)+close;
   if(!document.execCommand('insertText',false,replacement))sourceInsertion(editor,replacement,start,end);
   editor.setSelectionRange(start+key.length,end+key.length,direction);return;
  }
  const block=editor.closest?.('.visual-block[contenteditable="true"]'),selection=getSelection();
  if(!block||!selection?.rangeCount||selection.isCollapsed)return;
  const range=selection.getRangeAt(0);
  if(!block.contains(range.startContainer)||!block.parentElement.contains(range.endContainer))return;
  event.preventDefault();event.stopImmediatePropagation();
  const open=document.createTextNode(key),tail=document.createTextNode(close);
  const last=range.cloneRange();last.collapse(false);last.insertNode(tail);
  const first=range.cloneRange();first.collapse(true);first.insertNode(open);
  range.setStartAfter(open);range.setEndBefore(tail);selection.removeAllRanges();selection.addRange(range);
  block.parentElement.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:key}));
 }
 window.addEventListener('keydown',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.altKey)wrap(e,e.key)},true);
 window.addEventListener('beforeinput',e=>{if(e.inputType==='insertText')wrap(e,e.data)},true);
})();
