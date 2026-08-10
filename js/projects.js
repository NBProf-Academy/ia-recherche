(() => {
  const STORAGE_KEY = 'nbprof-research-projects-v1';
  const STAGES = ['exploration', 'literature', 'method', 'data', 'writing', 'defense'];
  const PRIORITIES = ['low', 'medium', 'high'];
  const $ = selector => document.querySelector(selector);
  const t = (key, fallback = '') => window.NBProfI18n?.t(key, fallback) || fallback || key;
  const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = () => new Date().toISOString();
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let projects = [];
  let editingProjectId = null;
  let taskProjectId = null;
  let editingTaskId = null;
  let saveStatusTimer = null;
  
  function cleanText(value, maxLength = 400) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  }

  function validIso(value, fallback) {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return fallback;
    return new Date(value).toISOString();
  }

  function validDateKey(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value : '';
  }

  function normalizeTask(item) {
    return {
      id: cleanText(item?.id, 80) || id(),
      text: cleanText(item?.text, 160),
      done: Boolean(item?.done),
      priority: PRIORITIES.includes(item?.priority) ? item.priority : 'medium',
      dueDate: validDateKey(item?.dueDate)
    };
  }
function normalizeExploration(exploration, projectGoal = '') {
  return {
    initialIdea: cleanText(exploration?.initialIdea, 1500),

    problem: cleanText(exploration?.problem, 3000),

    mainQuestion: cleanText(
      exploration?.mainQuestion,
      1000
    ),

    secondaryQuestions: Array.isArray(exploration?.secondaryQuestions)
      ? exploration.secondaryQuestions
          .map(item => cleanText(item, 500))
          .filter(Boolean)
          .slice(0, 10)
      : [],

    generalObjective: cleanText(
      exploration?.generalObjective || projectGoal,
      1500
    ),

    specificObjectives: Array.isArray(exploration?.specificObjectives)
      ? exploration.specificObjectives
          .map(item => cleanText(item, 500))
          .filter(Boolean)
          .slice(0, 10)
      : [],

    keywords: Array.isArray(exploration?.keywords)
      ? exploration.keywords
          .map(item => cleanText(item, 100))
          .filter(Boolean)
          .slice(0, 20)
      : [],

    population: cleanText(exploration?.population, 1000),

    field: cleanText(exploration?.field, 1000),

    geography: cleanText(exploration?.geography, 500),

    period: cleanText(exploration?.period, 500),

    discipline: cleanText(exploration?.discipline, 500),

    scientificInterest: cleanText(
      exploration?.scientificInterest,
      2500
    ),

    practicalInterest: cleanText(
      exploration?.practicalInterest,
      2500
    ),

    limits: cleanText(exploration?.limits, 2500)
  };
}
  function normalizeLiteratureReference(reference) {
  const createdAt = validIso(
    reference?.createdAt,
    nowIso()
  );

  return {
    id: cleanText(reference?.id, 80) || id(),

    authors: cleanText(reference?.authors, 500),

    year: cleanText(reference?.year, 20),

    title: cleanText(reference?.title, 1000),

    source: cleanText(reference?.source, 500),

    doi: cleanText(reference?.doi, 500),

    url: cleanText(reference?.url, 1500),

    keywords: Array.isArray(reference?.keywords)
      ? reference.keywords
          .map(item => cleanText(item, 100))
          .filter(Boolean)
          .slice(0, 20)
      : [],

    methodology: cleanText(
      reference?.methodology,
      2000
    ),

    sample: cleanText(
      reference?.sample,
      2000
    ),

    results: cleanText(
      reference?.results,
      4000
    ),

    limitations: cleanText(
      reference?.limitations,
      3000
    ),

    contribution: cleanText(
      reference?.contribution,
      3000
    ),

    notes: cleanText(
      reference?.notes,
      4000
    ),

    createdAt,

    updatedAt: validIso(
      reference?.updatedAt,
      createdAt
    )
  };
}


function normalizeLiterature(literature) {
  return {
    references: Array.isArray(literature?.references)
      ? literature.references
          .map(normalizeLiteratureReference)
          .filter(reference => reference.title)
      : []
  };
}

  function normalizeProject(project) {
    const createdAt = validIso(project?.createdAt, nowIso());
    return {
      id: cleanText(project?.id, 80) || id(),
      name: cleanText(project?.name, 120),
      goal: cleanText(project?.goal, 400),
      stage: STAGES.includes(project?.stage) ? project.stage : 'exploration',
      exploration: normalizeExploration(
  project?.exploration,
  project?.goal
),
literature: normalizeLiterature(
  project?.literature
),
      archived: Boolean(project?.archived),
archivedAt: Boolean(project?.archived)
  ? validIso(project?.archivedAt, createdAt)
  : '',
      milestones: Array.isArray(project?.milestones)
        ? project.milestones.map(item => ({ id: cleanText(item?.id, 80) || id(), text: cleanText(item?.text, 160) })).filter(item => item.text)
        : [],
      tasks: Array.isArray(project?.tasks) ? project.tasks.map(normalizeTask).filter(item => item.text) : [],
      notes: cleanText(project?.notes, 5000),
      createdAt,
      updatedAt: validIso(project?.updatedAt, createdAt)
    };
  }

  function readProjects() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      const normalized = stored.map(normalizeProject).filter(project => project.name);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch {
      return [];
    }
  }

  function saveStatusTime() {
  const language =
    window.NBProfI18n?.getLanguage?.() ||
    document.documentElement.lang ||
    'fr';

  try {
    return new Intl.DateTimeFormat(language, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function setSaveStatus(state = 'saved') {
  const status = $('#localSaveStatus');
  if (!status) return;

  if (state === 'saving') {
    status.textContent = `⏳ ${t('saving_local', 'Enregistrement...')}`;
    status.dataset.state = 'saving';
    return;
  }

  status.textContent =
    `✓ ${t('saved_local', 'Sauvegardé localement')} · ${saveStatusTime()}`;

  status.dataset.state = 'saved';
}

function saveProjects() {
  setSaveStatus('saving');

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(projects)
  );

  clearTimeout(saveStatusTimer);

  saveStatusTimer = setTimeout(() => {
    setSaveStatus('saved');
  }, 350);
}
  function touch(project) { if (project) project.updatedAt = nowIso(); }
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
  function stageLabel(stage) { return t(`stage_${stage}`, stage); }
  function priorityLabel(priority) { return t(`priority_${priority}`, priority); }
  function projectById(projectId) { return projects.find(project => project.id === projectId); }
  function taskById(project, taskId) { return project?.tasks.find(task => task.id === taskId); }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dateFromKey(value) {
    if (!validDateKey(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function daysUntil(value) {
    const due = dateFromKey(value);
    if (!due) return null;
    const today = dateFromKey(localDateKey());
    return Math.round((due - today) / 86400000);
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

  function projectProgress(project) {
    const total = project.tasks.length;
    const done = project.tasks.filter(task => task.done).length;
    const pending = project.tasks.filter(task => !task.done);
    const overdue = pending.filter(task => taskState(task) === 'overdue').length;
    const dueSoon = pending.filter(task => ['today', 'soon'].includes(taskState(task))).length;
    const highPriority = pending.filter(task => task.priority === 'high').length;
    return { total, done, overdue, dueSoon, highPriority, percent: total ? Math.round(done / total * 100) : 0 };
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const language = window.NBProfI18n?.getLanguage?.() || document.documentElement.lang || 'fr';
    try {
      return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch {
      return date.toLocaleString();
    }
  }

  function formatDueDate(value) {
    const date = dateFromKey(value);
    if (!date) return '';
    const language = window.NBProfI18n?.getLanguage?.() || document.documentElement.lang || 'fr';
    try {
      return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
    } catch {
      return date.toLocaleDateString();
    }
  }

  function normalizeImportedProjects(payload) {
    const source = Array.isArray(payload) ? payload : payload?.projects;
    if (!Array.isArray(source)) throw new Error('INVALID_FORMAT');
    return source.map(normalizeProject).filter(project => project.name);
  }

  function emptyState() {
    return `<div class="empty-projects"><img src="../icon-192.png" alt=""><h2>${escapeHtml(t('no_projects_title'))}</h2><p>${escapeHtml(t('no_projects_text'))}</p></div>`;
  }

  function dueBadge(task) {
    if (!task.dueDate) return '';
    const state = taskState(task);
    const label = state === 'overdue'
      ? `${t('overdue')} · ${formatDueDate(task.dueDate)}`
      : state === 'today'
        ? t('due_today')
        : `${t('due_on')} ${formatDueDate(task.dueDate)}`;
    return `<span class="due-badge due-${state}">${state === 'overdue' ? '⚠ ' : '📅 '}${escapeHtml(label)}</span>`;
  }

  function taskMarkup(project, task) {
    const state = taskState(task);
    return `<li class="task-row task-row--${state}">
      <label class="task-check"><input type="checkbox" data-action="toggle" data-project="${project.id}" data-item="${task.id}" ${task.done ? 'checked' : ''}><span class="task-body"><span class="task-title">${escapeHtml(task.text)}</span><span class="task-tags"><span class="priority-badge priority-${task.priority}">${escapeHtml(priorityLabel(task.priority))}</span>${dueBadge(task)}</span></span></label>
      <span class="task-row__actions"><button data-action="edit-task" data-project="${project.id}" data-item="${task.id}" aria-label="${escapeHtml(t('edit_task'))}">✎</button><button data-action="remove-task" data-project="${project.id}" data-item="${task.id}" aria-label="${escapeHtml(t('remove_task'))}">×</button></span>
    </li>`;
  }

  function indicator(value, label, type = '') {
    return `<div class="task-indicator ${type ? `task-indicator--${type}` : ''}"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function card(project) {
    const progress = projectProgress(project);
    const milestones = project.milestones.map(item => `<li>${escapeHtml(item.text)}</li>`).join('') || `<li class="muted">${escapeHtml(t('project_empty'))}</li>`;
    const tasks = project.tasks.map(task => taskMarkup(project, task)).join('') || `<li class="muted">${escapeHtml(t('project_empty'))}</li>`;
    return `<article class="project-card" data-project-card="${escapeHtml(project.id)}">
      <div class="project-card__top">
        <div><span class="project-stage">${escapeHtml(stageLabel(project.stage))}</span><h2>${escapeHtml(project.name)}</h2></div>
        <div class="project-card__actions">
        <a
  class="edit-project exploration-project"
  href="exploration.html?project=${encodeURIComponent(project.id)}"
>
  🔎 ${escapeHtml(t('open_exploration', 'Explorer le sujet'))}
</a>
<a
  class="edit-project literature-project"
  href="literature.html?project=${encodeURIComponent(project.id)}"
>
  📚 ${escapeHtml(t('open_literature', 'Revue de littérature'))}
</a>
          <button class="edit-project" data-action="edit-project" data-project="${project.id}">${escapeHtml(t('edit_project'))}</button>
          <button
  class="edit-project duplicate-project"
  data-action="duplicate-project"
  data-project="${project.id}"
>
  ${escapeHtml(t('duplicate_project', 'Dupliquer'))}
</button>
          <button
  class="edit-project archive-project"
  data-action="archive-project"
  data-project="${project.id}"
>
  ${escapeHtml(t('archive_project', 'Archiver'))}
</button>
          <button class="delete-project" data-action="delete-project" data-project="${project.id}">${escapeHtml(t('delete_project'))}</button>
        </div>
      </div>
      <p class="project-goal">${escapeHtml(project.goal || '—')}</p>
      <div class="project-meta"><span><strong>${escapeHtml(t('created_on'))}</strong> ${escapeHtml(formatDate(project.createdAt))}</span><span><strong>${escapeHtml(t('updated_on'))}</strong> ${escapeHtml(formatDate(project.updatedAt))}</span></div>
      <div class="progress-label"><strong>${progress.percent}%</strong><span>${escapeHtml(t('project_progress'))} · ${progress.done}/${progress.total} ${escapeHtml(t('tasks_done'))}</span></div>
      <div class="progress-track"><span style="width:${progress.percent}%"></span></div>
      <div class="task-indicators">
        ${indicator(`${progress.done}/${progress.total}`, t('indicator_completed'), 'completed')}
        ${indicator(progress.overdue, t('indicator_overdue'), progress.overdue ? 'overdue' : '')}
        ${indicator(progress.dueSoon, t('indicator_due_soon'), progress.dueSoon ? 'soon' : '')}
        ${indicator(progress.highPriority, t('indicator_high_priority'), progress.highPriority ? 'high' : '')}
      </div>
      <div class="project-columns">
        <section><h3>${escapeHtml(t('milestones'))}</h3><ul class="milestone-list">${milestones}</ul><form class="inline-form" data-form="milestone" data-project="${project.id}"><input required maxlength="160" data-i18n-placeholder="milestone_placeholder" placeholder="${escapeHtml(t('milestone_placeholder'))}"><button type="submit" aria-label="${escapeHtml(t('add_milestone'))}">+</button></form></section>
        <section><div class="tasks-heading"><h3>${escapeHtml(t('tasks'))}</h3><button class="add-task-button" type="button" data-action="add-task" data-project="${project.id}">+ ${escapeHtml(t('add_task'))}</button></div><ul class="tasks-list">${tasks}</ul></section>
      </div>
      <section class="notes-section"><h3>${escapeHtml(t('research_notes'))}</h3><textarea data-action="notes" data-project="${project.id}" rows="4" placeholder="${escapeHtml(t('notes_placeholder'))}">${escapeHtml(project.notes || '')}</textarea></section>
    </article>`;
  }
  function duplicateProject(projectId) {
  const source = projectById(projectId);
  if (!source) return;

  const createdAt = nowIso();

  const duplicate = {
    ...JSON.parse(JSON.stringify(source)),

    id: id(),

    name: cleanText(
      `${source.name} — ${t('project_copy_suffix', 'Copie')}`,
      120
    ),

    archived: false,
    archivedAt: '',

    milestones: source.milestones.map(item => ({
      ...item,
      id: id()
    })),

    tasks: source.tasks.map(task => ({
      ...task,
      id: id()
    })),

    createdAt,
    updatedAt: createdAt
  };

  projects.unshift(duplicate);

  saveProjects();
  render();

  toast(
    t(
      'project_duplicated',
      'Projet dupliqué avec succès.'
    )
  );
}
function archiveProject(projectId) {
  const project = projectById(projectId);
  if (!project) return;

  if (
    !confirm(
      t(
        'archive_project_confirm',
        'Archiver ce projet ? Vous pourrez le restaurer ultérieurement.'
      )
    )
  ) {
    return;
  }

  project.archived = true;
  project.archivedAt = nowIso();

  touch(project);
  saveProjects();
  render();

  toast(
    t(
      'project_archived',
      'Projet archivé avec succès.'
    )
  );
}

function restoreArchivedProject(projectId) {
  const project = projectById(projectId);
  if (!project) return;

  project.archived = false;
  project.archivedAt = '';

  touch(project);
  saveProjects();
  render();

  toast(
    t(
      'project_restored',
      'Projet restauré avec succès.'
    )
  );
}

  function archivedProjectCard(project) {
  return `
    <article class="project-card archived-project-card">
      <div class="project-card__top">
        <div>
          <span class="project-stage">
            📦 ${escapeHtml(t('archived_project', 'Projet archivé'))}
          </span>

          <h2>${escapeHtml(project.name)}</h2>
        </div>

        <div class="project-card__actions">
          <button
            class="edit-project restore-project"
            data-action="restore-project"
            data-project="${project.id}"
          >
            ${escapeHtml(t('restore_project', 'Restaurer'))}
          </button>
        </div>
      </div>

      <p class="project-goal">
        ${escapeHtml(project.goal || '—')}
      </p>

      <div class="project-meta">
        <span>
          <strong>
            ${escapeHtml(t('archived_on', 'Archivé le'))}
          </strong>
          ${escapeHtml(formatDate(project.archivedAt))}
        </span>
      </div>
    </article>
  `;
}
  function render() {
  const container = $('#projectsContainer');

  const activeProjects = projects.filter(
    project => !project.archived
  );

  const archivedProjects = projects.filter(
    project => project.archived
  );

  const activeMarkup = activeProjects.length
    ? activeProjects.map(card).join('')
    : emptyState();

  const archivedMarkup = archivedProjects.length
    ? `
      <section class="archived-projects-section">
        <div class="archived-projects-heading">
          <h2>
            📦 ${escapeHtml(
              t('archived_projects', 'Projets archivés')
            )}
          </h2>

          <span class="archived-projects-count">
            ${archivedProjects.length}
          </span>
        </div>

        <div class="archived-projects-list">
          ${archivedProjects.map(archivedProjectCard).join('')}
        </div>
      </section>
    `
    : '';

  container.innerHTML = activeMarkup + archivedMarkup;
}

  function updateProjectDialogMode() {
    const isEditing = Boolean(editingProjectId);
    const title = $('#projectDialogTitle');
    const submit = $('#projectSubmitButton');
    if (title) title.textContent = t(isEditing ? 'edit_project_title' : 'new_project');
    if (submit) submit.textContent = t(isEditing ? 'save' : 'create_project');
  }

  function openProjectDialog(projectId = null) {
    editingProjectId = projectId;
    const project = projectId ? projectById(projectId) : null;
    $('#projectForm').reset();
    if (project) {
      $('#projectName').value = project.name;
      $('#projectGoal').value = project.goal;
      $('#projectStage').value = project.stage;
    }
    updateProjectDialogMode();
    const dialog = $('#projectDialog');
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    $('#projectName').focus();
  }

  function closeProjectDialog() {
    const dialog = $('#projectDialog');
    if (dialog.close) dialog.close(); else dialog.removeAttribute('open');
    $('#projectForm').reset();
    editingProjectId = null;
    updateProjectDialogMode();
  }

  function saveProjectForm() {
    const name = $('#projectName').value.trim();
    if (!name) return;
    if (editingProjectId) {
      const project = projectById(editingProjectId);
      if (!project) return;
      project.name = name;
      project.goal = $('#projectGoal').value.trim();
      project.stage = $('#projectStage').value;
      touch(project);
      saveProjects();
      closeProjectDialog();
      render();
      toast(t('project_updated'));
      return;
    }
    const createdAt = nowIso();
    projects.unshift({
  id: id(),
  name,
  goal: $('#projectGoal').value.trim(),
  stage: $('#projectStage').value,
  archived: false,
  archivedAt: '',
  exploration: normalizeExploration(
    null,
    $('#projectGoal').value.trim()
  ),
  literature: normalizeLiterature(null),
  milestones: [],
  tasks: [],
  notes: '',
  createdAt,
  updatedAt: createdAt
});
    saveProjects();
    closeProjectDialog();
    render();
    toast(t('project_created'));
  }

  function updateTaskDialogMode() {
    const isEditing = Boolean(editingTaskId);
    const title = $('#taskDialogTitle');
    const submit = $('#taskSubmitButton');
    if (title) title.textContent = t(isEditing ? 'edit_task_title' : 'new_task_title');
    if (submit) submit.textContent = t(isEditing ? 'save_task' : 'add_task');
  }

  function openTaskDialog(projectId, taskId = null) {
    const project = projectById(projectId);
    if (!project) return;
    taskProjectId = projectId;
    editingTaskId = taskId;
    const task = taskId ? taskById(project, taskId) : null;
    $('#taskForm').reset();
    $('#taskPriority').value = task?.priority || 'medium';
    $('#taskText').value = task?.text || '';
    $('#taskDueDate').value = task?.dueDate || '';
    updateTaskDialogMode();
    const dialog = $('#taskDialog');
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    $('#taskText').focus();
  }

  function closeTaskDialog() {
    const dialog = $('#taskDialog');
    if (dialog.close) dialog.close(); else dialog.removeAttribute('open');
    $('#taskForm').reset();
    taskProjectId = null;
    editingTaskId = null;
    updateTaskDialogMode();
  }

  function saveTaskForm() {
    const project = projectById(taskProjectId);
    const text = $('#taskText').value.trim();
    if (!project || !text) return;
    const priority = PRIORITIES.includes($('#taskPriority').value) ? $('#taskPriority').value : 'medium';
    const dueDate = validDateKey($('#taskDueDate').value);
    if (editingTaskId) {
      const task = taskById(project, editingTaskId);
      if (!task) return;
      task.text = text;
      task.priority = priority;
      task.dueDate = dueDate;
      toast(t('task_updated'));
    } else {
      project.tasks.push({ id: id(), text, done: false, priority, dueDate });
      toast(t('task_created'));
    }
    touch(project);
    saveProjects();
    closeTaskDialog();
    render();
  }

  function addMilestone(form) {
    const project = projectById(form.dataset.project);
    const input = form.querySelector('input');
    const text = input.value.trim();
    if (!project || !text) return;
    project.milestones.push({ id: id(), text });
    touch(project);
    saveProjects();
    render();
    toast(t('project_updated'));
  }

  function exportProjects() {
  const backup = {
    app: 'NBProf Research Hub',
    backupType: 'research-hub-backup',
    schemaVersion: 1,
    appVersion: '1.1.0',
    exportedAt: nowIso(),
    storageKey: STORAGE_KEY,
    projectCount: projects.length,
    projects
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `NBProf-Research-Backup-${new Date().toISOString().slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);

  toast(t('export_ready'));
}
function createSafetyBackup() {
  if (!projects.length) return null;

  const safetyBackup = {
    app: 'NBProf Research Hub',
    backupType: 'pre-restore-safety-backup',
    schemaVersion: 1,
    appVersion: '1.1.0',
    createdAt: nowIso(),
    sourceStorageKey: STORAGE_KEY,
    projectCount: projects.length,
    projects: JSON.parse(JSON.stringify(projects))
  };

  localStorage.setItem(
    `${STORAGE_KEY}-safety-backup`,
    JSON.stringify(safetyBackup)
  );

  return safetyBackup;
}
  function restoreSafetyBackup() {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-safety-backup`);

    if (!raw) {
      toast(
        t(
          'safety_backup_missing',
          'Aucune sauvegarde de sécurité disponible.'
        )
      );
      return;
    }

    const payload = JSON.parse(raw);
    const restored = normalizeImportedProjects(payload);

    if (!restored.length) {
      toast(
        t(
          'safety_backup_empty',
          'La sauvegarde de sécurité est vide.'
        )
      );
      return;
    }

    if (
      !confirm(
        t(
          'restore_safety_confirm',
          'Restaurer la sauvegarde de sécurité ? Les données actuelles seront remplacées.'
        )
      )
    ) {
      return;
    }

    // Conserver également l’état actuel avant la restauration.
    const currentStateBackup = {
      app: 'NBProf Research Hub',
      backupType: 'before-safety-restore',
      schemaVersion: 1,
      appVersion: '1.1.0',
      createdAt: nowIso(),
      projectCount: projects.length,
      projects: JSON.parse(JSON.stringify(projects))
    };

    localStorage.setItem(
      `${STORAGE_KEY}-before-safety-restore`,
      JSON.stringify(currentStateBackup)
    );

    projects = restored;
    saveProjects();
    render();

    toast(
      t(
        'safety_restore_success',
        'Sauvegarde de sécurité restaurée avec succès.'
      )
    );
  } catch (error) {
    console.error('NBProf safety restore error:', error);

    toast(
      t(
        'safety_restore_failed',
        'Impossible de restaurer la sauvegarde de sécurité.'
      )
    );
  }
}
  async function importProjects(file) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');
      const payload = JSON.parse(await file.text());
      const imported = normalizeImportedProjects(payload);
      if (!imported.length) { toast(t('import_empty')); return; }
      if (projects.length) {
  if (!confirm(t('import_confirm'))) return;

  try {
    createSafetyBackup();
  } catch (error) {
    console.error('NBProf safety backup error:', error);
    toast(
      t(
        'safety_backup_failed',
        'Impossible de créer la sauvegarde de sécurité. Importation annulée.'
      )
    );
    return;
  }
}

projects = imported;
      saveProjects();
      render();
      toast(t('import_success').replace('{count}', String(imported.length)));
    } catch (error) {
      console.error('NBProf import error:', error);
      toast(t('import_invalid'));
    } finally {
      const input = $('#importProjectsInput');
      if (input) input.value = '';
    }
  }

  function addNbprofFooter() {
    const main = $('.projects-main');
    if (!main || $('.nbprof-project-footer')) return;
    const footer = document.createElement('footer');
    footer.className = 'site-footer nbprof-project-footer';
    footer.innerHTML = `<div class="footer-inner"><span class="footer-return-text">NBProf Research Hub</span><a class="secondary-button nbprof-return" href="https://nbprof.com" data-i18n="return_nbprof">${escapeHtml(t('return_nbprof', 'Retour au site NBProf'))}</a></div>`;
    main.after(footer);
  }

  function bind() {
    const hero = $('.projects-hero');
    addNbprofFooter();
    const actionGroup = document.createElement('div');
    actionGroup.className = 'project-actions';
    const newProjectButton = $('#newProjectButton');
    hero.append(actionGroup);
    actionGroup.append(newProjectButton);
    const saveStatus = document.createElement('div');
saveStatus.id = 'localSaveStatus';
saveStatus.className = 'local-save-status';
saveStatus.setAttribute('role', 'status');
saveStatus.setAttribute('aria-live', 'polite');

actionGroup.append(saveStatus);

setSaveStatus('saved');

    const assistantButton = document.createElement('a');
    assistantButton.className = 'secondary-button assistant-launch';
    assistantButton.href = 'assistant.html';
    assistantButton.dataset.i18n = 'assistant_launch';
    assistantButton.textContent = t('assistant_launch');
    actionGroup.prepend(assistantButton);

    const importButton = document.createElement('button');
    importButton.className = 'secondary-button import-button';
    importButton.type = 'button';
    importButton.dataset.action = 'import';
    importButton.dataset.i18n = 'import_projects';
    importButton.textContent = t('import_projects');
    const importInput = document.createElement('input');
    importInput.id = 'importProjectsInput';
    importInput.type = 'file';
    importInput.accept = 'application/json,.json';
    importInput.hidden = true;
    const exportButton = document.createElement('button');
    exportButton.className = 'secondary-button export-button';
    exportButton.type = 'button';
    exportButton.dataset.action = 'export';
    exportButton.dataset.i18n = 'export_projects';
    exportButton.textContent = t('export_projects');
    const restoreSafetyButton = document.createElement('button');

restoreSafetyButton.className = 'secondary-button restore-safety-button';
restoreSafetyButton.type = 'button';
restoreSafetyButton.dataset.action = 'restore-safety';
restoreSafetyButton.dataset.i18n = 'restore_safety_backup';
restoreSafetyButton.textContent = t(
  'restore_safety_backup',
  'Restaurer la sauvegarde de sécurité'
);
    actionGroup.append(
  importButton,
  exportButton,
  restoreSafetyButton,
  importInput
);

    newProjectButton.addEventListener('click', () => openProjectDialog());
    $('#closeDialog').addEventListener('click', closeProjectDialog);
    $('#cancelDialog').addEventListener('click', closeProjectDialog);
    $('#closeTaskDialog').addEventListener('click', closeTaskDialog);
    $('#cancelTaskDialog').addEventListener('click', closeTaskDialog);
    importInput.addEventListener('change', event => importProjects(event.target.files?.[0]));
    $('#projectForm').addEventListener('submit', event => { event.preventDefault(); saveProjectForm(); });
    $('#taskForm').addEventListener('submit', event => { event.preventDefault(); saveTaskForm(); });
    document.addEventListener('submit', event => {
      if (!event.target.matches('.inline-form[data-form="milestone"]')) return;
      event.preventDefault();
      addMilestone(event.target);
    });
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      if (target.dataset.action === 'create') openProjectDialog();
      if (target.dataset.action === 'edit-project') openProjectDialog(target.dataset.project);
      if (target.dataset.action === 'duplicate-project') {
  duplicateProject(target.dataset.project);
}
      if (target.dataset.action === 'archive-project') {
  archiveProject(target.dataset.project);
}
      if (target.dataset.action === 'restore-project') {
  restoreArchivedProject(target.dataset.project);
}
      if (target.dataset.action === 'add-task') openTaskDialog(target.dataset.project);
      if (target.dataset.action === 'edit-task') openTaskDialog(target.dataset.project, target.dataset.item);
      if (target.dataset.action === 'import') $('#importProjectsInput')?.click();
      if (target.dataset.action === 'export') exportProjects();
      if (target.dataset.action === 'restore-safety') {
  restoreSafetyBackup();
}
      if (target.dataset.action === 'delete-project' && confirm(t('delete_project_confirm'))) {
        projects = projects.filter(project => project.id !== target.dataset.project);
        saveProjects();
        render();
      }
      if (target.dataset.action === 'remove-task' && confirm(t('remove_task_confirm'))) {
        const project = projectById(target.dataset.project);
        if (project) {
          project.tasks = project.tasks.filter(task => task.id !== target.dataset.item);
          touch(project);
          saveProjects();
          render();
        }
      }
    });
    document.addEventListener('change', event => {
      if (event.target.dataset.action !== 'toggle') return;
      const project = projectById(event.target.dataset.project);
      const task = taskById(project, event.target.dataset.item);
      if (task) {
        task.done = event.target.checked;
        touch(project);
        saveProjects();
        render();
      }
    });
    document.addEventListener('input', event => {
      if (event.target.dataset.action !== 'notes') return;
      const project = projectById(event.target.dataset.project);
      if (project) {
        project.notes = event.target.value;
        touch(project);
        saveProjects();
      }
    });
    document.addEventListener('blur', event => {
      if (event.target.dataset.action === 'notes') {
        render();
        toast(t('notes_saved'));
      }
    }, true);
    window.addEventListener('nbprof:languagechange', () => {
      render();
      updateProjectDialogMode();
      updateTaskDialogMode();
      setSaveStatus('saved');
      restoreSafetyButton.textContent = t(
        'restore_safety_backup',
        'Restaurer la sauvegarde de sécurité'
      );
    });
  }
function focusRequestedProject() {
  const params = new URLSearchParams(window.location.search);
  const requestedProjectId = params.get('project');

  if (!requestedProjectId) return;

  const card = [...document.querySelectorAll('[data-project-card]')]
    .find(element => element.dataset.projectCard === requestedProjectId);

  if (!card) return;

  setTimeout(() => {
    card.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    card.classList.add('project-card--focused');

    setTimeout(() => {
      card.classList.remove('project-card--focused');
    }, 3000);
  }, 150);
}
  function init() {
    projects = readProjects();
    render();
    bind();
    focusRequestedProject();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
