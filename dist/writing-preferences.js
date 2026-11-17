'use strict';

function writingPreferences(){return AmagoWriting.preferences(vault.writing)}
function applyWritingPreferences(){
 const prefs=writingPreferences();
 for(const editor of document.querySelectorAll('#editor,#project-editor,[data-pane-editor]')){
  editor.style.fontSize=prefs.fontSize+'px';editor.style.lineHeight=String(prefs.lineHeight);editor.style.whiteSpace=prefs.wrap?'pre-wrap':'pre';editor.style.overflowWrap=prefs.wrap?'break-word':'normal';editor.wrap=prefs.wrap?'soft':'off';editor.spellcheck=prefs.spellcheck;
 }
 for(const block of document.querySelectorAll('.visual-block'))block.spellcheck=prefs.spellcheck;
}
function writingPreferencesFields(){const prefs=writingPreferences();return `<fieldset class="writing-preferences"><legend>Markdown e texto</legend><p>Estas preferências mudam apenas a apresentação do Markdown e texto, inclusive nas colunas e no foco.</p><label>Fonte do editor <output data-writing-font-value>${prefs.fontSize} px</output><input data-writing-preference="fontSize" class="field" type="number" min="14" max="24" step="1" value="${prefs.fontSize}" aria-label="Fonte do editor"></label><label>Espaçamento entre linhas <output data-writing-line-value>${prefs.lineHeight.toFixed(1)}</output><input data-writing-preference="lineHeight" class="field" type="number" min="1.3" max="2.2" step="0.1" value="${prefs.lineHeight}" aria-label="Espaçamento entre linhas do editor"></label><label class="writing-check"><input data-writing-preference="wrap" type="checkbox" ${prefs.wrap?'checked':''}>Quebrar linhas longas na tela</label><label class="writing-check"><input data-writing-preference="spellcheck" type="checkbox" ${prefs.spellcheck?'checked':''}>Verificar ortografia</label><small>A ortografia usa os idiomas disponíveis no navegador ou Windows. O arquivo mantém seus caracteres e quebras de linha.</small></fieldset>`}
function showWritingPreferences(){modal('Preferências do editor',writingPreferencesFields())}
actions['writing-preferences']=showWritingPreferences;commandList.push(['Preferências do editor','writing-preferences','']);
document.addEventListener('input',e=>{
 const field=e.target.closest('[data-writing-preference]');if(!field||!field.checkValidity())return;
 const key=field.dataset.writingPreference;vault.writing=AmagoWriting.preferences({...writingPreferences(),[key]:field.type==='checkbox'?field.checked:Number(field.value)});
 document.querySelectorAll('[data-writing-font-value]').forEach(el=>el.textContent=vault.writing.fontSize+' px');document.querySelectorAll('[data-writing-line-value]').forEach(el=>el.textContent=vault.writing.lineHeight.toFixed(1));applyWritingPreferences();
});
document.addEventListener('change',e=>{if(e.target.matches('[data-writing-preference]'))persist()});

