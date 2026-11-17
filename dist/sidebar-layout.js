'use strict';

// Keep the existing controls and their handlers; only group the secondary actions.
const sidebarOptionsOpen=new Map();
function simplifyWorkspaceSidebar(){
 const sidebar=$('#sidebar');if(!sidebar)return;
 sidebar.classList.add('sidebar-minimal');
 const location=sidebar.querySelector('.project-location'),picker=sidebar.querySelector('.workspace-picker');
 if(location){
  picker.title=`${workbench.project.root} · ${projectFiles().length} arquivos · Trocar espaço`;
  const nav=document.createElement('nav');nav.className='workspace-shortcuts';nav.setAttribute('aria-label','Navegação principal');
  for(const [selector,label,active] of [['.project-central-button','Central',state.view==='project-home'],['.project-map-button','Mapa',state.view==='graph']]){
   const button=sidebar.querySelector(selector);if(!button)continue;
   button.className=active?'active':'';button.innerHTML=icon(label==='Central'?'home':'graph')+label;button.setAttribute('aria-current',active?'page':'false');nav.append(button);
  }
  location.replaceWith(nav);
 }
 const toolbar=sidebar.querySelector('.tree-toolbar'),sort=sidebar.querySelector('.explorer-sort'),filter=sidebar.querySelector('.workspace-tree-filter');
 if(!toolbar||!filter)return;
 const input=filter.querySelector('input');input.type='text';input.setAttribute('role','searchbox');
 const key=productivityWorkspaceKey(),details=document.createElement('details');details.className='explorer-options';
 details.innerHTML='<summary title="Opções do explorador" aria-label="Opções do explorador">'+icon('more')+'</summary><div class="explorer-options-panel"></div>';
 details.open=sidebarOptionsOpen.get(key)===true;
 const panel=details.querySelector('.explorer-options-panel'),actions=toolbar.querySelector('div');
 if(sort)panel.append(sort);
 if(actions){
  actions.className='explorer-secondary-actions';
  for(const button of actions.querySelectorAll('button')){const label=document.createElement('span');label.textContent=button.getAttribute('aria-label')||button.title;button.append(label)}
  panel.append(actions);
 }
 toolbar.remove();filter.append(details);
 details.addEventListener('toggle',()=>{if(details.isConnected)sidebarOptionsOpen.set(key,details.open)});
 details.querySelector('summary').addEventListener('click',()=>sidebarOptionsOpen.set(key,!details.open));
 details.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();details.open=false;details.querySelector('summary').focus()}});
 panel.addEventListener('click',event=>{if(event.target.closest('button')){sidebarOptionsOpen.set(key,false);details.open=false;requestAnimationFrame(()=>$('.explorer-options summary')?.focus())}},true);
}
document.addEventListener('pointerdown',event=>{
 const details=$('.explorer-options[open]');if(details&&!details.contains(event.target)){sidebarOptionsOpen.set(productivityWorkspaceKey(),false);details.open=false}
});
const minimalRenderTree=renderTree;
renderTree=function(){minimalRenderTree();simplifyWorkspaceSidebar()};
simplifyWorkspaceSidebar();
