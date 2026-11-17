'use strict';

settingTabs.splice(1,0,['editing','Edição','edit'],['reading','Visualização','eye'],['shortcuts','Atalhos','panel']);
const usabilitySettings=showSettings;
showSettings=function(tab='general'){
 studio.settings=tab;
 if(tab==='editing'){
  settingsShell(tab,`<div class="eyebrow">ESCRITA</div><h3>Edição de documentos</h3><p>Personalize o editor de Markdown e texto. As mudanças são salvas automaticamente.</p>${writingPreferencesFields()}<div class="settings-sample source-sample" aria-label="Exemplo do editor"># Uma ideia começa aqui<br><br>Escreva com espaço para pensar.<br>Conecte suas notas com [[links]].</div>`);
  applySettingsSamples();return;
 }
 if(tab==='reading'){
  const p=readingPreferences();settingsShell(tab,`<div class="eyebrow">LEITURA E PRÉVIA</div><h3>Visualização dos documentos</h3><p>Ajuste a leitura sem alterar a formatação salva no arquivo.</p><div class="preference-grid"><label>Tamanho do texto <span>pixels</span><input class="field" type="number" min="14" max="28" step="1" data-reading="size" value="${p.size}"></label><label>Espaçamento entre linhas<input class="field" type="number" min="1.3" max="2.4" step="0.1" data-reading="lineHeight" value="${p.lineHeight}"></label><label>Largura da leitura<select class="field" data-reading="width"><option value="comfortable" ${p.width==='comfortable'?'selected':''}>Compacta · 720 px</option><option value="wide" ${p.width==='wide'?'selected':''}>Ampla · 1000 px</option><option value="full" ${p.width==='full'?'selected':''}>Toda a largura</option></select></label></div><div class="settings-sample reading-sample"><h4>Um espaço para suas ideias</h4><p>Leia, conecte referências e encontre novas perspectivas. Esta prévia acompanha suas escolhas.</p></div><p>O modo foco mantém seus próprios ajustes no botão Aa.</p>`);applySettingsSamples();return;
 }
 if(tab==='shortcuts'){renderShortcutSettings();return}
 usabilitySettings(tab);
 const content=$('#settings-content');if(!content)return;
 if(tab==='general'){$('.settings-shortcuts')?.remove();content.querySelector('h3').textContent='Navegação e inicialização';content.insertAdjacentHTML('beforeend','<p class="settings-hint">Procure Edição para a escrita, Visualização para a leitura e Atalhos para personalizar o teclado. Suas alterações são salvas automaticamente.</p>')}
 if(tab==='appearance')polishAppearanceSettings(content);
 if(tab==='plugins')polishPluginSettings(content);
};
actions['writing-preferences']=()=>showSettings('editing');
function readingPreferences(){const p=interfacePrefs().reading||{};return {size:Math.max(14,Math.min(28,Number(p.size)||18)),lineHeight:Math.max(1.3,Math.min(2.4,Number(p.lineHeight)||1.8)),width:['comfortable','wide','full'].includes(p.width)?p.width:'full'}}
function applyReadingPreferences(){const p=readingPreferences();document.body.style.setProperty('--reading-size',p.size+'px');document.body.style.setProperty('--reading-line',p.lineHeight);document.body.style.setProperty('--reading-width',p.width==='comfortable'?'720px':p.width==='wide'?'1000px':'none')}
function applySettingsSamples(){const p=writingPreferences(),sample=$('.source-sample');if(sample){sample.style.fontSize=p.fontSize+'px';sample.style.lineHeight=p.lineHeight}applyReadingPreferences()}
document.addEventListener('input',event=>{if(event.target.matches('[data-writing-preference]'))applySettingsSamples()});
document.addEventListener('change',event=>{const field=event.target.closest('[data-reading]');if(!field||!field.checkValidity())return;interfacePrefs().reading={...readingPreferences(),[field.dataset.reading]:field.dataset.reading==='width'?field.value:Number(field.value)};applyReadingPreferences();persist()});
function polishAppearanceSettings(content){
 content.classList.add('clear-settings');const intro=content.querySelector(':scope>p');if(intro)intro.textContent='Escolha um tema e ajuste a transparência da janela. A leitura e a escrita têm categorias próprias.';
 mountWritingSettings();const grid=content.querySelector('.theme-grid');if(grid){grid.insertAdjacentHTML('beforebegin','<h3>Temas instalados</h3>');for(const button of grid.querySelectorAll('[data-theme-id]')){button.setAttribute('aria-pressed',String(button.dataset.themeId===document.body.dataset.skin));if(button.dataset.themeId===document.body.dataset.skin)button.insertAdjacentHTML('beforeend','<span class="theme-selected">✓ Em uso</span>')}}
 const imports=content.querySelector('.modal-actions');if(imports){const details=document.createElement('details');details.className='settings-advanced';details.innerHTML='<summary>Importar ou exportar um tema</summary>';imports.before(details);details.append(imports)}
}
function polishPluginSettings(content){
 const intro=content.querySelector(':scope>p');if(intro)intro.textContent='Gerencie os plugins instalados neste dispositivo. Ative apenas os que deseja usar.';
 const list=content.querySelector('.plugin-list');if(!list)return;
 list.insertAdjacentHTML('beforebegin','<h3>Plugins instalados</h3><div class="plugin-filter-row"><input class="field" id="installed-plugin-query" type="search" aria-label="Buscar plugins instalados" placeholder="Buscar plugin…"><select class="field" id="installed-plugin-state" aria-label="Estado do plugin"><option value="all">Todos</option><option value="enabled">Ativos</option><option value="disabled">Desativados</option></select></div><p id="installed-plugin-count" role="status"></p>');
 list.querySelectorAll('.plugin-card').forEach(card=>{const badges=[...card.querySelectorAll('.permission-badge')];if(badges.length){const details=document.createElement('details');details.innerHTML='<summary>Acessos permitidos</summary>';card.firstElementChild.append(details);details.append(...badges)}});
 const refresh=()=>{let count=0;list.querySelectorAll('.plugin-card').forEach(card=>{const id=card.querySelector('[data-plugin-toggle]').dataset.pluginToggle,p=vault.plugins.find(p=>p.id===id),filter=$('#installed-plugin-state').value;card.hidden=!AmagoSearch.normalize(p.name+' '+p.description).includes(AmagoSearch.normalize($('#installed-plugin-query').value))||(filter==='enabled'&&!p.enabled)||(filter==='disabled'&&p.enabled);if(!card.hidden)count++});$('#installed-plugin-count').textContent=count+' plugin(s) exibido(s)'};
 $('#installed-plugin-query').oninput=refresh;$('#installed-plugin-state').onchange=refresh;refresh();
}
function renderShortcutSettings(){
 settingsShell('shortcuts','<div class="eyebrow">TECLADO</div><h3>Atalhos de teclado</h3><p>Clique em um campo e pressione a combinação desejada. Use Ctrl (ou ⌘ no macOS) ou Alt. Esc cancela.</p><label>Encontrar uma ação<input class="field" id="keybinding-query" type="search" placeholder="Ex.: salvar, foco, buscar"></label><p id="keybinding-status" role="status"></p><div id="keybinding-list"></div><button class="plain-button" id="keybinding-reset">Restaurar atalhos padrão</button><details class="settings-advanced"><summary>Outros atalhos de navegação e edição</summary>'+writingShortcutGroups.map(([title,items])=>`<h4>${esc(title)}</h4>${items.filter(([keys])=>keys.includes('/')||keys==='Esc'||keys.includes('↑')||keys.includes('Home')).map(([keys,label])=>`<p><kbd>${esc(keys)}</kbd> ${esc(label)}</p>`).join('')}`).join('')+'</details>');
 const refresh=()=>{const q=AmagoSearch.normalize($('#keybinding-query').value);$('#keybinding-list').innerHTML=configurableShortcuts.filter(([,label])=>AmagoSearch.normalize(label).includes(q)).map(([id,label,fallback])=>`<label class="keybinding-row"><span>${esc(label)}</span><input class="field" data-keybinding="${id}" aria-label="Atalho para ${esc(label)}" value="${esc(shortcutValue(id,fallback))}" readonly></label>`).join('')||'<p>Nenhuma ação encontrada.</p>'};
 $('#keybinding-query').oninput=refresh;$('#keybinding-reset').onclick=()=>{interfacePrefs().keybindings={};persist();refresh();$('#keybinding-status').textContent='Atalhos padrão restaurados.'};refresh();
 $('#keybinding-list').onkeydown=event=>{const field=event.target.closest('[data-keybinding]');if(!field||event.key==='Tab')return;event.preventDefault();event.stopPropagation();if(event.key==='Escape'){field.blur();return}if(['Control','Meta','Alt','Shift'].includes(event.key))return;
 const chord=shortcutChord(event),conflict=configurableShortcuts.find(([id,,fallback])=>id!==field.dataset.keybinding&&shortcutValue(id,fallback)===chord);
 if(!(event.ctrlKey||event.metaKey||event.altKey)||conflict||['Ctrl+Tab','Ctrl+Shift+Tab','Alt+ArrowLeft','Alt+ArrowRight','Alt+F4','Ctrl+C','Ctrl+V','Ctrl+X','Ctrl+A','Ctrl+Z','Ctrl+Y','Ctrl+Shift+Z'].includes(chord)){$('#keybinding-status').textContent=conflict?'Esta combinação já está em uso: '+conflict[1]+'.':'Escolha uma combinação com Ctrl ou Alt que não seja reservada.';return}
 interfacePrefs().keybindings??={};interfacePrefs().keybindings[field.dataset.keybinding]=chord;persist();field.value=chord;$('#keybinding-status').textContent='Atalho salvo.';
 };
}
applyReadingPreferences();

function startupUpdatePreference(){return window.amagoDesktop?`<label class="settings-option"><span><strong>Buscar atualizações ao iniciar</strong><small>Consulta novas versões em segundo plano. Você escolhe quando baixar e instalar.</small></span><input type="checkbox" id="setting-startup-updates" ${interfacePrefs().checkUpdatesOnStartup!==false?'checked':''}></label>`:''}
function bindStartupUpdatePreference(){const input=$('#setting-startup-updates');if(input)input.onchange=()=>{interfacePrefs().checkUpdatesOnStartup=input.checked;persist()}}

const readingRenderMain=renderMain;renderMain=function(){readingRenderMain();applyReadingPreferences()};