const writingSystemMedia=matchMedia('(prefers-color-scheme: dark)');let writingNativeAppearance='';
function systemThemePreferences(){const value=vault.themePreference||{};return {mode:value.mode==='system'?'system':'manual',light:themeCatalog().some(t=>t.id===value.light&&t.mode==='light')?value.light:'daylight',dark:themeCatalog().some(t=>t.id===value.dark&&t.mode==='dark')?value.dark:'orbital'}}
function applyNativeWritingTheme(){
 if(!window.amagoDesktop?.appearance)return;
 const value={enabled:vault.appearance?.acrylic!==false,theme:vault.theme,followSystem:systemThemePreferences().mode==='system'},key=JSON.stringify(value);if(key===writingNativeAppearance)return;
 writingNativeAppearance=key;Promise.resolve(window.amagoDesktop.appearance(value)).catch(()=>{writingNativeAppearance=''});
}
const writingApplyTheme=applyTheme;
applyTheme=function(){const prefs=systemThemePreferences();if(prefs.mode==='system')vault.skin=writingSystemMedia.matches?prefs.dark:prefs.light;writingApplyTheme();applyNativeWritingTheme()};
function themePreferenceFields(){
 const prefs=systemThemePreferences(),options=mode=>themeCatalog().filter(t=>t.mode===mode).map(t=>`<option value="${esc(t.id)}" ${prefs[mode]===t.id?'selected':''}>${esc(t.name)}</option>`).join('');
 return `<fieldset class="system-theme-preferences"><div class="system-theme-heading"><div><strong>Acompanhar o sistema</strong><p>Alterne entre temas claros e escuros conforme a aparência do dispositivo.</p></div><label>Modo de aparência<select class="field" id="theme-preference-mode"><option value="manual" ${prefs.mode==='manual'?'selected':''}>Manual</option><option value="system" ${prefs.mode==='system'?'selected':''}>Acompanhar sistema</option></select></label></div><div class="system-theme-pair" ${prefs.mode!=='system'?'hidden':''}><label>Tema claro<select class="field" data-system-theme="light">${options('light')}</select></label><label>Tema escuro<select class="field" data-system-theme="dark">${options('dark')}</select></label></div><small>Selecionar uma paleta abaixo volta ao modo manual.</small></fieldset>`;
}
function mountWritingSettings(){

 const grid=$('.theme-grid');if(grid&&!$('.system-theme-preferences'))grid.insertAdjacentHTML('beforebegin',themePreferenceFields());
}
new MutationObserver(mountWritingSettings).observe($('#modal-root'),{childList:true,subtree:true});
document.addEventListener('change',e=>{
 if(e.target.id==='theme-preference-mode'||e.target.matches('[data-system-theme]')){
  const prefs=systemThemePreferences();if(e.target.id==='theme-preference-mode')prefs.mode=e.target.value;else prefs[e.target.dataset.systemTheme]=e.target.value;
  vault.themePreference=prefs;applyTheme();persist();$('.system-theme-pair')?.toggleAttribute('hidden',prefs.mode!=='system');document.querySelectorAll('[data-theme-id]').forEach(button=>{const active=button.dataset.themeId===vault.skin;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.querySelector('.theme-selected')?.remove();if(active)button.insertAdjacentHTML('beforeend','<span class="theme-selected">✓ Em uso</span>')});
 }
});
function disableAutomaticTheme(){if(systemThemePreferences().mode==='system')vault.themePreference={...systemThemePreferences(),mode:'manual'}}
window.addEventListener('click',e=>{if(e.target.closest('[data-theme-id]'))disableAutomaticTheme()},true);
window.addEventListener('change',e=>{if(e.target.id==='theme')disableAutomaticTheme()},true);
function onWritingSystemThemeChange(){if(systemThemePreferences().mode!=='system')return;applyTheme();persist();document.querySelectorAll('[data-theme-id]').forEach(button=>{const active=button.dataset.themeId===vault.skin;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.querySelector('.theme-selected')?.remove();if(active)button.insertAdjacentHTML('beforeend','<span class="theme-selected">✓ Em uso</span>')})}
writingSystemMedia.addEventListener('change',onWritingSystemThemeChange);

