'use strict';
settingTabs.push(['about','Sobre o Free','core']);
const freeSettings=showSettings;
showSettings=function(tab='general'){
 if(tab!=='about')return freeSettings(tab);
 studio.settings=tab;
 settingsShell(tab,`<div class="eyebrow">GRATUITO · OPEN SOURCE · GPL-3.0</div><h3>Âmago Free ${esc(window.amagoVersion)}</h3><p>Uma edição mais simples, focada em escrever, organizar e conectar arquivos locais.</p><p>Sem conta, marketplace, plugins ou nuvem. Esta edição recebe correções quando necessário e não acompanha todas as novidades da edição oficial.</p><h3>Atualizações manuais</h3><p>Consulte as versões publicadas no repositório do Free. Para atualizar, feche o aplicativo e instale uma nova versão gratuita. Seus arquivos pessoais e projetos permanecem locais.</p><p><a href="https://github.com/Nixye/amago-free/releases" target="_blank" rel="noopener">Versões do Âmago Free ↗</a></p><p><a href="https://github.com/Nixye/amago-free" target="_blank" rel="noopener">Código-fonte e documentação ↗</a></p><p><a href="https://amagoapp.com" target="_blank" rel="noopener">Conhecer a edição oficial ↗</a></p>`);
};
