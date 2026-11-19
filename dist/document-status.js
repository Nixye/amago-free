'use strict';

// The vault is written as one snapshot. A later edit must outlive an earlier write.
const personalSaveStates=new Map();
const documentSaveLabels={saved:'Alterações salvas',dirty:'Alterações pendentes',saving:'Salvando alterações',error:'Falha ao salvar',conflict:'Conflito ao salvar'};
function noteChanged(id){
 personalSaveStates.set(id,{state:'dirty'});
 updateDocumentDots();
}
function beginVaultSave(){
 const batch=new Map();
 for(const id of personalSaveStates.keys()){
  const entry={state:'saving'};
  personalSaveStates.set(id,entry);batch.set(id,entry);
 }
 if(batch.size)updateDocumentDots();
 return batch;
}
function finishVaultSave(batch,success){
 for(const [id,entry] of batch){
  if(personalSaveStates.get(id)!==entry)continue;
  if(success)personalSaveStates.delete(id);
  else entry.state='error';
 }
 if(batch.size)updateDocumentDots();
}
function documentSaveState(doc,project){
 if(!project)return personalSaveStates.get(doc.id)?.state||'saved';
 if(doc.conflict)return 'conflict';
 if(doc.error)return 'error';
 if(doc.saving)return 'saving';
 return doc.dirty?'dirty':'saved';
}
function documentStatusDot(doc,project){
 if(!doc||doc.kind==='image')return '';
 const state=documentSaveState(doc,project),label=documentSaveLabels[state];
 return '<span class="document-save-dot" role="img" data-save-source="'+(project?'project':'vault')+'" data-save-id="'+esc(project?doc.path:doc.id)+'" data-save-state="'+state+'" title="'+label+'" aria-label="'+label+'"></span>';
}
function updateDocumentDots(){
 for(const dot of document.querySelectorAll('.document-save-dot')){
  const id=dot.dataset.saveId,project=dot.dataset.saveSource==='project';
  const doc=project?(workbench.file?.path===id?workbench.file:studio.files.get(id)):{id};
  if(!doc)continue;
  const state=documentSaveState(doc,project);
  if(dot.dataset.saveState===state)continue;
  dot.dataset.saveState=state;dot.title=documentSaveLabels[state];dot.setAttribute('aria-label',dot.title);
 }
}
