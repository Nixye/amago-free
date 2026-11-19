(function(root){
 'use strict';
 function preferences(value={}){return {fontSize:Math.max(10,Math.min(48,Number(value?.fontSize)||16)),lineHeight:Math.max(1.3,Math.min(2.2,Number(value?.lineHeight)||1.7)),wrap:value?.wrap!==false,spellcheck:value?.spellcheck===true}}
 function statistics(value=''){
  const text=String(value);
  return {words:(text.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)||[]).length,characters:Array.from(text).length,lines:text?text.split(/\r\n|\r|\n/).length:0,bytes:new TextEncoder().encode(text).length};
 }
 const api={preferences,statistics};root.AmagoWriting=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
