(() => {
  const PROJECTS_KEY = 'nbprof-research-projects-v1';
  const DIAGNOSTICS_KEY = 'nbprof-research-diagnostics-v1';
  const $ = selector => document.querySelector(selector);
  const t = (key, fallback = '') => window.NBProfI18n?.t(key, fallback) || fallback || key;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  const SECTIONS = [
    { id:'framing', icon:'🎯', title:'diagnostic_section_framing', questions:[
      ['topic','diagnostic_q_topic'], ['problem','diagnostic_q_problem']
    ]},
    { id:'literature', icon:'📚', title:'diagnostic_section_literature', questions:[
      ['search','diagnostic_q_search'], ['synthesis','diagnostic_q_synthesis']
    ]},
    { id:'method', icon:'🧪', title:'diagnostic_section_method', questions:[
      ['design','diagnostic_q_design'], ['sample','diagnostic_q_sample']
    ]},
    { id:'data', icon:'📊', title:'diagnostic_section_data', questions:[
      ['collection','diagnostic_q_collection'], ['analysis','diagnostic_q_analysis']
    ]},
    { id:'writing', icon:'✍️', title:'diagnostic_section_writing', questions:[
      ['structure','diagnostic_q_structure'], ['references','diagnostic_q_references']
    ]},
    { id:'finalization', icon:'🎤', title:'diagnostic_section_finalization', questions:[
      ['validation','diagnostic_q_validation'], ['defense','diagnostic_q_defense']
    ]}
  ];

  const ACTIONS = {
    framing: ['diagnostic_action_framing_1','diagnostic_action_framing_2'],
    literature: ['diagnostic_action_literature_1','diagnostic_action_literature_2'],
    method: ['diagnostic_action_method_1','diagnostic_action_method_2'],
    data: ['diagnostic_action_data_1','diagnostic_action_data_2'],
    writing: ['diagnostic_action_writing_1','diagnostic_action_writing_2'],
    finalization: ['diagnostic_action_finalization_1','diagnostic_action_finalization_2']
  };

  const TOOLS = {
    framing: {icon:'🔎', title:'diagnostic_tool_exploration', href:id=>`exploration.html?project=${encodeURIComponent(id)}`},
    literature: {icon:'📚', title:'diagnostic_tool_literature', href:id=>`literature.html?project=${encodeURIComponent(id)}`},
    method: {icon:'🧭', title:'diagnostic_tool_assistant', href:()=>`assistant.html`},
    data: {icon:'📊', title:'diagnostic_tool_catalog', href:()=>`../index.html#recommendedTools`},
    writing: {icon:'✍️', title:'diagnostic_tool_catalog', href:()=>`../index.html#recommendedTools`},
    finalization: {icon:'🎤', title:'diagnostic_tool_catalog', href:()=>`../index.html#recommendedTools`}
  };

  let projects = [];
  let diagnostics = {};

  function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
  function loadData(){
    projects = readJson(PROJECTS_KEY, []).filter(p => p && p.id && p.name && !p.archived);
    const raw = readJson(DIAGNOSTICS_KEY, {});
    diagnostics = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }
  function saveDiagnostics(){ localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(diagnostics)); }
  function selectedProjectId(){ return $('#diagnosticProject')?.value || ''; }
  function selectedDiagnostic(){ return diagnostics[selectedProjectId()] || null; }

  function renderProjectOptions(){
    const select = $('#diagnosticProject');
    const noProjects = $('#diagnosticNoProjects');
    const form = $('#diagnosticForm');
    const setup = $('#diagnosticSetup');
    if(!projects.length){
      select.innerHTML = `<option value="">${escapeHtml(t('diagnostic_no_project_option','Aucun projet disponible'))}</option>`;
      noProjects.hidden = false; form.hidden = true; setup.hidden = true; $('#diagnosticResults').hidden = true; return;
    }
    noProjects.hidden = true; form.hidden = false; setup.hidden = false;
    select.innerHTML = projects.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    const requested = new URLSearchParams(location.search).get('project');
    if(requested && projects.some(p=>p.id===requested)) select.value = requested;
  }

  function answerOptions(questionId){
    return `<div class="diagnostic-options" role="radiogroup">
      <label><input type="radio" name="${questionId}" value="0" required><span data-score="0">${escapeHtml(t('diagnostic_answer_no','Pas encore'))}</span></label>
      <label><input type="radio" name="${questionId}" value="1"><span data-score="1">${escapeHtml(t('diagnostic_answer_partial','En partie'))}</span></label>
      <label><input type="radio" name="${questionId}" value="2"><span data-score="2">${escapeHtml(t('diagnostic_answer_yes','Oui, clairement'))}</span></label>
    </div>`;
  }

  function renderQuestions(){
    $('#diagnosticQuestions').innerHTML = SECTIONS.map((section, index)=>`<fieldset class="diagnostic-section" data-section="${section.id}"><legend><span class="diagnostic-section__number">${String(index+1).padStart(2,'0')}</span><span aria-hidden="true">${section.icon}</span><strong>${escapeHtml(t(section.title))}</strong></legend>${section.questions.map(([id,key])=>`<div class="diagnostic-question"><p>${escapeHtml(t(key))}</p>${answerOptions(id)}</div>`).join('')}</fieldset>`).join('');
  }

  function collectAnswers(){
    const answers = {};
    SECTIONS.forEach(section=>section.questions.forEach(([id])=>{ const input=document.querySelector(`input[name="${id}"]:checked`); answers[id]=input ? Number(input.value) : null; }));
    return answers;
  }

  function calculate(answers){
    const sectionScores = {};
    let total=0, max=0;
    SECTIONS.forEach(section=>{
      let value=0, sectionMax=section.questions.length*2;
      section.questions.forEach(([id])=>{ value += Number(answers[id] ?? 0); });
      sectionScores[section.id] = Math.round(value/sectionMax*100);
      total += value; max += sectionMax;
    });
    return {score:Math.round(total/max*100), sectionScores};
  }

  function level(score){
    if(score < 35) return ['diagnostic_level_start','diagnostic_summary_start'];
    if(score < 65) return ['diagnostic_level_building','diagnostic_summary_building'];
    if(score < 85) return ['diagnostic_level_advanced','diagnostic_summary_advanced'];
    return ['diagnostic_level_ready','diagnostic_summary_ready'];
  }

  function weakestSections(sectionScores){
    return Object.entries(sectionScores).sort((a,b)=>a[1]-b[1]);
  }

  function priorityKeys(sectionScores){
    const ranked=weakestSections(sectionScores);
    const out=[];
    ranked.forEach(([section,score])=>{
      if(score<100) ACTIONS[section].forEach(key=>{ if(out.length<5) out.push(key); });
    });
    return out.length ? out.slice(0,5) : ['diagnostic_action_maintain'];
  }

  function toolSections(sectionScores){
    const ranked=weakestSections(sectionScores).filter(([,score])=>score<85).slice(0,3).map(([id])=>id);
    return ranked.length ? ranked : ['finalization'];
  }

  function formatDate(value){
    const date=new Date(value); if(Number.isNaN(date.getTime())) return '';
    const language=window.NBProfI18n?.getLanguage?.() || 'fr';
    try{return new Intl.DateTimeFormat(language,{dateStyle:'medium',timeStyle:'short'}).format(date);}catch{return date.toLocaleString();}
  }

  function renderResults(record){
    if(!record) { $('#diagnosticResults').hidden=true; return; }
    const [levelKey, summaryKey] = level(record.score);
    $('#diagnosticScore').textContent = `${record.score}%`;
    $('#diagnosticScoreRing').style.setProperty('--diagnostic-score', `${record.score*3.6}deg`);
    $('#diagnosticLevel').textContent = t(levelKey);
    $('#diagnosticSummary').textContent = t(summaryKey);
    $('#diagnosticSavedAt').textContent = `${t('diagnostic_saved_at','Dernière analyse')} · ${formatDate(record.updatedAt)}`;
    $('#diagnosticPriorities').innerHTML = priorityKeys(record.sectionScores).map(key=>`<li>${escapeHtml(t(key))}</li>`).join('');
    $('#diagnosticChecklist').innerHTML = SECTIONS.map(section=>{
      const score=record.sectionScores[section.id] ?? 0;
      const state=score>=85?'done':score>=50?'partial':'todo';
      return `<div class="diagnostic-check-item diagnostic-check-item--${state}"><span>${state==='done'?'✓':state==='partial'?'◐':'○'}</span><div><strong>${escapeHtml(t(section.title))}</strong><small>${score}% · ${escapeHtml(t(`diagnostic_state_${state}`))}</small></div></div>`;
    }).join('');
    const projectId=selectedProjectId();
    $('#diagnosticTools').innerHTML = toolSections(record.sectionScores).map(section=>{const tool=TOOLS[section];return `<a href="${tool.href(projectId)}" class="diagnostic-tool-card"><span>${tool.icon}</span><strong>${escapeHtml(t(tool.title))}</strong><small>${escapeHtml(t('diagnostic_open_resource','Ouvrir la ressource'))} →</small></a>`;}).join('');
    $('#diagnosticResults').hidden=false;
    $('#diagnosticResults').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function fillForm(record){
    document.querySelectorAll('#diagnosticForm input[type="radio"]').forEach(input=>input.checked=false);
    if(!record) return;
    $('#diagnosticWorkType').value = record.workType || 'memoire';
    Object.entries(record.answers||{}).forEach(([id,value])=>{ const input=document.querySelector(`input[name="${CSS.escape(id)}"][value="${value}"]`); if(input) input.checked=true; });
  }

  function loadSelected(){ const record=selectedDiagnostic(); fillForm(record); renderResults(record); }
  function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400);}

  function submit(event){
    event.preventDefault();
    const answers=collectAnswers();
    if(Object.values(answers).some(value=>value===null)){ toast(t('diagnostic_complete_all','Répondez à toutes les questions.')); return; }
    const result=calculate(answers);
    const projectId=selectedProjectId();
    const record={projectId,workType:$('#diagnosticWorkType').value,answers,...result,updatedAt:new Date().toISOString()};
    diagnostics[projectId]=record; saveDiagnostics(); renderResults(record);
    window.plausible?.('Diagnostic completed',{props:{score_band:record.score<35?'start':record.score<65?'building':record.score<85?'advanced':'ready'}});
    toast(t('diagnostic_saved','Diagnostic enregistré localement.'));
  }

  function reset(){
    if(!selectedProjectId()) return;
    document.querySelectorAll('#diagnosticForm input[type="radio"]').forEach(input=>input.checked=false);
    $('#diagnosticResults').hidden=true;
    toast(t('diagnostic_reset_done','Réponses réinitialisées.'));
  }

  function initMobileMenu(){
    const toggle=$('#mobileMenuToggle'), menu=$('#mobileNavMenu'); if(!toggle||!menu)return;
    toggle.addEventListener('click',e=>{e.stopPropagation();const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));menu.hidden=open;});
    menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');}));
    document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!toggle.contains(e.target)){menu.hidden=true;toggle.setAttribute('aria-expanded','false');}});
  }

  function renderAll(){ renderProjectOptions(); renderQuestions(); loadSelected(); }
  function bind(){
    $('#diagnosticProject')?.addEventListener('change',loadSelected);
    $('#diagnosticForm')?.addEventListener('submit',submit);
    $('#diagnosticReset')?.addEventListener('click',reset);
    window.addEventListener('nbprof:languagechange',renderAll);
    window.addEventListener('storage',event=>{if([PROJECTS_KEY,DIAGNOSTICS_KEY].includes(event.key)){loadData();renderAll();}});
  }
  function init(){ loadData(); initMobileMenu(); bind(); renderAll(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();