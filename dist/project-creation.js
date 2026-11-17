(function(root){
 'use strict';
 function name(value){if(typeof value!=='string')throw Error('Nome inválido.');value=value.trim();if(!value||value.length>80||/[<>:"/\\|?*\u0000-\u001f]/.test(value)||/[. ]$/.test(value)||value==='.'||value==='..'||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value))throw Error('Use um nome de até 80 caracteres, sem separadores ou caracteres reservados.');return value}
 function files(projectName,template){projectName=name(projectName);if(!['empty','writing','study'].includes(template))throw Error('Modelo inválido.');return template==='empty'?{}:template==='writing'?{'Início.md':'# '+projectName+'\n\n## Objetivo\n\n\n## Próximos passos\n\n- [ ] Escrever a primeira ideia\n','Rascunhos/Ideias.md':'# Ideias\n\n','Referências/Leituras.md':'# Leituras\n\n'}:{'Início.md':'# '+projectName+'\n\n## Plano de estudo\n\n- [ ] Definir temas\n','Estudos/Conceitos.md':'# Conceitos\n\n','Estudos/Cartões.md':'# Cartões\n\nO que quero aprender? :: Escreva sua resposta aqui.\n'}}
 const api={name,files};root.AmagoProjectCreation=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
