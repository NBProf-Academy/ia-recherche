(() => {
  const base=()=>document.documentElement.dataset.basePath||'../';
  const t=(k,f='')=>window.NBProfI18n?.t(k,f)||f||k;
  const lang=()=>window.NBProfI18n?.getLanguage()||'fr';
  let data=null;
  function selected(){return new URLSearchParams(location.search).get('parcours')||'articles';}
  function localized(value){return value?.[lang()]??value?.fr??value??'';}
  function render(){
    const root=document.getElementById('journeyContent'); if(!root||!data)return;
    const item=data[selected()];
    if(!item){root.innerHTML=`<section class="journey-hero"><h1>${t('journey_not_found','Parcours introuvable')}</h1></section>`;return;}
    document.title=`${localized(item.title)} — NBProf Research Hub`;
    root.innerHTML=`
      <a class="back-link" href="../index.html">← ${t('back_home','Retour à l’accueil')}</a>
      <section class="journey-hero"><div class="journey-icon" aria-hidden="true">${item.icon}</div><h1>${localized(item.title)}</h1><p>${localized(item.description)}</p></section>
      <section class="journey-section"><h2>${t('journey_steps','Étapes recommandées')}</h2><ol class="steps-list">${localized(item.steps).map(s=>`<li>${s}</li>`).join('')}</ol></section>
      <section class="journey-section"><h2>${t('journey_tools','Outils suggérés')}</h2><div class="tool-chips">${item.tools.map(x=>`<span class="tool-chip">${x}</span>`).join('')}</div></section>
      <section class="journey-section"><h2>${t('journey_tips','Points de vigilance')}</h2><ul class="tips-list">${localized(item.tips).map(s=>`<li>${s}</li>`).join('')}</ul><div class="method-note">${t('method_note','')}</div></section>`;
  }
  async function load(){try{const r=await fetch(`${base()}data/journeys.json`,{cache:'no-store'});if(!r.ok)throw new Error('journeys');data=await r.json();render();}catch(e){console.error(e);document.getElementById('journeyContent').textContent=t('load_error','Erreur de chargement');}}
  window.addEventListener('nbprof:languagechange',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
