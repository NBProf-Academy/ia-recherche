(() => {
  const STORAGE_KEY = 'nbprof-research-projects-v1';

  const $ = selector => document.querySelector(selector);

  const t = (key, fallback = '') =>
    window.NBProfI18n?.t(key, fallback) || fallback || key;

  const id = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const nowIso = () => new Date().toISOString();

  const cleanText = (value, maxLength = 400) =>
    typeof value === 'string'
      ? value.trim().slice(0, maxLength)
      : '';

  const escapeHtml = value =>
    String(value ?? '').replace(
      /[&<>'"]/g,
      char =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[char]
    );

  let projects = [];
  let currentProject = null;
  let editingReferenceId = null;
  let literatureSearchQuery = '';

  function readProjects() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );

      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.error(
        'NBProf literature storage error:',
        error
      );

      return [];
    }
  }

  function requestedProjectId() {
    const params = new URLSearchParams(
      window.location.search
    );

    return params.get('project') || '';
  }

  function keywordsToList(value) {
    return String(value || '')
      .split(',')
      .map(item => cleanText(item, 100))
      .filter(Boolean)
      .slice(0, 20);
  }

  function showToast(message) {
    const toast = $('#toast');

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  function references() {
    if (!currentProject) return [];

    if (!currentProject.literature) {
      currentProject.literature = {
        references: []
      };
    }

    if (
      !Array.isArray(
        currentProject.literature.references
      )
    ) {
      currentProject.literature.references = [];
    }

    return currentProject.literature.references;
  }

  function referenceById(referenceId) {
    return references().find(
      reference => reference.id === referenceId
    );
  }

  function renderProjectHeader() {
    const projectName =
      $('#literatureProjectName');

    const projectGoal =
      $('#literatureProjectGoal');

    if (projectName) {
      projectName.textContent =
        currentProject.name ||
        t(
          'literature_project_fallback',
          'Projet'
        );
    }

    if (projectGoal) {
      projectGoal.textContent =
        currentProject.goal || '';
    }

    const backButton = $('#backToProject');

    if (backButton) {
      backButton.href =
        `projets.html?project=${encodeURIComponent(
          currentProject.id
        )}`;
    }
  }

  function shortText(
    value,
    maxLength = 120
  ) {
    const text = cleanText(
      value,
      4000
    );

    if (text.length <= maxLength) {
      return text || '—';
    }

    return `${text
      .slice(0, maxLength)
      .trim()}…`;
  }

  function matchesLiteratureSearch(
    reference
  ) {
    const query = cleanText(
      literatureSearchQuery,
      200
    ).toLowerCase();

    if (!query) return true;

    const searchableContent = [
      reference.authors,
      reference.title,
      reference.source,
      reference.methodology,
      ...(Array.isArray(
        reference.keywords
      )
        ? reference.keywords
        : [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableContent.includes(
      query
    );
  }

  function renderReferences() {
    const allItems = references();

    const items = allItems.filter(
      matchesLiteratureSearch
    );

    const count =
      $('#literatureReferenceCount');

    const empty =
      $('#literatureEmpty');

    const matrix =
      $('#literatureMatrix');

    const body =
      $('#literatureTableBody');

    if (count) {
      count.textContent =
        String(allItems.length);
    }

    if (!items.length) {
      if (empty) {
        empty.hidden = false;
      }

      if (matrix) {
        matrix.hidden = true;
      }

      if (body) {
        body.innerHTML = '';
      }

      return;
    }

    if (empty) {
      empty.hidden = true;
    }

    if (matrix) {
      matrix.hidden = false;
    }

    if (!body) return;

    body.innerHTML = items
      .map(reference => {
        return `
          <tr>
            <td>
              ${escapeHtml(
                reference.authors || '—'
              )}
            </td>

            <td>
              ${escapeHtml(
                reference.year || '—'
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  reference.title || '—'
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                reference.source || '—'
              )}
            </td>

            <td>
              ${escapeHtml(
                shortText(
                  reference.methodology
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                shortText(
                  reference.results
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                shortText(
                  reference.limitations
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                shortText(
                  reference.contribution
                )
              )}
            </td>

            <td>
              <div
                class="literature-row-actions"
              >
                <button
                  type="button"
                  class="edit-project"
                  data-action="edit-literature-reference"
                  data-reference="${escapeHtml(
                    reference.id
                  )}"
                >
                  ${escapeHtml(
                    t(
                      'literature_edit_action',
                      'Modifier'
                    )
                  )}
                </button>

                <button
                  type="button"
                  class="delete-project"
                  data-action="delete-literature-reference"
                  data-reference="${escapeHtml(
                    reference.id
                  )}"
                >
                  ${escapeHtml(
                    t(
                      'literature_delete_action',
                      'Supprimer'
                    )
                  )}
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function setValue(
    selector,
    value
  ) {
    const field = $(selector);

    if (field) {
      field.value = value || '';
    }
  }

  function resetReferenceForm() {
    $('#literatureReferenceForm')
      ?.reset();

    editingReferenceId = null;

    const title =
      $('#literatureReferenceDialogTitle');

    const submit =
      $('#saveLiteratureReference');

    if (title) {
      title.textContent = t(
        'literature_add_reference_title',
        'Ajouter une référence'
      );
    }

    if (submit) {
      submit.textContent = t(
        'literature_save_reference',
        'Enregistrer la référence'
      );
    }
  }

  function fillReferenceForm(
    reference
  ) {
    setValue(
      '#literatureAuthors',
      reference.authors
    );

    setValue(
      '#literatureYear',
      reference.year
    );

    setValue(
      '#literatureTitle',
      reference.title
    );

    setValue(
      '#literatureSource',
      reference.source
    );

    setValue(
      '#literatureDoi',
      reference.doi
    );

    setValue(
      '#literatureUrl',
      reference.url
    );

    setValue(
      '#literatureKeywords',
      Array.isArray(
        reference.keywords
      )
        ? reference.keywords.join(', ')
        : ''
    );

    setValue(
      '#literatureMethodology',
      reference.methodology
    );

    setValue(
      '#literatureSample',
      reference.sample
    );

    setValue(
      '#literatureResults',
      reference.results
    );

    setValue(
      '#literatureLimitations',
      reference.limitations
    );

    setValue(
      '#literatureContribution',
      reference.contribution
    );

    setValue(
      '#literatureNotes',
      reference.notes
    );
  }

  function openReferenceDialog(
    referenceId = null
  ) {
    resetReferenceForm();

    if (referenceId) {
      const reference =
        referenceById(referenceId);

      if (!reference) return;

      editingReferenceId =
        referenceId;

      fillReferenceForm(reference);

      const title =
        $('#literatureReferenceDialogTitle');

      const submit =
        $('#saveLiteratureReference');

      if (title) {
        title.textContent = t(
          'literature_edit_reference_title',
          'Modifier la référence'
        );
      }

      if (submit) {
        submit.textContent = t(
          'literature_save_changes',
          'Enregistrer les modifications'
        );
      }
    }

    const dialog =
      $('#literatureReferenceDialog');

    if (!dialog) return;

    if (dialog.showModal) {
      dialog.showModal();
    } else {
      dialog.setAttribute(
        'open',
        ''
      );
    }

    $('#literatureAuthors')
      ?.focus();
  }

  function closeReferenceDialog() {
    const dialog =
      $('#literatureReferenceDialog');

    if (!dialog) return;

    if (dialog.close) {
      dialog.close();
    } else {
      dialog.removeAttribute(
        'open'
      );
    }

    resetReferenceForm();
  }

  function collectReferenceForm() {
    return {
      authors: cleanText(
        $('#literatureAuthors')
          ?.value,
        500
      ),

      year: cleanText(
        $('#literatureYear')
          ?.value,
        20
      ),

      title: cleanText(
        $('#literatureTitle')
          ?.value,
        1000
      ),

      source: cleanText(
        $('#literatureSource')
          ?.value,
        500
      ),

      doi: cleanText(
        $('#literatureDoi')
          ?.value,
        500
      ),

      url: cleanText(
        $('#literatureUrl')
          ?.value,
        1500
      ),

      keywords: keywordsToList(
        $('#literatureKeywords')
          ?.value
      ),

      methodology: cleanText(
        $('#literatureMethodology')
          ?.value,
        2000
      ),

      sample: cleanText(
        $('#literatureSample')
          ?.value,
        2000
      ),

      results: cleanText(
        $('#literatureResults')
          ?.value,
        4000
      ),

      limitations: cleanText(
        $('#literatureLimitations')
          ?.value,
        3000
      ),

      contribution: cleanText(
        $('#literatureContribution')
          ?.value,
        3000
      ),

      notes: cleanText(
        $('#literatureNotes')
          ?.value,
        4000
      )
    };
  }

  function saveProjects() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(projects)
    );
  }

  function saveReference() {
    const form =
      $('#literatureReferenceForm');

    if (!form) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data =
      collectReferenceForm();

    if (
      !data.authors ||
      !data.title
    ) {
      return;
    }

    const currentTime =
      nowIso();

    if (editingReferenceId) {
      const reference =
        referenceById(
          editingReferenceId
        );

      if (!reference) return;

      Object.assign(
        reference,
        data,
        {
          updatedAt: currentTime
        }
      );

      showToast(
        t(
          'literature_reference_updated_success',
          'Référence mise à jour avec succès.'
        )
      );
    } else {
      references().unshift({
        id: id(),
        ...data,
        createdAt: currentTime,
        updatedAt: currentTime
      });

      showToast(
        t(
          'literature_reference_added_success',
          'Référence ajoutée avec succès.'
        )
      );
    }

    currentProject.updatedAt =
      currentTime;

    saveProjects();
    closeReferenceDialog();
    renderReferences();
  }

  function deleteReference(
    referenceId
  ) {
    const reference =
      referenceById(referenceId);

    if (!reference) return;

    const confirmed =
      confirm(
        t(
          'literature_delete_confirm',
          'Supprimer cette référence de la revue de littérature ?'
        )
      );

    if (!confirmed) {
      return;
    }

    currentProject
      .literature
      .references =
      references().filter(
        item =>
          item.id !== referenceId
      );

    currentProject.updatedAt =
      nowIso();

    saveProjects();
    renderReferences();

    showToast(
      t(
        'literature_reference_deleted',
        'Référence supprimée.'
      )
    );
  }

  function showMissingProject() {
    const name =
      $('#literatureProjectName');

    const goal =
      $('#literatureProjectGoal');

    const toolbar =
      $('.literature-toolbar');

    const stats =
      $('.literature-stats');

    const empty =
      $('#literatureEmpty');

    const matrix =
      $('#literatureMatrix');

    if (name) {
      name.textContent = t(
        'literature_project_not_found',
        'Projet introuvable'
      );
    }

    if (goal) {
      goal.textContent = t(
        'literature_project_not_found_help',
        'Retournez dans Mes projets et ouvrez de nouveau la revue de littérature.'
      );
    }

    if (toolbar) {
      toolbar.hidden = true;
    }

    if (stats) {
      stats.hidden = true;
    }

    if (empty) {
      empty.hidden = true;
    }

    if (matrix) {
      matrix.hidden = true;
    }
  }

  function bind() {
    $('#literatureSearch')
      ?.addEventListener(
        'input',
        event => {
          literatureSearchQuery =
            event.target.value || '';

          renderReferences();
        }
      );

    $('#addLiteratureReference')
      ?.addEventListener(
        'click',
        () =>
          openReferenceDialog()
      );

    $('#closeLiteratureReferenceDialog')
      ?.addEventListener(
        'click',
        closeReferenceDialog
      );

    $('#cancelLiteratureReference')
      ?.addEventListener(
        'click',
        closeReferenceDialog
      );

    $('#literatureReferenceForm')
      ?.addEventListener(
        'submit',
        event => {
          event.preventDefault();
          saveReference();
        }
      );

    document.addEventListener(
      'click',
      event => {
        const target =
          event.target.closest(
            '[data-action]'
          );

        if (!target) return;

        if (
          target.dataset.action ===
          'edit-literature-reference'
        ) {
          openReferenceDialog(
            target.dataset.reference
          );
        }

        if (
          target.dataset.action ===
          'delete-literature-reference'
        ) {
          deleteReference(
            target.dataset.reference
          );
        }
      }
    );
  }

  function init() {
    projects = readProjects();

    const projectId =
      requestedProjectId();

    currentProject =
      projects.find(
        project =>
          project?.id === projectId
      );

    if (!currentProject) {
      showMissingProject();
      return;
    }

    renderProjectHeader();
    renderReferences();
    bind();
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }
})();
