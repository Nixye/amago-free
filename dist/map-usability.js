'use strict';
let mapFiltersOpen=false,mapDisplayOpen=false;
const clearMapRender=renderUniverse;
renderUniverse=function(){
 const previousScroll=$('#map-filters')?.scrollTop||0;
 clearMapRender();const page=$('.universe-page');if(!page)return;
 const heading=page.querySelector('.universe-heading'),stage=page.querySelector('.universe-stage');
 const workspace=document.createElement('div');workspace.className='map-workspace';heading.after(workspace);workspace.append(stage);
 const panel=document.createElement('aside');panel.id='map-filters';panel.className='map-filter-panel';panel.setAttribute('aria-label','Pesquisa e filtros do mapa');
 panel.innerHTML='<div class="map-panel-heading"><strong>Pesquisa e filtros</strong><button class="icon-button" id="map-filters-close" aria-label="Recolher pesquisa e filtros">'+icon('close')+'</button></div><p class="map-panel-hint">Encontre notas e escolha as conexões que deseja ver.</p>';
 workspace.append(panel);
 const actions=document.createElement('div');actions.className='map-heading-actions';actions.append(page.querySelector('.universe-count'));heading.append(actions);
 const toggle=document.createElement('button');toggle.id='map-filters-toggle';toggle.className='plain-button';toggle.setAttribute('aria-controls','map-filters');toggle.innerHTML=icon('search')+'<span>Pesquisa e filtros</span>';actions.append(toggle);
 const setOpen=open=>{mapFiltersOpen=open;panel.hidden=!open;workspace.classList.toggle('filters-open',open);toggle.setAttribute('aria-expanded',String(open))};setOpen(mapFiltersOpen);
 toggle.onclick=()=>setOpen(!mapFiltersOpen);$('#map-filters-close').onclick=()=>{setOpen(false);toggle.focus()};
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);toggle.focus()}});
 for(const selector of ['.universe-filter','#graph-chips','.atlas-relations','.relation-legend']){const element=page.querySelector(selector);if(element)panel.append(element)}
 const query=$('#graph-query');query.placeholder='Texto, #tag ou @menção…';query.setAttribute('aria-label','Pesquisar notas no mapa');
 const legend=panel.querySelector('.relation-legend');if(legend)legend.querySelectorAll('span').forEach(span=>{if(!span.querySelector('.relation-mixed'))span.remove()});
 $('#atlas-depth')?.closest('label').remove();
 const focus=$('#atlas-focus');if(focus){const row=document.createElement('div');row.className='map-focus-row';panel.append(row);row.append(focus);focus.textContent=discovery.localFocus?'Sair da vizinhança':'Explorar vizinhança da nota';const hint=document.createElement('small');hint.textContent=discovery.localFocus?'Toda a rede conectada está incluída. A busca e as relações controlam o que aparece.':'Selecione uma nota no mapa para explorar suas conexões.';row.append(hint)}
 const toolbar=page.querySelector('.universe-toolbar');if(toolbar){const details=document.createElement('details');details.className='map-display-options';details.innerHTML='<summary>Visual do mapa</summary>';details.open=mapDisplayOpen;details.ontoggle=()=>{if(details.isConnected)mapDisplayOpen=details.open};panel.append(details);details.append(toolbar)}
 const use=$('#use-sidebar-query');if(use&&!workbench.query)use.hidden=true;
 panel.scrollTop=previousScroll;
};