const writingShortcutGroups=[
 ['Edição',[['Ctrl N','Nova nota ou Markdown no projeto'],['Ctrl S','Salvar arquivos abertos'],['Ctrl E','Alternar edição e leitura'],['Ctrl B','Negrito na seleção'],['Ctrl I','Itálico na seleção'],['Tab / Shift Tab','Indentar / desindentar a seleção no editor de origem'],['Ctrl Espaço','Sugestões de notas, tags e menções'],['Ctrl Shift D','Abrir nota lado a lado']]],
 ['Navegação',[['Ctrl P','Abrir rapidamente um arquivo'],['Ctrl W','Fechar aba atual'],['Ctrl Shift T','Reabrir aba fechada'],['Ctrl Tab / Ctrl Shift Tab','Próxima aba / aba anterior'],['Ctrl PageDown / Ctrl PageUp','Próxima aba / aba anterior'],['Alt → / Alt ←','Avançar / voltar no histórico'],['Ctrl Shift P','Paleta de comandos']]],
 ['Busca',[['Ctrl K','Busca híbrida no workspace'],['Ctrl F','Buscar no documento'],['Ctrl H','Substituir no documento'],['Enter / Shift Enter','Próxima / anterior na busca do documento'],['↑ / ↓','Navegar resultados e comandos'],['Home / End','Primeiro / último resultado na paleta']]],
 ['Foco',[['Ctrl Shift F','Entrar ou sair do modo foco em tela cheia'],['Esc','Fechar diálogo ou busca; depois sair do foco'],['Tab / Shift Tab','Navegar controles; diálogos mantêm o foco no seu conteúdo']]]
];
function showShortcutHelp(){
 modal('Atalhos do Âmago','<label for="shortcut-help-query">Encontrar atalho ou ação</label><input class="field" id="shortcut-help-query" type="search" placeholder="Ex.: foco, negrito, Ctrl P"><p class="shortcut-platform-note">No macOS, os atalhos com Ctrl também aceitam ⌘. Os atalhos de edição atuam no editor ativo.</p><div id="shortcut-help-results"></div>');
 const refresh=()=>{const query=AmagoSearch.normalize($('#shortcut-help-query').value);$('#shortcut-help-results').innerHTML=writingShortcutGroups.map(([group,items])=>{const found=items.filter(([keys,label])=>AmagoSearch.normalize(group+' '+keys+' '+label).includes(query));return found.length?`<section class="shortcut-help-group"><h3>${esc(group)}</h3>${found.map(([keys,label])=>`<div><kbd>${esc(keys)}</kbd><span>${esc(label)}</span></div>`).join('')}</section>`:''}).join('')||'<p role="status" class="empty-small">Nenhum atalho encontrado.</p>'};$('#shortcut-help-query').oninput=refresh;refresh();$('#shortcut-help-query').focus();
}
actions['shortcut-help']=showShortcutHelp;commandList.push(['Ajuda de atalhos','shortcut-help','']);

