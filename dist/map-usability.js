'use strict';
const clearMapRender=renderUniverse;
renderUniverse=function(){
 clearMapRender();const page=$('.universe-page');if(!page)return;
 const panel=document.createElement('section');panel.className='map-filter-panel';panel.setAttribute('aria-label','Buscar notas e filtrar relações');
 page.querySelector('.universe-heading').after(panel);
 for(const selector of ['.universe-filter','#graph-chips','.atlas-relations','.relation-legend']){const element=page.querySelector(selector);if(element)panel.append(element)}
 const legend=panel.querySelector('.relation-legend');if(legend)legend.querySelectorAll('span').forEach(span=>{if(!span.querySelector('.relation-mixed'))span.remove()});
 $('#atlas-depth')?.closest('label').remove();
 const focus=$('#atlas-focus');if(focus){const row=document.createElement('div');row.className='map-focus-row';panel.append(row);row.append(focus);focus.textContent=discovery.localFocus?'Sair da vizinhança':'Explorar vizinhança da nota';const hint=document.createElement('small');hint.textContent=discovery.localFocus?'Toda a rede conectada está incluída. A busca e os tipos de relação controlam o que aparece.':'Selecione uma nota no mapa para explorar sua rede de conexões.';row.append(hint)}
 const toolbar=page.querySelector('.universe-toolbar');if(toolbar){const details=document.createElement('details');details.className='map-display-options';details.innerHTML='<summary>Ajustar visual do mapa · organização, nomes e animação</summary>';toolbar.before(details);details.append(toolbar)}
 const use=$('#use-sidebar-query');if(use&&!workbench.query)use.hidden=true;
};
