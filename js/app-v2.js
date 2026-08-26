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
  function initMobileMenu(){
  const toggle = document.getElementById('mobileMenuToggle');
  const menu = document.getElementById('mobileNavMenu');

  if(!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';

    toggle.setAttribute('aria-expanded', String(!isOpen));
    menu.hidden = isOpen;
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (event) => {
    if(!menu.hidden &&
       !menu.contains(event.target) &&
       !toggle.contains(event.target)){
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}
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
  function runSearch(){searchTerm=$('#hubSearch')?.value||'';window.NBProfUnifiedSearch?.search(searchTerm);if(!searchTerm.trim())setCategory('all');}

  async function loadTools(){
    const state=$('#cardsContainer'); if(state)state.innerHTML=`<div class="loading-state">${t('loading','Chargement...')}</div>`;
    try{
      const r=await fetch(`${base()}data/tools.json`,{cache:'no-store'});
      if(!r.ok)throw new Error('tools.json');
      tools=await r.json();
      const count=$('#toolCount');
      if(count)count.textContent=tools.length;
      render();
    }catch(err){
      console.error(err);
      if(state)state.innerHTML=`<div class="loading-state">${t('load_error','Erreur de chargement')}</div>`;
    }
  }

  async function shareApp(){
    const data={title:t('share_title','NBProf Research Hub'),text:t('share_text',''),url:location.href};
    if(navigator.share){
      try{await navigator.share(data);}catch(_){}
    }else{
      try{
        await navigator.clipboard.writeText(location.href);
        showToast(t('link_copied','Lien copié !'));
      }catch(_){
        prompt('URL',location.href);
      }
    }
  }

  function addProjectsLink(){
    const actions=$('.header-actions');
    if(!actions||$('.projects-link'))return;
    const link=document.createElement('a');
    link.className='header-button projects-link';
    link.href='pages/projets.html';
    link.dataset.i18n='projects_nav';
    link.dataset.i18nAriaLabel='projects_nav';
    link.setAttribute('aria-label',t('projects_nav','Mes projets'));
    link.title=t('projects_nav','Mes projets');
    link.textContent=t('projects_nav','Mes projets');
    actions.prepend(link);
  }

  function addDashboardLink(){
    const actions=$('.header-actions');
    if(!actions||$('.dashboard-link'))return;
    const link=document.createElement('a');
    link.className='header-button dashboard-link';
    link.href='pages/dashboard.html';
    link.dataset.i18n='dashboard_nav';
    link.dataset.i18nAriaLabel='dashboard_nav';
    link.setAttribute('aria-label',t('dashboard_nav','Tableau de bord'));
    link.title=t('dashboard_nav','Tableau de bord');
    link.textContent=t('dashboard_nav','Tableau de bord');
    actions.prepend(link);
  }

  function addReportLink(){
    const actions=$('.header-actions');
    if(!actions||$('.report-link'))return;
    const link=document.createElement('a');
    link.className='header-button report-link';
    link.href='pages/rapport.html';
    link.dataset.i18n='report_nav';
    link.dataset.i18nAriaLabel='report_nav';
    link.setAttribute('aria-label',t('report_nav','Rapport'));
    link.title=t('report_nav','Rapport');
    link.textContent=t('report_nav','Rapport');
    actions.prepend(link);
  }

  function prepareNotification(){
    const button=$('#aboutBtn');
    if(!button)return;
    button.textContent='🔔';
    button.removeAttribute('data-i18n-aria-label');
    button.setAttribute('aria-label',t('notifications_button','Notifications'));
    button.title=t('notifications_button','Notifications');
  }

  function addNbprofLink(){
    const actions=$('.footer-actions');
    if(!actions||$('.nbprof-return'))return;
    const link=document.createElement('a');
    link.className='secondary-button nbprof-return';
    link.href='https://nbprof.com';
    link.dataset.i18n='return_nbprof';
    link.textContent=t('return_nbprof','Retour au site NBProf');
    actions.append(link);
  }

  /* v1.2 — Onboarding de première visite */

  const ONBOARDING_KEY='nbprof-onboarding-v1.2-completed';

  const onboardingCopy={
    fr:{
      skip:'Passer',
      back:'Précédent',
      next:'Suivant',
      start:'Commencer',
      guide:'Voir le guide complet',
      progress:'Étape',
      steps:[
        {
          icon:'👋',
          kicker:'Bienvenue',
          title:'Bienvenue dans NBProf Research Hub',
          text:'Un espace pensé pour vous accompagner de l’idée à la soutenance, sans vous imposer tous les outils dès le départ.'
        },
        {
          icon:'📝',
          kicker:'Créer',
          title:'Commencez par votre projet',
          text:'Créez votre projet, précisez votre objectif et votre problématique, puis ajoutez une première échéance.'
        },
        {
          icon:'🧭',
          kicker:'Organiser',
          title:'Avancez étape par étape',
          text:'Utilisez les tâches, les jalons, le tableau de bord, Exploration et Literature selon votre niveau d’avancement.'
        },
        {
          icon:'💾',
          kicker:'Sauvegarder',
          title:'Gardez toujours une copie de votre travail',
          text:'Vos projets restent dans votre navigateur. Exportez régulièrement une sauvegarde pour protéger votre recherche.'
        }
      ]
    },

    en:{
      skip:'Skip',
      back:'Back',
      next:'Next',
      start:'Get started',
      guide:'Open the full guide',
      progress:'Step',
      steps:[
        {
          icon:'👋',
          kicker:'Welcome',
          title:'Welcome to NBProf Research Hub',
          text:'A workspace designed to guide you from the first idea to the defense, without overwhelming you with every tool at once.'
        },
        {
          icon:'📝',
          kicker:'Create',
          title:'Start with your research project',
          text:'Create your project, define its objective and research question, then add a first deadline.'
        },
        {
          icon:'🧭',
          kicker:'Organize',
          title:'Move forward step by step',
          text:'Use tasks, milestones, the dashboard, Exploration and Literature according to your current stage.'
        },
        {
          icon:'💾',
          kicker:'Back up',
          title:'Always keep a copy of your work',
          text:'Your projects stay in your browser. Export a backup regularly to protect your research.'
        }
      ]
    },

    ar:{
      skip:'تخطي',
      back:'السابق',
      next:'التالي',
      start:'ابدأ',
      guide:'عرض الدليل الكامل',
      progress:'الخطوة',
      steps:[
        {
          icon:'👋',
          kicker:'مرحباً',
          title:'مرحباً بك في NBProf Research Hub',
          text:'فضاء صُمم لمرافقتك من الفكرة الأولى إلى المناقشة، دون إغراقك بكل الأدوات منذ البداية.'
        },
        {
          icon:'📝',
          kicker:'إنشاء',
          title:'ابدأ بمشروعك البحثي',
          text:'أنشئ مشروعك، وحدد الهدف والإشكالية، ثم أضف أول موعد مهم.'
        },
        {
          icon:'🧭',
          kicker:'تنظيم',
          title:'تقدم خطوة بخطوة',
          text:'استخدم المهام والمراحل ولوحة القيادة وفضاء الاستكشاف والمراجع حسب مستوى تقدمك.'
        },
        {
          icon:'💾',
          kicker:'حفظ',
          title:'احتفظ دائماً بنسخة من عملك',
          text:'تبقى مشاريعك في متصفحك. صدّر نسخة احتياطية بانتظام لحماية بحثك.'
        }
      ]
    }
  };

  function getOnboardingCopy(){
    return onboardingCopy[lang()]||onboardingCopy.fr;
  }

  function completeOnboarding(reason='completed'){
    localStorage.setItem(ONBOARDING_KEY,'1');
    document.querySelector('.onboarding-overlay')?.remove();
    document.body.classList.remove('onboarding-open');
  }

  function showOnboarding(){
    if(localStorage.getItem(ONBOARDING_KEY)==='1')return;
    if(document.querySelector('.onboarding-overlay'))return;

    let stepIndex=0;

    const overlay=document.createElement('div');
    overlay.className='onboarding-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','onboardingTitle');

    overlay.innerHTML=`
      <div class="onboarding-card">

        <div class="onboarding-top">
          <div class="onboarding-brand">
            <img src="${base()}icon-192.png" alt="">
            <span>NBProf Research Hub</span>
          </div>

          <button
            type="button"
            class="onboarding-skip">
          </button>
        </div>

        <div
          class="onboarding-progress"
          aria-hidden="true">
        </div>

        <div class="onboarding-content">
          <div
            class="onboarding-icon"
            aria-hidden="true">
          </div>

          <span class="onboarding-kicker"></span>

          <h2 id="onboardingTitle"></h2>

          <p class="onboarding-text"></p>
        </div>

        <div class="onboarding-footer">

          <a
            href="${base()}pages/bien-demarrer.html"
            class="onboarding-guide">
          </a>

          <div class="onboarding-actions">

            <button
              type="button"
              class="secondary-button onboarding-back">
            </button>

            <button
              type="button"
              class="primary-button onboarding-next">
            </button>

          </div>
        </div>
      </div>
    `;

    document.body.append(overlay);
    document.body.classList.add('onboarding-open');


    const skip=overlay.querySelector('.onboarding-skip');
    const back=overlay.querySelector('.onboarding-back');
    const next=overlay.querySelector('.onboarding-next');
    const guide=overlay.querySelector('.onboarding-guide');

    function renderOnboarding(){
      const copy=getOnboardingCopy();
      const step=copy.steps[stepIndex];

      overlay.querySelector('.onboarding-icon').textContent=step.icon;
      overlay.querySelector('.onboarding-kicker').textContent=step.kicker;
      overlay.querySelector('#onboardingTitle').textContent=step.title;
      overlay.querySelector('.onboarding-text').textContent=step.text;

      skip.textContent=copy.skip;
      back.textContent=copy.back;
      guide.textContent=copy.guide;

      next.textContent=
        stepIndex===copy.steps.length-1
          ? copy.start
          : copy.next;

      back.hidden=stepIndex===0;

      const progress=overlay.querySelector('.onboarding-progress');

      progress.innerHTML=
        copy.steps.map((_,i)=>`
          <span
            class="${i<=stepIndex?'is-active':''}"
            aria-label="${copy.progress} ${i+1}">
          </span>
        `).join('');
    }

    skip.addEventListener('click',()=>{
      completeOnboarding('skipped');
    });

    back.addEventListener('click',()=>{
      if(stepIndex>0){
        stepIndex--;
        renderOnboarding();
      }
    });

    next.addEventListener('click',()=>{
      const copy=getOnboardingCopy();

      if(stepIndex<copy.steps.length-1){
        stepIndex++;
        renderOnboarding();
      }else{
        completeOnboarding('completed');
      }
    });

    overlay.addEventListener('keydown',e=>{

      if(e.key==='Escape'){
        completeOnboarding('skipped');
      }

      if(e.key==='ArrowRight' && lang()!=='ar'){
        next.click();
      }

      if(
        e.key==='ArrowLeft' &&
        lang()!=='ar' &&
        !back.hidden
      ){
        back.click();
      }

      if(
        e.key==='ArrowLeft' &&
        lang()==='ar'
      ){
        next.click();
      }

      if(
        e.key==='ArrowRight' &&
        lang()==='ar' &&
        !back.hidden
      ){
        back.click();
      }
    });

    window.addEventListener(
      'nbprof:languagechange',
      renderOnboarding
    );

    renderOnboarding();

    setTimeout(()=>{
      next.focus();
    },50);
  }

  function bind(){
    addProjectsLink();
    addReportLink();
    addDashboardLink();
    prepareNotification();
    addNbprofLink();

    $('#tabs')?.addEventListener('click',e=>{
      const tab=e.target.closest('.tab');
      if(tab)setCategory(tab.dataset.cat);
    });

    $('#hubSearchButton')?.addEventListener('click',runSearch);

    $('#hubSearch')?.addEventListener('keydown',e=>{
      if(e.key==='Enter')runSearch();
    });

    $('#hubSearch')?.addEventListener('input',e=>{
      if(!e.target.value.trim()){searchTerm='';render();}
    });

    $('.goal-grid')?.addEventListener('click',e=>{
      const card=e.target.closest('.goal-card');

      if(card){
        location.href=
          `pages/parcours.html?parcours=${encodeURIComponent(card.dataset.journey)}`;
      }
    });

    $('#shareBtn')?.addEventListener('click',shareApp);

    $('#aboutBtn')?.addEventListener('click',()=>{
      showToast(
        t(
          'notifications_empty',
          'Aucune nouvelle notification.'
        )
      );
    });

    window.addEventListener('offline',()=>{
      showToast(`📴 ${t('offline','Mode hors ligne')}`);
    });

    window.addEventListener('online',()=>{
      showToast(`✅ ${t('online','Connexion rétablie')}`);
    });

    window.addEventListener('beforeinstallprompt',e=>{
      e.preventDefault();
      deferredPrompt=e;
      $('#installBanner')?.classList.add('show');
    });

    $('#installBtn')?.addEventListener('click',async()=>{
      if(!deferredPrompt)return;

      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt=null;

      $('#installBanner')?.classList.remove('show');
    });

    $('#dismissBtn')?.addEventListener('click',()=>{
      $('#installBanner')?.classList.remove('show');
    });

    window.addEventListener('appinstalled',()=>{
      deferredPrompt=null;

      $('#installBanner')?.classList.remove('show');

      showToast(
        `✅ ${t('installed','Application installée')}`
      );
    });

    window.addEventListener(
      'nbprof:languagechange',
      ()=>render()
    );

    if('serviceWorker' in navigator){
      window.addEventListener('load',()=>{
        navigator.serviceWorker
          .register(`${base()}sw.js`)
          .catch(console.error);
      });
    }

    window.addEventListener('load',()=>{
      setTimeout(()=>{
        const splash=$('#splash-screen');

        if(splash){
          splash.style.opacity='0';

          setTimeout(()=>{
            splash.remove();
          },600);
        }
      },850);
    });
  }

  function init(){
    bind();
    initMobileMenu();
    loadTools();

    window.addEventListener(
      'load',
      ()=>setTimeout(showOnboarding,1150),
      {once:true}
    );

    if(document.readyState==='complete'){
      setTimeout(showOnboarding,1150);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  }else{
    init();
  }
})();
