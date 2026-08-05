(() => {
  let tools=[]; let activeCategory='all'; let searchTerm=''; let deferredPrompt=null;
  const categoryKeys={recherche:'filter_research',lecture:'filter_reading',viz:'filter_visualization',presentation:'filter_presentation',biblio:'filter_bibliography'};
  const base=()=>document.documentElement.dataset.basePath||'./';
  const t=(k,f='')=>window.NBProfI18n?.t(k,f)||f||k;
  const lang=()=>window.NBProfI18n?.getLanguage()||'fr';
  const $=s=>document.querySelector(s);

  function showToast(message,duration=2600){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),duration);}
  function getDescription(tool){return tool.description?.[lang()]||tool.description?.fr||'';}
  function categoryLabel(cat){return t(categoryKeys[cat],cat);}
  function render(){
    const container=$('#cardsContainer'), empty=$('#noResults'); if(!container||!empty)return;
    const q=searchTerm.trim().toLocaleLowerCase(lang());
    const filtered=tools.filter(tool=>{
      const matchCat=activeCategory==='all'||tool.category===activeCategory;
      const haystack=`${tool.name} ${getDescription(tool)} ${categoryLabel(tool.category)}`.toLocaleLowerCase(lang());
      return matchCat&&(!q||haystack.includes(q));
    });
    container.innerHTML=''; empty.classList.toggle('show',filtered.length===0);
    const groups=filtered.reduce((acc,tool)=>{(acc[tool.category]??=[]).push(tool);return acc;},{});
    Object.entries(groups).forEach(([cat,items])=>{
      if(activeCategory==='all'){const label=document.createElement('div');label.className='section-lbl';label.textContent=categoryLabel(cat);container.append(label);}
      const grid=document.createElement('div');grid.className='cards';
      items.forEach(tool=>{
        const article=document.createElement('article');article.className=`card ${tool.accent}`;
        const top=document.createElement('div');top.className='card-top';
        const icon=document.createElement('div');icon.className='card-ico';icon.setAttribute('aria-hidden','true');icon.textContent=tool.icon;
        const info=document.createElement('div');info.className='card-info';
        const name=document.createElement('div');name.className='card-name';name.textContent=tool.name;
        const catEl=document.createElement('div');catEl.className='card-cat';catEl.textContent=categoryLabel(tool.category);
        info.append(name,catEl);top.append(icon,info);
        const desc=document.createElement('p');desc.className='card-desc';desc.textContent=getDescription(tool);
        const link=document.createElement('a');link.className='card-link';link.href=tool.url;link.target='_blank';link.rel='noopener noreferrer';link.innerHTML=`<span>${t('open_tool','Ouvrir le site')}</span><span aria-hidden="true">↗</span>`;
        article.append(top,desc,link);grid.append(article);
      });
      container.append(grid);
    });
  }
  function setCategory(cat,scroll=true){activeCategory=cat;document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('active',el.dataset.cat===cat));render();if(scroll)$('#recommendedTools')?.scrollIntoView({behavior:'smooth',block:'start'});}
  function runSearch(){searchTerm=$('#hubSearch')?.value||'';setCategory('all');}
  async function loadTools(){
    const state=$('#cardsContainer'); if(state)state.innerHTML=`<div class="loading-state">${t('loading','Chargement...')}</div>`;
    try{const r=await fetch(`${base()}data/tools.json`,{cache:'no-store'});if(!r.ok)throw new Error('tools.json');tools=await r.json();const count=$('#toolCount');if(count)count.textContent=tools.length;render();}
    catch(err){console.error(err);if(state)state.innerHTML=`<div class="loading-state">${t('load_error','Erreur de chargement')}</div>`;}
  }
  async function shareApp(){const data={title:t('share_title','NBProf Research Hub'),text:t('share_text',''),url:location.href};if(navigator.share){try{await navigator.share(data);}catch(_){}}else{try{await navigator.clipboard.writeText(location.href);showToast(t('link_copied','Lien copié !'));}catch(_){prompt('URL',location.href);}}}
  function addProjectsLink(){const actions=$('.header-actions');if(!actions||$('.projects-link'))return;const link=document.createElement('a');link.className='header-button projects-link';link.href='pages/projets.html';link.dataset.i18n='projects_nav';link.dataset.i18nAriaLabel='projects_nav';link.setAttribute('aria-label',t('projects_nav','Mes projets'));link.title=t('projects_nav','Mes projets');link.textContent=t('projects_nav','Mes projets');actions.prepend(link);}
  function prepareNotification(){const button=$('#aboutBtn');if(!button)return;button.textContent='🔔';button.removeAttribute('data-i18n-aria-label');button.setAttribute('aria-label',t('notifications_button','Notifications'));button.title=t('notifications_button','Notifications');}
  function addNbprofLink(){const actions=$('.footer-actions');if(!actions||$('.nbprof-return'))return;const link=document.createElement('a');link.className='secondary-button nbprof-return';link.href='https://nbprof.com';link.dataset.i18n='return_nbprof';link.textContent=t('return_nbprof','Retour au site NBProf');actions.append(link);}
  function bind(){addProjectsLink();prepareNotification();addNbprofLink();
    $('#tabs')?.addEventListener('click',e=>{const tab=e.target.closest('.tab');if(tab)setCategory(tab.dataset.cat);});
    $('#hubSearchButton')?.addEventListener('click',runSearch);
    $('#hubSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')runSearch();});
    $('#hubSearch')?.addEventListener('input',e=>{searchTerm=e.target.value;render();});
    $('.goal-grid')?.addEventListener('click',e=>{const card=e.target.closest('.goal-card');if(card)location.href=`pages/parcours.html?parcours=${encodeURIComponent(card.dataset.journey)}`;});
    $('#shareBtn')?.addEventListener('click',shareApp);
    $('#aboutBtn')?.addEventListener('click',()=>showToast(t('notifications_empty','Aucune nouvelle notification.')));
    window.addEventListener('offline',()=>showToast(`📴 ${t('offline','Mode hors ligne')}`));
    window.addEventListener('online',()=>showToast(`✅ ${t('online','Connexion rétablie')}`));
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBanner')?.classList.add('show');});
    $('#installBtn')?.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBanner')?.classList.remove('show');});
    $('#dismissBtn')?.addEventListener('click',()=>$('#installBanner')?.classList.remove('show'));
    window.addEventListener('appinstalled',()=>{deferredPrompt=null;$('#installBanner')?.classList.remove('show');showToast(`✅ ${t('installed','Application installée')}`);});
    window.addEventListener('nbprof:languagechange',()=>render());
    if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(`${base()}sw.js`).catch(console.error));
    window.addEventListener('load',()=>setTimeout(()=>{const splash=$('#splash-screen');if(splash){splash.style.opacity='0';setTimeout(()=>splash.remove(),600);}},850));
  }
  function init(){bind();loadTools();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
