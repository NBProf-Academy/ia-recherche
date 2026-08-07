(() => {
  const STORAGE_KEY = 'nbprof-research-projects-v1';
  const STAGES = ['exploration', 'literature', 'method', 'data', 'writing', 'defense'];
  const PRIORITIES = ['low', 'medium', 'high'];
  const $ = selector => document.querySelector(selector);
  const t = (key, fallback = '') => window.NBProfI18n?.t(key, fallback) || fallback || key;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let projects = [];

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
      updatedAt: typeof project?.updatedAt === 'string' && !Number.isNaN(Date.parse(project.updatedAt)) ? project.updatedAt : ''
    };
  }

  function readProjects() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeProject).filter(project => project.name) : [];
    } catch (error) {
      console.error('NBProf dashboard storage error:', error);
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
    if (remaining === 0) return 'today';
    if (remaining <= 7) return 'soon';
    return 'scheduled';
  }

  function progress(project) {
    const total = project.tasks.length;
    const done = project.tasks.filter(task => task.done).length;
    return { total, done, percent: total ? Math.round(done / total * 100) : 0 };
  }

  function stageLabel(stage) { return t(`stage_${stage}`, stage); }
  function priorityLabel(priority) { return t(`priority_${priority}`, priority); }

  function formatDate(value, withTime = false) {
    if (!value) return '—';
    const date = withTime ? new Date(value) : dateFromKey(value);
    if (!date || Number.isNaN(date.getTime())) return '—';
    const language = window.NBProfI18n?.getLanguage?.() || document.documentElement.lang || 'fr';
    try {
      return new Intl.DateTimeFormat(language, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date);
    } catch {
      return withTime ? date.toLocaleString() : date.toLocaleDateString();
    }
  }

  function summary() {
    const tasks = projects.flatMap(project => project.tasks.map(task => ({ ...task, project })));
    const done = tasks.filter(item => item.done).length;
    const pending = tasks.filter(item => !item.done);
    return {
      projects: projects.length,
      progress: tasks.length ? Math.round(done / tasks.length * 100) : 0,
      overdue: pending.filter(item => taskState(item) === 'overdue').length,
      dueSoon: pending.filter(item => ['today', 'soon'].includes(taskState(item))).length,
      high: pending.filter(item => item.priority === 'high').length,
      tasks
    };
  }

  function kpi(value, label, type, icon) {
    return `<article class="dashboard-kpi dashboard-kpi--${type}"><span class="dashboard-kpi__icon" aria-hidden="true">${icon}</span><strong>${value}</strong><span>${escapeHtml(label)}</span></article>`;
  }

  function renderKpis(data) {
    $('#dashboardKpis').innerHTML = [
      kpi(data.projects, t('dashboard_projects'), 'projects', '▦'),
      kpi(`${data.progress}%`, t('dashboard_progress'), 'progress', '↗'),
      kpi(data.overdue, t('dashboard_overdue'), 'overdue', '⚠'),
      kpi(data.dueSoon, t('dashboard_due_soon'), 'soon', '◷'),
      kpi(data.high, t('dashboard_high_priority'), 'high', '◆')
    ].join('');
  }

  function renderProjects() {
    const container = $('#dashboardProjects');
    const ordered = [...projects].sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
    container.innerHTML = ordered.slice(0, 8).map(project => {
      const p = progress(project);
      const pending = project.tasks.filter(task => !task.done).length;
      return `<a class="dashboard-project-row" href="projets.html" aria-label="${escapeHtml(project.name)}">
        <div class="dashboard-project-row__main"><span class="project-stage">${escapeHtml(stageLabel(project.stage))}</span><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.goal || t('dashboard_no_goal'))}</small></div>
        <div class="dashboard-project-row__progress"><span><b>${p.percent}%</b> · ${pending} ${escapeHtml(t('dashboard_pending_tasks'))}</span><div class="dashboard-mini-track"><i style="width:${p.percent}%"></i></div><small>${escapeHtml(t('dashboard_updated'))} ${escapeHtml(formatDate(project.updatedAt, true))}</small></div>
      </a>`;
    }).join('');
  }

  function urgencyScore(item) {
    const state = taskState(item);
    const remaining = daysUntil(item.dueDate);
    if (state === 'overdue') return -1000 + (remaining ?? 0);
    if (state === 'today') return -500;
    if (state === 'soon') return -300 + (remaining ?? 0);
    if (item.priority === 'high') return -100 + (remaining ?? 30);
    if (item.dueDate) return remaining ?? 999;
    return item.priority === 'medium' ? 1500 : 2000;
  }

  function dueText(task) {
    const state = taskState(task);
    if (state === 'overdue') return `${t('overdue')} · ${formatDate(task.dueDate)}`;
    if (state === 'today') return t('due_today');
    if (task.dueDate) return `${t('due_on')} ${formatDate(task.dueDate)}`;
    return t('dashboard_no_deadline');
  }

  function renderTasks(data) {
    const container = $('#dashboardTasks');
    const urgent = data.tasks.filter(item => !item.done).sort((a, b) => urgencyScore(a) - urgencyScore(b)).slice(0, 7);
    if (!urgent.length) {
      container.innerHTML = `<div class="dashboard-panel-empty">✓ ${escapeHtml(t('dashboard_no_tasks'))}</div>`;
      return;
    }
    container.innerHTML = urgent.map(item => {
      const state = taskState(item);
      return `<a class="dashboard-task dashboard-task--${state}" href="projets.html">
        <span class="dashboard-task__marker" aria-hidden="true"></span>
        <span class="dashboard-task__body"><strong>${escapeHtml(item.text)}</strong><small>${escapeHtml(item.project.name)}</small><span class="task-tags"><span class="priority-badge priority-${item.priority}">${escapeHtml(priorityLabel(item.priority))}</span><span class="due-badge due-${state}">${escapeHtml(dueText(item))}</span></span></span>
      </a>`;
    }).join('');
  }

  function renderStages() {
    const container = $('#dashboardStages');
    const counts = Object.fromEntries(STAGES.map(stage => [stage, 0]));
    projects.forEach(project => { counts[project.stage] += 1; });
    const max = Math.max(1, ...Object.values(counts));
    container.innerHTML = STAGES.map(stage => {
      const value = counts[stage];
      const width = Math.round(value / max * 100);
      return `<div class="dashboard-stage"><div class="dashboard-stage__label"><span>${escapeHtml(stageLabel(stage))}</span><strong>${value}</strong></div><div class="dashboard-stage__track"><i style="width:${width}%"></i></div></div>`;
    }).join('');
  }

  function render() {
    projects = readProjects();
    const empty = $('#dashboardEmpty');
    const kpis = $('#dashboardKpis');
    const layout = $('.dashboard-layout');
    if (!projects.length) {
      kpis.innerHTML = '';
      layout.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    layout.hidden = false;
    const data = summary();
    renderKpis(data);
    renderProjects();
    renderTasks(data);
    renderStages();
  }

  function init() {
    render();
    window.addEventListener('nbprof:languagechange', render);
    window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) render(); });
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('../sw.js').catch(console.error));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
