'use strict';
function splitEligible(item){return item&&!item.folder&&(item.project?AmagoFiles.editable(projectFiles().find(f=>f.path===item.path)):vault.notes.some(n=>n.id===item.id))}
function splitDocumentOpen(){return !!currentPane()&&((state.view==='notes'&&!state.tag)||state.view==='project')}
let splitOpening=false;
async function openDocumentBeside(item,position){
 if(splitOpening||!splitDocumentOpen()||!splitEligible(item)||item.project!==(workbench.source==='project'))return;
 if(!multiActive()){studio.panes=[currentPane()];studio.active=0}
 const id=item.project?item.path:item.id,existing=studio.panes.findIndex(p=>p.id===id);
 if(existing<0&&studio.panes.length>=4){toast('Até quatro documentos lado a lado. Feche uma coluna para continuar.');return}
 if(!multiActive()&&currentPane().id===id){toast('Este documento já está aberto. Escolha outro para dividir.');return}
 splitOpening=true;
 try{
  const source=workbench.source,project=workbench.project;
  await putPane(id,'add');
  if(workbench.source!==source||workbench.project!==project)return;
  const at=studio.panes.findIndex(p=>p.id===id);if(at<0)return;
  if(Number.isInteger(position)){const pane=studio.panes.splice(at,1)[0];const target=Math.max(0,Math.min(studio.panes.length,position-(at<position?1:0)));studio.panes.splice(target,0,pane);studio.active=target;renderMain();activatePane(target)}
 }finally{splitOpening=false}
}
const splitFileMenu=showFileMenu;
showFileMenu=function(row,x,y){splitFileMenu(row,x,y);const item=fileMenuItem(row),menu=$('#file-context-menu');if(!menu||!splitDocumentOpen()||!splitEligible(item))return;const button=document.createElement('button');button.setAttribute('role','menuitem');button.innerHTML=icon('panel')+'Abrir ao lado';menu.querySelector('strong').after(button);button.onclick=event=>{event.stopPropagation();removeFileMenu();openDocumentBeside(item,multiActive()?studio.active+1:1).catch(error=>toast(error.message))};menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px'};
let draggedDocument=null,splitDropTarget=null;
function clearSplitDrop(){splitDropTarget=null;$('#document-drop-preview')?.remove()}
function markSplitDraggables(){document.querySelectorAll('#sidebar [data-note],#sidebar [data-project-file],.tab[data-note],.tab [data-note],.tab [data-project-file]').forEach(row=>{row.draggable=true})}
const splitTree=renderTree;renderTree=function(){splitTree();markSplitDraggables()};
const splitTabs=renderTabs;renderTabs=function(){splitTabs();markSplitDraggables()};
document.addEventListener('dragstart',event=>{
 const row=event.target.closest('#sidebar [data-note],#sidebar [data-project-file],.tab[data-note],.tab [data-note],.tab [data-project-file]');if(!row||!splitDocumentOpen())return;
 const item=fileMenuItem(row);
 if(!splitEligible(item))return;draggedDocument=item;event.dataTransfer.effectAllowed='copyMove';event.dataTransfer.setData('application/x-amago-document',JSON.stringify(item));
});
document.addEventListener('dragover',event=>{
 if(!draggedDocument||!splitDocumentOpen())return;
 const target=event.target.closest('.editing-pane,.note-main,.project-document,.project-editor-grid,.document');if(!target||!$('#main').contains(target)){clearSplitDrop();return}
 event.preventDefault();event.dataTransfer.dropEffect='copy';const pane=target.closest('.editing-pane'),surface=pane||target,rect=surface.getBoundingClientRect(),left=event.clientX<rect.left+rect.width/2;
 splitDropTarget=(pane?Number(pane.dataset.pane):0)+(left?0:1);
 let preview=$('#document-drop-preview');if(!preview){preview=document.createElement('div');preview.id='document-drop-preview';preview.setAttribute('role','status');document.body.append(preview)}
 Object.assign(preview.style,{left:(rect.left+(left?0:rect.width/2))+'px',top:rect.top+'px',width:rect.width/2+'px',height:rect.height+'px'});preview.textContent=left?'Abrir à esquerda':'Abrir à direita';
});
document.addEventListener('drop',event=>{if(draggedDocument&&splitDropTarget!==null){event.preventDefault();event.stopPropagation();const item=draggedDocument,position=splitDropTarget;clearSplitDrop();draggedDocument=null;openDocumentBeside(item,position).catch(error=>toast(error.message))}else{draggedDocument=null;clearSplitDrop()}},true);
document.addEventListener('dragend',()=>{draggedDocument=null;clearSplitDrop()});
document.addEventListener('dragleave',event=>{if(!event.relatedTarget)clearSplitDrop()});
markSplitDraggables();
