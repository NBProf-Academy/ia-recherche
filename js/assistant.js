(() => {
  const STORAGE_KEY = 'nbprof-research-projects-v1';
  const STAGES = ['exploration', 'literature', 'method', 'data', 'writing', 'defense'];
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const t = (key, fallback = '') => window.NBProfI18n?.t(key, fallback) || fallback || key;
  const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = () => new Date().toISOString();
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let step = 1;
  let generatedPlan = { milestones: [], tasks: [] };

  const TASK_KEYS = {
    exploration: ['assistant_task_exploration_1','assistant_task_exploration_2','assistant_task_exploration_3'],
    literature: ['assistant_task_literature_1','assistant_task_literature_2','assistant_task_literature_3'],
    method: ['assistant_task_method_1','assistant_task_method_2','assistant_task_method_3'],
    data: ['assistant_task_data_1','assistant_task_data_2','assistant_task_data_3'],
    writing: ['assistant_task_writing_1','assistant_task_writing_2','assistant_task_writing_3'],
    defense: ['assistant_task_defense_1','assistant_task_defense_2','assistant_task_defense_3']
  };

  const MILESTONE_KEYS = {
    exploration: 'assistant_milestone_exploration',
    literature: 'assistant_milestone_literature',
    method: 'assistant_milestone_method',
    data: 'assistant_milestone_data',
    writing: 'assistant_milestone_writing',
    defense: 'assistant_milestone_defense'
  };

  const PACE_DAYS = {
    light: [10, 24, 42, 60, 80],
    standard: [7, 14, 28, 42, 60],
    intensive: [3, 7, 14, 21, 30]
  };

  function dateKeyFromOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDueDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    const language = window.NBProfI18n?.getLanguage?.() || document.documentElement.lang || 'fr';
    try { return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date); }
    catch { return date.toLocaleDateString(); }
  }

  function readProjects() {
    try {
      const projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(projects) ? projects : [];
    } catch { return []; }
  }

  function collect() {
    return {
      name: $('#assistantProjectName').value.trim(),
      idea: $('#assistantIdea').value.trim(),
      goal: $('#assistantGoal').value.trim(),
      output: $('#assistantOutput').value,
      stage: $('#assistantStage').value,
      pace: $('#assistantPace').value
    };
  }

  function outputLabel(value) { return t(`assistant_output_${value}`, value); }
  function stageLabel(value) { return t(`stage_${value}`, value); }
  function priorityLabel(value) { return t(`priority_${value}`, value); }

  function buildPlan() {
    const data = collect();
    const start = Math.max(0, STAGES.indexOf(data.stage));
    const activeStages = STAGES.slice(start);
    const milestones = activeStages.map(stageName => ({ id: id(), text: t(MILESTONE_KEYS[stageName], stageLabel(stageName)) }));
    const selectedStages = activeStages.slice(0, 2);
    const taskTexts = [];
    selectedStages.forEach((stageName, stageIndex) => {
      const keys = TASK_KEYS[stageName] || [];
      keys.slice(0, stageIndex === 0 ? 3 : 2).forEach(key => taskTexts.push(t(key, key)));
    });
    const offsets = PACE_DAYS[data.pace] || PACE_DAYS.standard;
    const priorities = ['high', 'medium', 'medium', 'medium', 'low'];
    const tasks = taskTexts.slice(0, 5).map((text, index) => ({ id: id(), text, done: false, priority: priorities[index] || 'medium', dueDate: dateKeyFromOffset(offsets[index] || offsets[offsets.length - 1]) }));
    generatedPlan = { milestones, tasks };
    return generatedPlan;
  }

  function renderPlan() {
    buildPlan();
    $('#assistantMilestonesPreview').innerHTML = generatedPlan.milestones.map(item => `<li>${escapeHtml(item.text)}</li>`).join('');
    $('#assistantTasksPreview').innerHTML = generatedPlan.tasks.map(task => `<div class="assistant-preview-task"><div><strong>${escapeHtml(task.text)}</strong><span class="task-tags"><span class="priority-badge priority-${task.priority}">${escapeHtml(priorityLabel(task.priority))}</span><span class="due-badge">📅 ${escapeHtml(formatDueDate(task.dueDate))}</span></span></div></div>`).join('');
  }

  function renderSummary() {
    const data = collect();
    const summary = [
      ['assistant_summary_project', data.name],
      ['assistant_summary_goal', data.goal],
      ['assistant_summary_output', outputLabel(data.output)],
      ['assistant_summary_stage', stageLabel(data.stage)],
      ['assistant_summary_milestones', String(generatedPlan.milestones.length)],
      ['assistant_summary_tasks', String(generatedPlan.tasks.length)]
    ];
    $('#assistantSummary').innerHTML = summary.map(([key, value]) => `<div class="assistant-summary-row"><span>${escapeHtml(t(key, key))}</span><strong>${escapeHtml(value || '—')}</strong></div>`).join('');
  }

  function validateStep(current) {
    const fields = current === 1 ? [$('#assistantProjectName'), $('#assistantIdea')] : current === 2 ? [$('#assistantGoal')] : current === 4 ? [$('#assistantConfirm')] : [];
    for (const field of fields) {
      if (!field.checkValidity()) { field.reportValidity(); return false; }
    }
    return true;
  }

  function showStep(nextStep) {
    step = Math.min(4, Math.max(1, nextStep));
    $$('.assistant-screen').forEach(screen => {
      const active = Number(screen.dataset.step) === step;
      screen.hidden = !active;
      screen.classList.toggle('is-active', active);
    });
    $$('.assistant-step').forEach(button => {
      const n = Number(button.dataset.stepGo);
      button.classList.toggle('is-active', n === step);
      button.classList.toggle('is-complete', n < step);
    });
    $('#assistantPrevious').hidden = step === 1;
    $('#assistantNext').hidden = step === 4;
    $('#assistantCreate').hidden = step !== 4;
    if (step === 3) renderPlan();
    if (step === 4) { if (!generatedPlan.tasks.length) buildPlan(); renderSummary(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function createProject() {
    if (!validateStep(4)) return false;
    const data = collect();
    if (!generatedPlan.tasks.length) buildPlan();
    const createdAt = nowIso();
    const noteParts = [
      `${t('assistant_notes_idea')}: ${data.idea}`,
      `${t('assistant_notes_output')}: ${outputLabel(data.output)}`,
      t('assistant_notes_generated')
    ];
    const project = {
      id: id(),
      name: data.name,
      goal: data.goal,
      stage: data.stage,
      milestones: generatedPlan.milestones,
      tasks: generatedPlan.tasks,
      notes: noteParts.join('\n'),
      createdAt,
      updatedAt: createdAt
    };
    const projects = readProjects();
    projects.unshift(project);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    $('.assistant-shell').hidden = true;
    $('#assistantSuccess').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  function bind() {
    $('#assistantNext').addEventListener('click', () => {
      if (!validateStep(step)) return;
      showStep(step + 1);
    });
    $('#assistantPrevious').addEventListener('click', () => showStep(step - 1));
    $('#assistantForm').addEventListener('submit', event => { event.preventDefault(); createProject(); });
    $$('.assistant-step').forEach(button => button.addEventListener('click', () => {
      const target = Number(button.dataset.stepGo);
      if (target <= step || (target === step + 1 && validateStep(step))) showStep(target);
    }));
    window.addEventListener('nbprof:languagechange', () => {
      if (step >= 3) renderPlan();
      if (step === 4) renderSummary();
    });
  }

  function init() { bind(); showStep(1); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
