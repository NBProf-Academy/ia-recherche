(() => {
  const base=()=>document.documentElement.dataset.basePath||'./';
  const t=(k,f='')=>window.NBProfI18n?.t(k,f)||f||k;
  const lang=()=>window.NBProfI18n?.getLanguage()||'fr';
  const $=s=>document.querySelector(s);
  let publications=[];
  let tools=[];
  let currentQuery='';
  let lastResults=[];
  let activeFilter='all';
  let requestSerial=0;

  const STOPWORDS=new Set(`a à au aux avec ce ces dans de des du elle en et eux il je la le les leur lui ma mais me même mes moi mon ne nos notre nous on ou par pas pour qu que quelle quelles quel quels qui sa sans se ses son sur ta te tes toi ton tu un une vos votre vous c est sont être the a an and or of in on for to with from by as is are was were be been this that these those into about using use study research article paper etude étude recherche article les des une dans pour sur par avec entre selon vers comme their its our your they them we you`.split(/\s+/));

  function normalize(value=''){
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,' ').trim();
  }
  function tokens(value=''){
    return [...new Set(normalize(value).split(/\s+/).filter(w=>w.length>2&&!STOPWORDS.has(w)))];
  }
  function textScore(query,text){
    const q=tokens(query); if(!q.length)return 0;
    const n=normalize(text); let matched=0;
    q.forEach(term=>{if(n.includes(term))matched+=1;});
    return Math.round((matched/q.length)*100);
  }
  function escapeHtml(value=''){
    return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function relevanceLabel(score){
    if(score>=78)return t('unified_relevance_high','Très pertinent');
    if(score>=52)return t('unified_relevance_medium','Pertinent');
    return t('unified_relevance_explore','À explorer');
  }
  function sourceLabel(item){
    if(item.kind==='nbprof')return t('unified_source_nbprof','Publication NBProf');
    if(item.kind==='tool')return t('unified_source_tool','Outil scientifique');
    return item.source||t('unified_source_academic','Article scientifique');
  }
  function abstractFor(pub){return pub.abstract?.[lang()]||pub.abstract?.fr||'';}
  function publicationHaystack(pub){return [pub.title,pub.subtitle,(pub.authors||[]).join(' '),pub.journal,(pub.keywords||[]).join(' '),abstractFor(pub)].join(' ');}

  async function loadCatalogs(){
    try{
      const [p,tls]=await Promise.all([
        fetch(`${base()}data/publications.json`,{cache:'no-store'}).then(r=>r.ok?r.json():[]),
        fetch(`${base()}data/tools.json`,{cache:'no-store'}).then(r=>r.ok?r.json():[])
      ]);
      publications=Array.isArray(p)?p:[];
      tools=Array.isArray(tls)?tls:[];
    }catch(err){console.warn('NBProf unified search catalogs',err);}
  }

  function localResults(query){
    const own=publications.map(pub=>{
      const score=textScore(query,publicationHaystack(pub));
      return {kind:'nbprof',score:Math.min(100,score+20),title:pub.title,subtitle:pub.subtitle||'',authors:pub.authors||[],year:pub.year,journal:pub.journal||'',url:pub.url||'',doi:pub.doi||'',abstract:abstractFor(pub),source:'NBProf',priority:pub.priority||100};
    }).filter(x=>x.score>=35).sort((a,b)=>(b.priority-a.priority)||(b.score-a.score));
    const toolResults=tools.map(tool=>{
      const desc=tool.description?.[lang()]||tool.description?.fr||'';
      const score=textScore(query,`${tool.name} ${desc} ${tool.category||''}`);
      return {kind:'tool',score:Math.min(91,score),title:tool.name,abstract:desc,url:tool.url,source:'NBProf Research Hub',year:null,authors:[],journal:''};
    }).filter(x=>x.score>=45).sort((a,b)=>b.score-a.score).slice(0,6);
    return [...own,...toolResults];
  }

  function s2Item(p,index,query){
    const authors=(p.authors||[]).map(a=>a.name).filter(Boolean);
    const doi=p.externalIds?.DOI||'';
    const rawScore=textScore(query,`${p.title||''} ${p.abstract||''} ${authors.join(' ')} ${p.venue||''}`);
    const rankBonus=Math.max(0,22-index*2);
    const score=Math.max(38,Math.min(96,Math.round(rawScore*.72+rankBonus+18)));
    return {kind:'academic',score,title:p.title||t('unified_untitled','Sans titre'),authors,year:p.year||null,journal:p.venue||'',url:p.url||(doi?`https://doi.org/${doi}`:''),doi,abstract:p.abstract||'',source:'Semantic Scholar',citationCount:p.citationCount||0,pdf:p.openAccessPdf?.url||''};
  }

  async function semanticScholar(query,signal){
    const params=new URLSearchParams({query,limit:'8',fields:'title,authors,year,abstract,url,externalIds,citationCount,openAccessPdf,venue'});
    const r=await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`,{signal,headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error(`Semantic Scholar ${r.status}`);
    const data=await r.json();
    return (data.data||[]).map((p,i)=>s2Item(p,i,query));
  }

  function crossrefItem(p,index,query){
    const title=Array.isArray(p.title)?p.title[0]||'':p.title||'';
    const authors=(p.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(' ')).filter(Boolean);
    const journal=Array.isArray(p['container-title'])?p['container-title'][0]||'':p['container-title']||'';
    const year=p.published?.['date-parts']?.[0]?.[0]||p.issued?.['date-parts']?.[0]?.[0]||null;
    const doi=p.DOI||'';
    const rawScore=textScore(query,`${title} ${authors.join(' ')} ${journal}`);
    const rankBonus=Math.max(0,20-index*2);
    const score=Math.max(35,Math.min(91,Math.round(rawScore*.68+rankBonus+16)));
    return {kind:'academic',score,title:title||t('unified_untitled','Sans titre'),authors,year,journal,url:doi?`https://doi.org/${doi}`:(p.URL||''),doi,abstract:'',source:'Crossref',citationCount:p['is-referenced-by-count']||0,pdf:''};
  }

  async function crossref(query,signal){
    const params=new URLSearchParams({'query.bibliographic':query,rows:'8',select:'DOI,title,author,published,issued,container-title,URL,is-referenced-by-count'});
    const r=await fetch(`https://api.crossref.org/works?${params}`,{signal,headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error(`Crossref ${r.status}`);
    const data=await r.json();
    return (data.message?.items||[]).map((p,i)=>crossrefItem(p,i,query));
  }

  function dedupe(items){
    const seen=new Set();
    return items.filter(item=>{
      const key=item.doi?`doi:${normalize(item.doi)}`:`title:${normalize(item.title).slice(0,140)}`;
      if(!key||seen.has(key))return false; seen.add(key); return true;
    });
  }

  function metaText(item){
    const bits=[];
    if(item.authors?.length)bits.push(item.authors.slice(0,3).join(', ')+(item.authors.length>3?' et al.':''));
    if(item.year)bits.push(item.year);
    if(item.journal)bits.push(item.journal);
    return bits.join(' · ');
  }

  function card(item){
    const source=escapeHtml(sourceLabel(item));
    const title=escapeHtml(item.title||'');
    const meta=escapeHtml(metaText(item));
    const abstract=escapeHtml((item.abstract||'').trim());
    const url=escapeHtml(item.url||'');
    const pdf=escapeHtml(item.pdf||'');
    const score=Math.max(0,Math.min(100,Math.round(item.score||0)));
    return `<article class="unified-result-card unified-result-card--${item.kind}">
      <div class="unified-result-card__top">
        <span class="unified-source-badge">${source}</span>
        <span class="unified-relevance" title="${escapeHtml(t('unified_relevance_explanation','Estimation basée sur la correspondance entre votre requête et les métadonnées disponibles.'))}">${escapeHtml(relevanceLabel(score))}</span>
      </div>
      <h3>${title}</h3>
      ${meta?`<div class="unified-meta">${meta}</div>`:''}
      ${abstract?`<p>${abstract.length>420?abstract.slice(0,417)+'…':abstract}</p>`:''}
      <div class="unified-result-actions">
        ${url?`<a class="secondary-button" href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('unified_open','Ouvrir'))} ↗</a>`:''}
        ${pdf?`<a class="secondary-button" href="${pdf}" target="_blank" rel="noopener noreferrer">PDF ↗</a>`:''}
        ${item.doi?`<span class="unified-doi">DOI: ${escapeHtml(item.doi)}</span>`:''}
      </div>
    </article>`;
  }

  function render(results,{loadingExternal=false,errorExternal=false}={}){
    const section=$('#unifiedSearchResults'); const list=$('#unifiedResultsList'); const status=$('#unifiedSearchStatus');
    if(!section||!list||!status)return;
    section.hidden=false;
    const filtered=activeFilter==='all'?results:results.filter(x=>x.kind===activeFilter);
    list.innerHTML=filtered.length?filtered.map(card).join(''):`<div class="unified-empty">${escapeHtml(t('unified_no_results','Aucun résultat pertinent pour cette recherche.'))}</div>`;
    if(loadingExternal) status.innerHTML=`<span class="unified-spinner" aria-hidden="true"></span>${escapeHtml(t('unified_searching_academic','Recherche dans la littérature scientifique…'))}`;
    else if(errorExternal) status.textContent=t('unified_external_unavailable','Les résultats NBProf sont disponibles. La recherche académique externe est temporairement indisponible.');
    else status.textContent=t('unified_results_notice','Les publications NBProf sont prioritaires, puis les résultats académiques sont classés selon leur pertinence estimée.');
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderCounts(results){
    const counts={all:results.length,nbprof:0,academic:0,tool:0};
    results.forEach(x=>{if(counts[x.kind]!==undefined)counts[x.kind]+=1;});
    document.querySelectorAll('[data-unified-filter]').forEach(btn=>{
      const key=btn.dataset.unifiedFilter; const count=counts[key]||0;
      const countEl=btn.querySelector('[data-count]'); if(countEl)countEl.textContent=count;
      btn.classList.toggle('active',key===activeFilter);
    });
  }

  async function search(query){
    const q=String(query||'').trim();
    if(q.length<3){
      const input=$('#hubSearch'); input?.focus();
      const status=$('#unifiedSearchStatus');
      const section=$('#unifiedSearchResults');
      if(section&&status){section.hidden=false;status.textContent=t('unified_min_chars','Saisissez au moins 3 caractères pour lancer la recherche.');$('#unifiedResultsList').innerHTML='';}
      return;
    }
    currentQuery=q; activeFilter='all'; const serial=++requestSerial;
    if(!publications.length&&!tools.length)await loadCatalogs();
    const local=localResults(q);
    lastResults=local;
    renderCounts(lastResults);
    render(lastResults,{loadingExternal:true});
    window.plausible?.('unified_search',{props:{language:lang(),query_length:String(q.length)}});

    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8500);
    let external=[]; let externalError=false;
    try{
      try{ external=await semanticScholar(q,controller.signal); }
      catch(err){ console.warn('Semantic Scholar fallback',err); external=await crossref(q,controller.signal); }
    }catch(err){ console.warn('Academic search unavailable',err); externalError=true; }
    finally{clearTimeout(timer);}
    if(serial!==requestSerial)return;
    lastResults=dedupe([...local,...external]).sort((a,b)=>{
      const kindWeight={nbprof:3,academic:2,tool:1};
      if((kindWeight[b.kind]||0)!==(kindWeight[a.kind]||0))return (kindWeight[b.kind]||0)-(kindWeight[a.kind]||0);
      return (b.score||0)-(a.score||0);
    });
    renderCounts(lastResults);
    render(lastResults,{errorExternal:externalError});
  }

  function bind(){
    document.querySelectorAll('[data-unified-filter]').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.unifiedFilter||'all';renderCounts(lastResults);render(lastResults);}));
    window.addEventListener('nbprof:languagechange',()=>{if(lastResults.length){renderCounts(lastResults);render(lastResults);}});
  }
  async function init(){bind();await loadCatalogs();}
  window.NBProfUnifiedSearch={search};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
