(() => {
  const STORAGE_KEY = 'nbprof-research-projects-v1';
  const STAGES = ['exploration', 'literature', 'method', 'data', 'writing', 'defense'];
  const PRIORITIES = ['low', 'medium', 'high'];
  const $ = selector => document.querySelector(selector);
  const t = (key, fallback = '') => window.NBProfI18n?.t(key, fallback) || fallback || key;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function template(key, fallback, values = {}) {
    let text = t(key, fallback);
    Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
    return text;
  }

  function validDateKey(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value : '';
  }

  function normalizeTask(item) {
    return {
      text: typeof item?.text === 'string' ? item.text.trim().slice(0, 160) : '',
      done: Boolean(item?.done),
      priority: PRIORITIES.includes(item?.priority) ? item.priority : 'medium',
      dueDate: validDateKey(item?.dueDate)
    };
  }

  function normalizeProject(project) {
    return {
      id: typeof project?.id === 'string' ? project.id : '',
      name: typeof project?.name === 'string' ? project.name.trim().slice(0, 120) : '',
      goal: typeof project?.goal === 'string' ? project.goal.trim().slice(0, 400) : '',
      stage: STAGES.includes(project?.stage) ? project.stage : 'exploration',
      tasks: Array.isArray(project?.tasks) ? project.tasks.map(normalizeTask).filter(task => task.text) : [],
      createdAt: typeof project?.createdAt === 'string' && !Number.isNaN(Date.parse(project.createdAt)) ? project.createdAt : '',
      updatedAt: typeof project?.updatedAt === 'string' && !Number.isNaN(Date.parse(project.updatedAt)) ? project.updatedAt : ''
    };
  }

  function readProjects() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeProject).filter(project => project.name) : [];
    } catch (error) {
      console.error('NBProf report storage error:', error);
      return [];
    }
  }

  function dateFromKey(value) {
    if (!validDateKey(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function daysUntil(value) {
    const due = dateFromKey(value);
    const today = dateFromKey(localDateKey());
    return due && today ? Math.round((due - today) / 86400000) : null;
  }

  function taskState(task) {
    if (task.done) return 'complete';
    const remaining = daysUntil(task.dueDate);
    if (remaining === null) return 'undated';
    if (remaining < 0) return 'overdue';
    if (remaining <= 7) return 'soon';
    return 'scheduled';
  }

  function progress(project) {
    const total = project.tasks.length;
    const done = project.tasks.filter(task => task.done).length;
    return { total, done, percent: total ? Math.round(done / total * 100) : 0 };
  }

  function nextDeadline(project) {
    const dates = project.tasks.filter(task => !task.done && task.dueDate).map(task => dateFromKey(task.dueDate)?.getTime()).filter(Number.isFinite);
    return dates.length ? Math.min(...dates) : null;
  }

  function language() { return window.NBProfI18n?.getLanguage?.() || document.documentElement.lang || 'fr'; }
  function stageLabel(stage) { return t(`stage_${stage}`, stage); }
  function priorityLabel(priority) { return t(`priority_${priority}`, priority); }

  function formatDate(value, withTime = false) {
    if (!value) return '—';
    const date = withTime ? new Date(value) : dateFromKey(value);
    if (!date || Number.isNaN(date.getTime())) return '—';
    try { return new Intl.DateTimeFormat(language(), withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date); }
    catch { return withTime ? date.toLocaleString() : date.toLocaleDateString(); }
  }

  function metrics(projects) {
    const tasks = projects.flatMap(project => project.tasks.map(task => ({ ...task, project })));
    const done = tasks.filter(task => task.done).length;
    const pending = tasks.filter(task => !task.done);
    return {
      projects: projects.length,
      tasks,
      done,
      total: tasks.length,
      progress: tasks.length ? Math.round(done / tasks.length * 100) : 0,
      overdue: pending.filter(task => taskState(task) === 'overdue').length,
      dueSoon: pending.filter(task => taskState(task) === 'soon').length,
      high: pending.filter(task => task.priority === 'high').length
    };
  }

  function reportStatus(data) {
    if (data.overdue > 0) return { type: 'attention', label: t('report_status_attention', 'Attention requise') };
    if (data.dueSoon > 0 || data.high > 0) return { type: 'vigilance', label: t('report_status_vigilance', 'Vigilance') };
    return { type: 'good', label: t('report_status_good', 'Situation maîtrisée') };
  }

  function executiveText(data) {
    const values = { projects: data.projects, progress: data.progress, overdue: data.overdue, dueSoon: data.dueSoon, high: data.high };
    if (!data.projects) return t('report_summary_none', 'Aucun projet n’est actuellement enregistré.');
    if (data.overdue > 0) return template('report_summary_attention', '{projects} projet(s) sont suivis avec une progression globale de {progress} %. {overdue} tâche(s) sont en retard et nécessitent une attention prioritaire. {dueSoon} échéance(s) arrivent dans les 7 prochains jours.', values);
    if (data.dueSoon > 0 || data.high > 0) return template('report_summary_vigilance', '{projects} projet(s) sont suivis avec une progression globale de {progress} %. Aucune tâche n’est en retard, mais {dueSoon} échéance(s) proche(s) et {high} priorité(s) élevée(s) méritent une vigilance particulière.', values);
    return template('report_summary_good', '{projects} projet(s) sont suivis avec une progression globale de {progress} %. Aucun retard ni point critique immédiat n’est détecté dans les tâches enregistrées.', values);
  }

  function renderDate() {
    const now = new Date();
    let formatted;
    try { formatted = new Intl.DateTimeFormat(language(), { dateStyle: 'long', timeStyle: 'short' }).format(now); }
    catch { formatted = now.toLocaleString(); }
    $('#reportDate').textContent = `${t('report_generated', 'Rapport généré le')} ${formatted}`;
  }

  function kpi(value, label, type) {
    return `<div class="report-kpi report-kpi--${type}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function renderKpis(data) {
    $('#reportKpis').innerHTML = [
      kpi(data.projects, t('report_projects', 'Projets actifs'), 'projects'),
      kpi(`${data.progress}%`, t('report_progress', 'Progression globale'), 'progress'),
      kpi(data.done, t('report_completed', 'Tâches terminées'), 'completed'),
      kpi(data.overdue, t('report_overdue', 'Tâches en retard'), 'overdue'),
      kpi(data.dueSoon, t('report_due_soon', 'Échéances proches'), 'soon'),
      kpi(data.high, t('report_high_priority', 'Priorités élevées'), 'high')
    ].join('');
  }

  function renderProjects(projects) {
    $('#reportProjects').innerHTML = projects.map(project => {
      const p = progress(project);
      const deadline = nextDeadline(project);
      const deadlineText = deadline ? formatDate(localDateKey(new Date(deadline))) : t('report_no_deadline', 'Sans échéance');
      const ratio = template('report_tasks_ratio', '{done}/{total} terminées', { done: p.done, total: p.total });
      return `<tr><td><strong>${escapeHtml(project.name)}</strong>${project.goal ? `<small>${escapeHtml(project.goal)}</small>` : ''}</td><td>${escapeHtml(stageLabel(project.stage))}</td><td><span class="report-progress-value">${p.percent}%</span><div class="report-progress-track"><i style="width:${p.percent}%"></i></div></td><td>${escapeHtml(ratio)}</td><td>${escapeHtml(deadlineText)}</td><td>${escapeHtml(formatDate(project.updatedAt, true))}</td></tr>`;
    }).join('');
  }

  function alertLabel(task) {
    const state = taskState(task);
    if (state === 'overdue') return t('report_task_overdue', 'En retard');
    if (state === 'soon') return t('report_task_due_soon', 'Échéance proche');
    if (task.priority === 'high') return t('report_task_high', 'Priorité élevée');
    return '';
  }

  function renderAlerts(data) {
    const alerts = data.tasks
      .filter(task => !task.done && (taskState(task) === 'overdue' || taskState(task) === 'soon' || task.priority === 'high'))
      .sort((a, b) => {
        const stateWeight = state => state === 'overdue' ? 0 : state === 'soon' ? 1 : 2;
        const diff = stateWeight(taskState(a)) - stateWeight(taskState(b));
        if (diff) return diff;
        return (dateFromKey(a.dueDate)?.getTime() || Infinity) - (dateFromKey(b.dueDate)?.getTime() || Infinity);
      });
    if (!alerts.length) { $('#reportAlerts').innerHTML = `<div class="report-no-alerts">✓ ${escapeHtml(t('report_no_alerts', 'Aucun point d’attention immédiat n’est détecté.'))}</div>`; return; }
    $('#reportAlerts').innerHTML = alerts.slice(0, 12).map(task => `<div class="report-alert report-alert--${taskState(task)}"><div><strong>${escapeHtml(task.text)}</strong><small>${escapeHtml(task.project.name)} · ${escapeHtml(priorityLabel(task.priority))}</small></div><div class="report-alert__meta"><span>${escapeHtml(alertLabel(task))}</span><small>${task.dueDate ? escapeHtml(formatDate(task.dueDate)) : escapeHtml(t('report_no_deadline', 'Sans échéance'))}</small></div></div>`).join('');
  }

  function renderStages(projects) {
    const total = projects.length || 1;
    $('#reportStages').innerHTML = STAGES.map(stage => {
      const count = projects.filter(project => project.stage === stage).length;
      const pct = Math.round(count / total * 100);
      return `<div class="report-stage"><div><span>${escapeHtml(stageLabel(stage))}</span><strong>${count}</strong></div><div class="report-stage-track"><i style="width:${pct}%"></i></div></div>`;
    }).join('');
  }

  function showToast(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200);
  }

  function render() {
    const projects = readProjects();
    const data = metrics(projects);
    renderDate();
    $('#reportEmpty').hidden = projects.length > 0;
    $('#reportContent').hidden = projects.length === 0;
    if (!projects.length) return;
    const status = reportStatus(data);
    $('#reportHealth').className = `report-health report-health--${status.type}`;
    $('#reportHealth').textContent = status.label;
    $('#reportExecutiveText').textContent = executiveText(data);
    renderKpis(data);
    renderProjects([...projects].sort((a,b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)));
    renderAlerts(data);
    renderStages(projects);
  }

  function bind() {
    $('#refreshReport')?.addEventListener('click', () => { render(); showToast(t('report_refreshed', 'Rapport actualisé.')); });
    $('#printReport')?.addEventListener('click', () => window.print());
    window.addEventListener('nbprof:languagechange', render);
    window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) render(); });
  }

  function init() { bind(); render(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
