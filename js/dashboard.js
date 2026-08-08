(() => {
  const STORAGE_KEY = 'nbprof-research-projects-v1';
  const STAGES = ['exploration', 'literature', 'method', 'data', 'writing', 'defense'];
  const PRIORITIES = ['low', 'medium', 'high'];
  const $ = selector => document.querySelector(selector);
  const t = (key, fallback = '') => window.NBProfI18n?.t(key, fallback) || fallback || key;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const filters = { query: '', stage: 'all', priority: 'all', deadline: 'all', sort: 'updated' };
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
      archived: Boolean(project?.archived),
      tasks: Array.isArray(project?.tasks) ? project.tasks.map(normalizeTask).filter(task => task.text) : [],
      updatedAt: typeof project?.updatedAt === 'string' && !Number.isNaN(Date.parse(project.updatedAt)) ? project.updatedAt : ''
    };
  }

  function readProjects() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
     return Array.isArray(raw)
  ? raw
      .map(normalizeProject)
      .filter(project => project.name && !project.archived)
  : [];
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

  function normalizeSearch(value) {
    return String(value ?? '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function queryMatchesProject(project) {
    if (!filters.query) return true;
    const needle = normalizeSearch(filters.query);
    const haystack = [project.name, project.goal, stageLabel(project.stage), ...project.tasks.map(task => task.text)].map(normalizeSearch).join(' ');
    return haystack.includes(needle);
  }

  function deadlineMatches(task) {
    const state = taskState(task);
    if (filters.deadline === 'all') return true;
    if (filters.deadline === 'overdue') return state === 'overdue';
    if (filters.deadline === 'dueSoon') return ['today', 'soon'].includes(state);
    if (filters.deadline === 'scheduled') return state === 'scheduled';
    if (filters.deadline === 'undated') return state === 'undated';
    if (filters.deadline === 'completed') return state === 'complete';
    return true;
  }

  function taskMatches(item) {
    if (filters.stage !== 'all' && item.project.stage !== filters.stage) return false;
    if (filters.priority !== 'all' && item.priority !== filters.priority) return false;
    if (!deadlineMatches(item)) return false;
    if (filters.query) {
      const needle = normalizeSearch(filters.query);
      const haystack = normalizeSearch(`${item.text} ${item.project.name} ${item.project.goal} ${stageLabel(item.project.stage)}`);
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  function projectMatches(project) {
    if (filters.stage !== 'all' && project.stage !== filters.stage) return false;
    if (!queryMatchesProject(project)) return false;
    const hasTaskFilter = filters.priority !== 'all' || filters.deadline !== 'all';
    if (!hasTaskFilter) return true;
    return project.tasks.some(task => taskMatches({ ...task, project }));
  }

  function nextDeadline(project) {
    const dates = project.tasks
      .filter(task => !task.done && task.dueDate)
      .map(task => dateFromKey(task.dueDate)?.getTime())
      .filter(Number.isFinite);
    return dates.length ? Math.min(...dates) : Number.POSITIVE_INFINITY;
  }

  function sortProjects(items) {
    return [...items].sort((a, b) => {
      if (filters.sort === 'progressDesc') return progress(b).percent - progress(a).percent || a.name.localeCompare(b.name);
      if (filters.sort === 'progressAsc') return progress(a).percent - progress(b).percent || a.name.localeCompare(b.name);
      if (filters.sort === 'deadline') return nextDeadline(a) - nextDeadline(b) || a.name.localeCompare(b.name);
      if (filters.sort === 'name') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0);
    });
  }

  function filteredData() {
    const visibleProjects = sortProjects(projects.filter(projectMatches));
    const visibleProjectIds = new Set(visibleProjects.map(project => project.id));
    const tasks = projects.flatMap(project => project.tasks.map(task => ({ ...task, project })))
      .filter(item => visibleProjectIds.has(item.project.id) && taskMatches(item));
    return { projects: visibleProjects, tasks };
  }

  function summary(view) {
    const done = view.tasks.filter(item => item.done).length;
    const pending = view.tasks.filter(item => !item.done);
    return {
      projects: view.projects.length,
      progress: view.tasks.length ? Math.round(done / view.tasks.length * 100) : 0,
      overdue: pending.filter(item => taskState(item) === 'overdue').length,
      dueSoon: pending.filter(item => ['today', 'soon'].includes(taskState(item))).length,
      high: pending.filter(item => item.priority === 'high').length,
      tasks: view.tasks
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

  function renderProjects(view) {
    const container = $('#dashboardProjects');
    if (!view.projects.length) {
      container.innerHTML = `<div class="dashboard-panel-empty">${escapeHtml(t('dashboard_no_filter_results'))}</div>`;
      return;
    }
    container.innerHTML = view.projects.slice(0, 12).map(project => {
      const p = progress(project);
      const pending = project.tasks.filter(task => !task.done).length;
      const deadline = nextDeadline(project);
      const deadlineText = Number.isFinite(deadline) ? formatDate(localDateKey(new Date(deadline))) : t('dashboard_no_deadline');
      return `<a class="dashboard-project-row" href="projets.html" aria-label="${escapeHtml(project.name)}">
        <div class="dashboard-project-row__main"><span class="project-stage">${escapeHtml(stageLabel(project.stage))}</span><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.goal || t('dashboard_no_goal'))}</small></div>
        <div class="dashboard-project-row__progress"><span><b>${p.percent}%</b> · ${pending} ${escapeHtml(t('dashboard_pending_tasks'))}</span><div class="dashboard-mini-track"><i style="width:${p.percent}%"></i></div><small>${escapeHtml(t('dashboard_next_deadline'))}: ${escapeHtml(deadlineText)}</small><small>${escapeHtml(t('dashboard_updated'))} ${escapeHtml(formatDate(project.updatedAt, true))}</small></div>
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
  function getNextAction(view) {
  const pendingTasks = view.tasks.filter(
    item => !item.done
  );

  if (!pendingTasks.length) return null;

  return [...pendingTasks].sort((a, b) => {
    const urgencyDifference =
      urgencyScore(a) - urgencyScore(b);

    if (urgencyDifference !== 0) {
      return urgencyDifference;
    }

    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }

    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return a.text.localeCompare(b.text);
  })[0];
}

  function dueText(task) {
    const state = taskState(task);
    if (state === 'complete') return t('dashboard_completed_task');
    if (state === 'overdue') return `${t('overdue')} · ${formatDate(task.dueDate)}`;
    if (state === 'today') return t('due_today');
    if (task.dueDate) return `${t('due_on')} ${formatDate(task.dueDate)}`;
    return t('dashboard_no_deadline');
  }
function deadlineGroups(view) {
  const pendingWithDeadline = view.tasks
    .filter(item => !item.done && item.dueDate)
    .sort((a, b) => urgencyScore(a) - urgencyScore(b));

  return {
    overdue: pendingWithDeadline.filter(
      item => taskState(item) === 'overdue'
    ),

    today: pendingWithDeadline.filter(
      item => taskState(item) === 'today'
    ),

    week: pendingWithDeadline.filter(
      item => taskState(item) === 'soon'
    ),

    upcoming: pendingWithDeadline.filter(
      item => taskState(item) === 'scheduled'
    )
  };
}
  function renderTasks(view) {
  const container = $('#dashboardTasks');
  const groups = deadlineGroups(view);
    const nextAction = getNextAction(view);

const nextActionMarkup = nextAction
  ? `
    <section class="next-action-card">
      <div class="next-action-card__label">
        🎯 ${escapeHtml(
          t('next_action_label', 'Ma prochaine action')
        )}
      </div>

      <strong class="next-action-card__title">
        ${escapeHtml(nextAction.text)}
      </strong>

      <span class="next-action-card__project">
        ${escapeHtml(nextAction.project.name)}
      </span>

      <div class="next-action-card__meta">
        <span class="priority-badge priority-${nextAction.priority}">
          ${escapeHtml(priorityLabel(nextAction.priority))}
        </span>

        <span class="due-badge due-${taskState(nextAction)}">
          ${escapeHtml(dueText(nextAction))}
        </span>
      </div>

      <a class="secondary-button next-action-card__button"
         href="projets.html">
        ${escapeHtml(
          t('next_action_start', 'Commencer')
        )}
      </a>
    </section>
  `
  : '';

  const groupConfig = [
    {
      key: 'overdue',
      icon: '🔴',
      label: t('deadline_group_overdue', 'En retard')
    },
    {
      key: 'today',
      icon: '🟠',
      label: t('deadline_group_today', 'Aujourd’hui')
    },
    {
      key: 'week',
      icon: '🟡',
      label: t('deadline_group_week', 'Cette semaine')
    },
    {
      key: 'upcoming',
      icon: '🔵',
      label: t('deadline_group_upcoming', 'À venir')
    }
  ];

  const totalTasks = Object.values(groups)
    .reduce((total, items) => total + items.length, 0);

  if (!totalTasks) {
  container.innerHTML = `
    ${nextActionMarkup}

    <div class="dashboard-panel-empty">
      ✓ ${escapeHtml(
        t(
          'deadline_center_empty',
          'Aucune échéance à traiter pour le moment.'
        )
      )}
    </div>
  `;
  return;
}

  container.innerHTML = nextActionMarkup + groupConfig.map(group => {
    const items = groups[group.key];

    const tasksMarkup = items.length
      ? items.map(item => {
          const state = taskState(item);

          return `
            <a
              class="dashboard-task dashboard-task--${state}"
              href="projets.html"
            >
              <span
                class="dashboard-task__marker"
                aria-hidden="true"
              ></span>

              <span class="dashboard-task__body">
                <strong>${escapeHtml(item.text)}</strong>

                <small>
                  ${escapeHtml(item.project.name)}
                </small>

                <span class="task-tags">
                  <span
                    class="priority-badge priority-${item.priority}"
                  >
                    ${escapeHtml(priorityLabel(item.priority))}
                  </span>

                  <span class="due-badge due-${state}">
                    ${escapeHtml(dueText(item))}
                  </span>
                </span>
              </span>
            </a>
          `;
        }).join('')
      : `
        <div class="deadline-group-empty">
          ${escapeHtml(
            t('deadline_group_empty', 'Aucune tâche')
          )}
        </div>
      `;

    return `
      <section class="deadline-group deadline-group--${group.key}">
        <div class="deadline-group__heading">
          <h3>
            ${group.icon}
            ${escapeHtml(group.label)}
          </h3>

          <span class="deadline-group__count">
            ${items.length}
          </span>
        </div>

        <div class="deadline-group__tasks">
          ${tasksMarkup}
        </div>
      </section>
    `;
  }).join('');
}
    container.innerHTML = ordered.map(item => {
      const state = taskState(item);
      return `<a class="dashboard-task dashboard-task--${state}" href="projets.html">
        <span class="dashboard-task__marker" aria-hidden="true"></span>
        <span class="dashboard-task__body"><strong>${escapeHtml(item.text)}</strong><small>${escapeHtml(item.project.name)}</small><span class="task-tags"><span class="priority-badge priority-${item.priority}">${escapeHtml(priorityLabel(item.priority))}</span><span class="due-badge due-${state}">${escapeHtml(dueText(item))}</span></span></span>
      </a>`;
    }).join('');
  }

  function renderStages(view) {
    const container = $('#dashboardStages');
    const counts = Object.fromEntries(STAGES.map(stage => [stage, 0]));
    view.projects.forEach(project => { counts[project.stage] += 1; });
    const max = Math.max(1, ...Object.values(counts));
    container.innerHTML = STAGES.map(stage => {
      const value = counts[stage];
      const width = Math.round(value / max * 100);
      return `<div class="dashboard-stage"><div class="dashboard-stage__label"><span>${escapeHtml(stageLabel(stage))}</span><strong>${value}</strong></div><div class="dashboard-stage__track"><i style="width:${width}%"></i></div></div>`;
    }).join('');
  }

  function renderFilterSummary(view) {
    const el = $('#dashboardFilterSummary');
    if (!el) return;
    const taskCount = view.tasks.length;
    el.textContent = t('dashboard_filter_summary')
      .replace('{projects}', String(view.projects.length))
      .replace('{tasks}', String(taskCount));
  }

  function syncFilterControls() {
    const search = $('#dashboardSearch');
    const stage = $('#dashboardStageFilter');
    const priority = $('#dashboardPriorityFilter');
    const deadline = $('#dashboardDeadlineFilter');
    const sort = $('#dashboardSort');
    if (search && search.value !== filters.query) search.value = filters.query;
    if (stage) stage.value = filters.stage;
    if (priority) priority.value = filters.priority;
    if (deadline) deadline.value = filters.deadline;
    if (sort) sort.value = filters.sort;
  }

  function render() {
    projects = readProjects();
    const empty = $('#dashboardEmpty');
    const kpis = $('#dashboardKpis');
    const layout = $('.dashboard-layout');
    const toolbar = $('.dashboard-toolbar');
    if (!projects.length) {
      kpis.innerHTML = '';
      layout.hidden = true;
      if (toolbar) toolbar.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    layout.hidden = false;
    if (toolbar) toolbar.hidden = false;
    syncFilterControls();
    const view = filteredData();
    const data = summary(view);
    renderKpis(data);
    renderProjects(view);
    renderTasks(view);
    renderStages(view);
    renderFilterSummary(view);
  }

  function resetFilters() {
    filters.query = '';
    filters.stage = 'all';
    filters.priority = 'all';
    filters.deadline = 'all';
    filters.sort = 'updated';
    render();
    $('#dashboardSearch')?.focus();
  }

  function bindFilters() {
    $('#dashboardSearch')?.addEventListener('input', event => { filters.query = event.target.value; render(); });
    $('#dashboardStageFilter')?.addEventListener('change', event => { filters.stage = event.target.value; render(); });
    $('#dashboardPriorityFilter')?.addEventListener('change', event => { filters.priority = event.target.value; render(); });
    $('#dashboardDeadlineFilter')?.addEventListener('change', event => { filters.deadline = event.target.value; render(); });
    $('#dashboardSort')?.addEventListener('change', event => { filters.sort = event.target.value; render(); });
    $('#dashboardResetFilters')?.addEventListener('click', resetFilters);
  }

  function init() {
    bindFilters();
    render();
    window.addEventListener('nbprof:languagechange', render);
    window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) render(); });
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('../sw.js').catch(console.error));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
