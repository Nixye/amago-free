'use strict';
settingTabs.push(['updates','Atualizações','refresh']);
let freeUpdateResult=null,freeUpdateBusy=false;
const settingsBeforeFreeUpdates=showSettings;
showSettings=function(tab='general'){
 if(tab!=='updates')return settingsBeforeFreeUpdates(tab);
 studio.settings=tab;settingsShell(tab,`<div class="eyebrow">ÂMAGO FREE ${esc(window.amagoVersion)}</div><h3>Atualizações</h3>${startupUpdatePreference()}<p>Consulte novas versões do Free. A instalação é manual e mantém seus dados locais.</p><p role="status">${freeUpdateBusy?'Consultando versões…':freeUpdateResult?.status==='available'?'Nova versão disponível: '+esc(freeUpdateResult.version):freeUpdateResult?.status==='current'?'Você está na versão mais recente.':esc(freeUpdateResult?.message||'Pronto para consultar.')}</p>${window.amagoDesktop?.freeUpdates?`<button class="solid-button" id="free-check-updates" ${freeUpdateBusy?'disabled':''}>Verificar atualizações</button>`:'<p>Na web, recarregue a página para usar a publicação atual.</p>'}<p><a href="https://github.com/Nixye/amago-free/releases" target="_blank" rel="noopener">Abrir versões do Âmago Free ↗</a></p>`);bindStartupUpdatePreference();$('#free-check-updates')?.addEventListener('click',()=>checkFreeUpdates(false));
};
async function checkFreeUpdates(background){
 if(freeUpdateBusy||!window.amagoDesktop?.freeUpdates)return;
 freeUpdateBusy=true;if(!background)showSettings('updates');
 try{freeUpdateResult=await window.amagoDesktop.freeUpdates();if(background&&freeUpdateResult.status==='available'){toast('Âmago Free '+freeUpdateResult.version+' disponível. Abra Configurações → Atualizações.')}}catch{freeUpdateResult={status:'error',message:'Não foi possível consultar as atualizações.'}}
 finally{freeUpdateBusy=false;if($('#settings-content')?.getAttribute('aria-labelledby')==='settings-updates')showSettings('updates')}
}
setTimeout(()=>{if(interfacePrefs().checkUpdatesOnStartup!==false)checkFreeUpdates(true)},15000);