let writingSelection={key:null,text:''},writingStatsFrame=0;
function captureWritingSelection(){
 const target=navigationDocument();if(!target){writingSelection={key:null,text:''};return}
 const editor=navigationEditor(target),active=document.activeElement;
 if(editor&&(active===editor||(!active?.closest('.visual-block')&&editor.selectionStart!==editor.selectionEnd))){writingSelection={key:target.key,text:editor.value.slice(editor.selectionStart,editor.selectionEnd)};return}
 const preview=navigationPreview(target),selection=getSelection();
 if(preview&&selection?.rangeCount&&preview.contains(selection.anchorNode)&&preview.contains(selection.focusNode)){writingSelection={key:target.key,text:selection.toString()};return}
 if(!active?.closest('.modal,#document-find-panel'))writingSelection={key:target.key,text:''};
}
function statisticsMarkup(stats){return `<dl class="document-statistics-grid"><div><dt>Palavras</dt><dd>${stats.words.toLocaleString('pt-BR')}</dd></div><div><dt>Caracteres</dt><dd>${stats.characters.toLocaleString('pt-BR')}</dd></div><div><dt>Linhas</dt><dd>${stats.lines.toLocaleString('pt-BR')}</dd></div><div><dt>Bytes UTF-8</dt><dd>${stats.bytes.toLocaleString('pt-BR')}</dd></div></dl>`}
function updateWritingStatistics(){
 const target=navigationDocument(),button=$('#document-stats-button');if(button){button.hidden=!target;if(target)button.textContent=writingSelection.key===target.key&&writingSelection.text?AmagoWriting.statistics(writingSelection.text).characters+' selecionados':'Estatísticas'}
 const panel=$('#document-statistics-content');if(!panel)return;
 if(!target){panel.innerHTML='<p>Nenhum documento de texto ativo.</p>';return}
 const selected=writingSelection.key===target.key?writingSelection.text:'';panel.innerHTML=`<h3>${esc(target.doc.title||target.doc.name)}</h3><h4>Documento</h4>${statisticsMarkup(AmagoWriting.statistics(target.doc.body))}${selected?`<h4>Seleção</h4>${statisticsMarkup(AmagoWriting.statistics(selected))}`:'<p>Nenhum texto selecionado no editor ativo.</p>'}<small>Caracteres contam pontos Unicode; quebras CRLF contam dois caracteres e uma quebra de linha. O documento vazio tem zero linhas. A contagem usa o texto de origem.</small>`;
}
function queueWritingStatistics(){cancelAnimationFrame(writingStatsFrame);writingStatsFrame=requestAnimationFrame(()=>{captureWritingSelection();updateWritingStatistics()})}
function showWritingStatistics(){captureWritingSelection();modal('Estatísticas do documento','<div id="document-statistics-content"></div>');updateWritingStatistics()}
actions['document-statistics']=showWritingStatistics;commandList.push(['Estatísticas do documento e seleção','document-statistics','']);
function mountWritingTools(){
 applyWritingPreferences();const host=$('.document-navigation-tools');if(host&&!host.querySelector('[data-action="document-statistics"]'))host.insertAdjacentHTML('beforeend','<button type="button" class="plain-button" data-action="document-statistics">Estatísticas</button><button type="button" class="icon-button" data-action="writing-preferences" title="Preferências do editor" aria-label="Preferências do editor">Aa</button>');
 const footer=$('.statusbar>span:last-child');if(footer&&!$('#document-stats-button'))footer.insertAdjacentHTML('afterbegin','<button type="button" id="document-stats-button" data-action="document-statistics" title="Estatísticas do documento e seleção">Estatísticas</button>');updateWritingStatistics();
}
const writingRenderMain=renderMain;renderMain=function(){writingRenderMain();mountWritingTools()};
const writingActivatePane=activatePane;activatePane=function(index){writingActivatePane(index);queueWritingStatistics()};
document.addEventListener('selectionchange',queueWritingStatistics);
document.addEventListener('input',e=>{if(e.target.matches('#editor,#project-editor,[data-pane-editor]')||e.target.closest('.visual-block'))queueWritingStatistics()});
document.addEventListener('focusin',e=>{if(e.target.matches('#editor,#project-editor,[data-pane-editor]')||e.target.closest('.visual-block'))queueWritingStatistics()});
document.addEventListener('select',queueWritingStatistics);

function safeSearchSnippet(value){let html='',cursor=0;for(const range of value.ranges){html+=esc(value.text.slice(cursor,range.start))+'<mark>'+esc(value.text.slice(range.start,range.end))+'</mark>';cursor=range.end}return html+esc(value.text.slice(cursor))}
const writingModalSearch=updateModalSearch;
updateModalSearch=function(){
 writingModalSearch();const docs=new Map(discoveryDocs().map(doc=>[String(docId(doc)),doc]));
 for(const row of document.querySelectorAll('[data-hybrid-open]')){const doc=docs.get(row.dataset.hybridOpen),preview=row.querySelector('p');if(!doc||!preview)continue;const snippet=AmagoSearch.snippet(doc,workbench.query);preview.innerHTML=safeSearchSnippet(snippet);preview.dataset.snippetSource=snippet.source;preview.setAttribute('aria-label',snippet.source==='metadata'?'Correspondência nos metadados':'Contexto da correspondência')}
};
queryHelp=()=>'<span>Combine filtros: <code>#tag type:markdown ext:md is:task -is:done</code> · <code>is:task</code> = tarefas; <code>is:todo</code> = pendentes; <code>is:done</code> = concluídas</span>';
window.addEventListener('amago-ready',()=>{applyTheme();mountWritingTools()});
applyTheme();mountWritingTools();
