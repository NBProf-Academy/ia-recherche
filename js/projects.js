(() => {
  const STORAGE_KEY = 'nbprof-research-projects-v1';
  const $ = selector => document.querySelector(selector);
  const t = (key, fallback = '') => window.NBProfI18n?.t(key, fallback) || fallback || key;
  const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let projects = [];

  function readProjects() { try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(stored) ? stored : []; } catch { return []; } }
  function saveProjects() { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); }
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
  function stageLabel(stage) { return t(`stage_${stage}`, stage); }
  function projectProgress(project) { const total = project.tasks.length; const done = project.tasks.filter(task => task.done).length; return { total, done, percent: total ? Math.round(done / total * 100) : 0 }; }
  function projectById(projectId) { return projects.find(project => project.id === projectId); }

  function emptyState() {
    return `<div class="empty-projects"><img src="../icon-192.png" alt=""><h2>${escapeHtml(t('no_projects_title'))}</h2><p>${escapeHtml(t('no_projects_text'))}</p></div>`;
  }

  function card(project) {
    const progress = projectProgress(project);
    const milestones = project.milestones.map(item => `<li>${escapeHtml(item.text)}</li>`).join('') || `<li class="muted">${escapeHtml(t('project_empty'))}</li>`;
    const tasks = project.tasks.map(task => `<li class="task-row"><label><input type="checkbox" data-action="toggle" data-project="${project.id}" data-item="${task.id}" ${task.done ? 'checked' : ''}><span>${escapeHtml(task.text)}</span></label><button data-action="remove-task" data-project="${project.id}" data-item="${task.id}" aria-label="Supprimer">×</button></li>`).join('') || `<li class="muted">${escapeHtml(t('project_empty'))}</li>`;
    return `<article class="project-card"><div class="project-card__top"><div><span class="project-stage">${escapeHtml(stageLabel(project.stage))}</span><h2>${escapeHtml(project.name)}</h2></div><button class="delete-project" data-action="delete-project" data-project="${project.id}">${escapeHtml(t('delete_project'))}</button></div><p class="project-goal">${escapeHtml(project.goal || '—')}</p><div class="progress-label"><strong>${progress.percent}%</strong><span>${escapeHtml(t('project_progress'))} · ${progress.done}/${progress.total} ${escapeHtml(t('tasks_done'))}</span></div><div class="progress-track"><span style="width:${progress.percent}%"></span></div><div class="project-columns"><section><h3>${escapeHtml(t('milestones'))}</h3><ul class="milestone-list">${milestones}</ul><form class="inline-form" data-form="milestone" data-project="${project.id}"><input required maxlength="160" data-i18n-placeholder="milestone_placeholder" placeholder="${escapeHtml(t('milestone_placeholder'))}"><button type="submit">+</button></form></section><section><h3>${escapeHtml(t('tasks'))}</h3><ul class="tasks-list">${tasks}</ul><form class="inline-form" data-form="task" data-project="${project.id}"><input required maxlength="160" data-i18n-placeholder="task_placeholder" placeholder="${escapeHtml(t('task_placeholder'))}"><button type="submit">+</button></form></section></div><section class="notes-section"><h3>${escapeHtml(t('research_notes'))}</h3><textarea data-action="notes" data-project="${project.id}" rows="4" placeholder="${escapeHtml(t('notes_placeholder'))}">${escapeHtml(project.notes || '')}</textarea></section></article>`;
  }

  function render() { const container = $('#projectsContainer'); container.innerHTML = projects.length ? projects.map(card).join('') : emptyState(); }
  function openDialog() { const dialog = $('#projectDialog'); if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); $('#projectName').focus(); }
  function closeDialog() { const dialog = $('#projectDialog'); if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); $('#projectForm').reset(); }

  function createProject() {
    const name = $('#projectName').value.trim(); if (!name) return;
    projects.unshift({ id: id(), name, goal: $('#projectGoal').value.trim(), stage: $('#projectStage').value, milestones: [], tasks: [], notes: '' });
    saveProjects(); closeDialog(); render(); toast(t('project_created'));
  }

  function addItem(form) {
    const project = projectById(form.dataset.project); const input = form.querySelector('input'); const text = input.value.trim();
    if (!project || !text) return;
    if (form.dataset.form === 'task') project.tasks.push({ id: id(), text, done: false }); else project.milestones.push({ id: id(), text });
    saveProjects(); render(); toast(t('project_updated'));
  }

  function exportProjects() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), projects }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `nbprof-projets-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); toast(t('export_ready'));
  }

  function addNbprofFooter() { const main = $('.projects-main'); if (!main || $('.nbprof-project-footer')) return; const footer = document.createElement('footer'); footer.className = 'site-footer nbprof-project-footer'; footer.innerHTML = `<div class="footer-inner"><span class="footer-return-text">NBProf Research Hub</span><a class="secondary-button nbprof-return" href="https://nbprof.com" data-i18n="return_nbprof">${escapeHtml(t('return_nbprof', 'Retour au site NBProf'))}</a></div>`; main.after(footer); }
  function bind() {
    const hero = $('.projects-hero'); addNbprofFooter();
    const exportButton = document.createElement('button'); exportButton.className = 'secondary-button export-button'; exportButton.type = 'button'; exportButton.dataset.action = 'export'; exportButton.dataset.i18n = 'export_projects'; exportButton.textContent = t('export_projects'); hero.append(exportButton);
    $('#newProjectButton').addEventListener('click', openDialog); $('#closeDialog').addEventListener('click', closeDialog); $('#cancelDialog').addEventListener('click', closeDialog);
    $('#projectForm').addEventListener('submit', event => { event.preventDefault(); createProject(); });
    document.addEventListener('submit', event => { if (!event.target.matches('.inline-form')) return; event.preventDefault(); addItem(event.target); });
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-action]'); if (!target) return;
      if (target.dataset.action === 'create') openDialog();
      if (target.dataset.action === 'export') exportProjects();
      if (target.dataset.action === 'delete-project' && confirm(t('delete_project_confirm'))) { projects = projects.filter(project => project.id !== target.dataset.project); saveProjects(); render(); }
      if (target.dataset.action === 'remove-task') { const project = projectById(target.dataset.project); if (project) { project.tasks = project.tasks.filter(task => task.id !== target.dataset.item); saveProjects(); render(); } }
    });
    document.addEventListener('change', event => { if (event.target.dataset.action !== 'toggle') return; const project = projectById(event.target.dataset.project); const task = project?.tasks.find(item => item.id === event.target.dataset.item); if (task) { task.done = event.target.checked; saveProjects(); render(); } });
    document.addEventListener('input', event => { if (event.target.dataset.action !== 'notes') return; const project = projectById(event.target.dataset.project); if (project) { project.notes = event.target.value; saveProjects(); } });
    document.addEventListener('blur', event => { if (event.target.dataset.action === 'notes') toast(t('notes_saved')); }, true);
    window.addEventListener('nbprof:languagechange', render);
  }

  function init() { projects = readProjects(); render(); bind(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
