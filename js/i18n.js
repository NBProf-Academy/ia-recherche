(() => {
  const languages = {fr:{label:'Français',dir:'ltr'},en:{label:'English',dir:'ltr'},ar:{label:'العربية',dir:'rtl'}};
  let current = 'fr';
  let translations = {};

  function getBasePath(){ return document.documentElement.dataset.basePath || './'; }
  async function load(code){
    const chosen = languages[code] ? code : 'fr';
    const response = await fetch(`${getBasePath()}lang/${chosen}.json`, {cache:'no-store'});
    if(!response.ok) throw new Error(`Language ${chosen} unavailable`);
    translations = await response.json();
    current = chosen;
    document.documentElement.lang = chosen;
    document.documentElement.dir = languages[chosen].dir;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v=translations[el.dataset.i18n]; if(v!==undefined) el.textContent=v; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const v=translations[el.dataset.i18nPlaceholder]; if(v!==undefined) el.placeholder=v; });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => { const v=translations[el.dataset.i18nAriaLabel]; if(v!==undefined) el.setAttribute('aria-label',v); });
    const label=document.getElementById('currentLanguageLabel'); if(label) label.textContent=languages[chosen].label;
    document.querySelectorAll('.language-option').forEach(el => el.classList.toggle('active',el.dataset.lang===chosen));
    localStorage.setItem('nbprof-language',chosen);
    window.dispatchEvent(new CustomEvent('nbprof:languagechange',{detail:{language:chosen,translations}}));
    return translations;
  }
  function t(key,fallback=''){ return translations[key] ?? fallback ?? key; }
  function getLanguage(){ return current; }
  function closeMenu(){ const m=document.getElementById('languageMenu'),b=document.getElementById('languageButton'); if(m)m.hidden=true; if(b)b.setAttribute('aria-expanded','false'); }
  function bindMenu(){
    const menu=document.getElementById('languageMenu'), button=document.getElementById('languageButton');
    if(!menu||!button)return;
    button.addEventListener('click',e=>{e.stopPropagation();const open=button.getAttribute('aria-expanded')==='true';menu.hidden=open;button.setAttribute('aria-expanded',String(!open));});
    document.querySelectorAll('.language-option').forEach(opt=>opt.addEventListener('click',()=>load(opt.dataset.lang).finally(closeMenu)));
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!button.contains(e.target))closeMenu();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  }
  async function init(){
    bindMenu();
    const saved=localStorage.getItem('nbprof-language');
    const browser=(navigator.language||'fr').slice(0,2).toLowerCase();
    const initial=languages[saved]?saved:(languages[browser]?browser:'fr');
    try{await load(initial);}catch(err){console.error(err); if(initial!=='fr') await load('fr');}
  }
  window.NBProfI18n={init,load,t,getLanguage};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
