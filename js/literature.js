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

  // =========================================================
  // LECTURE DES PROJETS
  // =========================================================

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

  // =========================================================
  // ID DU PROJET COURANT
  // =========================================================

  function requestedProjectId() {
    const params = new URLSearchParams(
      window.location.search
    );

    return params.get('project') || '';
  }

  // =========================================================
  // MOTS-CLÉS
  // =========================================================

  function keywordsToList(value) {
    return String(value || '')
      .split(',')
      .map(item => cleanText(item, 100))
      .filter(Boolean)
      .slice(0, 20);
  }

  // =========================================================
  // TOAST
  // =========================================================

  function showToast(message) {
    const toast = $('#toast');

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  // =========================================================
  // RÉFÉRENCES DU PROJET
  // =========================================================

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

  // =========================================================
  // EN-TÊTE DU PROJET
  // =========================================================

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

  // =========================================================
  // TEXTE COURT
  // =========================================================

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

  // =========================================================
  // URL D'OUVERTURE
  // =========================================================

  function referenceOpenUrl(reference) {
    const directUrl = cleanText(
      reference?.url,
      1500
    );

    if (directUrl) {
      return directUrl;
    }

    const doi = cleanText(
      reference?.doi,
      500
    );

    if (!doi) {
      return '';
    }

    return `https://doi.org/${encodeURIComponent(doi)}`;
  }

  // =========================================================
  // LIGNE DE DÉTAIL
  // =========================================================

  function detailRow(label, value) {
    const content = cleanText(
      value,
      6000
    );

    if (!content) {
      return '';
    }

    return `
      <div class="nbprof-reference-detail-row">

        <strong>
          ${escapeHtml(label)}
        </strong>

        <div>
          ${escapeHtml(content)}
        </div>

      </div>
    `;
  }

  // =========================================================
  // FERMER LA FICHE
  // =========================================================

  function closeReferenceDetails() {
    const dialog =
      $('#nbprofReferenceDetailsDialog');

    if (!dialog) return;

    if (dialog.close) {
      dialog.close();
    }

    dialog.remove();
  }

  // =========================================================
  // AFFICHER LA FICHE DÉTAILLÉE
  // =========================================================

  function openReferenceDetails(referenceId) {
    const reference =
      referenceById(referenceId);

    if (!reference) {
      showToast(
        t(
          'literature_reference_not_found',
          'Référence introuvable.'
        )
      );

      return;
    }

    closeReferenceDetails();

    const dialog =
      document.createElement('dialog');

    dialog.id =
      'nbprofReferenceDetailsDialog';

    dialog.className =
      'project-dialog nbprof-reference-details-dialog';

    const authors =
      cleanText(
        reference.authors,
        500
      ) || '—';

    const year =
      cleanText(
        reference.year,
        20
      ) || '—';

    const source =
      cleanText(
        reference.source,
        500
      ) || '—';

    const doi =
      cleanText(
        reference.doi,
        500
      );

    const url =
      referenceOpenUrl(
        reference
      );

    const keywords =
      Array.isArray(
        reference.keywords
      )
        ? reference.keywords
            .map(
              item =>
                cleanText(
                  item,
                  100
                )
            )
            .filter(Boolean)
            .join(', ')
        : '';

    dialog.innerHTML = `
      <div class="nbprof-reference-details-shell">

        <div class="dialog-heading">

          <div>

            <span class="section-kicker">
              ${escapeHtml(
                t(
                  'literature_reference_details_kicker',
                  'Fiche bibliographique'
                )
              )}
            </span>

            <h2>
              ${escapeHtml(
                reference.title ||
                t(
                  'literature_reference',
                  'Référence'
                )
              )}
            </h2>

          </div>

          <button
            type="button"
            class="icon-button"
            id="closeReferenceDetails"
            aria-label="${escapeHtml(
              t(
                'close',
                'Fermer'
              )
            )}"
          >
            ×
          </button>

        </div>

        <div class="nbprof-reference-details-meta">

          <span>
            👤 ${escapeHtml(authors)}
          </span>

          <span>
            📅 ${escapeHtml(year)}
          </span>

          <span>
            📚 ${escapeHtml(source)}
          </span>

        </div>

        <div class="nbprof-reference-details-content">

          ${detailRow(
            t(
              'literature_doi',
              'DOI'
            ),
            doi
          )}

          ${detailRow(
            t(
              'literature_keywords',
              'Mots-clés'
            ),
            keywords
          )}

          ${detailRow(
            t(
              'literature_methodology',
              'Méthodologie'
            ),
            reference.methodology
          )}

          ${detailRow(
            t(
              'literature_sample',
              'Échantillon'
            ),
            reference.sample
          )}

          ${detailRow(
            t(
              'literature_results',
              'Résultats'
            ),
            reference.results
          )}

          ${detailRow(
            t(
              'literature_limitations',
              'Limites'
            ),
            reference.limitations
          )}

          ${detailRow(
            t(
              'literature_contribution',
              'Contribution'
            ),
            reference.contribution
          )}

          ${detailRow(
            t(
              'literature_notes',
              'Notes / résumé'
            ),
            reference.notes
          )}

        </div>

        <div
          class="dialog-actions nbprof-reference-details-actions"
        >

          ${
            url
              ? `
                <a
                  class="secondary-button"
                  href="${escapeHtml(url)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔗 ${escapeHtml(
                    t(
                      'literature_open_article',
                      'Ouvrir l’article'
                    )
                  )}
                </a>
              `
              : ''
          }

          <button
            type="button"
            class="secondary-button"
            data-action="edit-literature-reference"
            data-reference="${escapeHtml(
              reference.id
            )}"
            id="editReferenceFromDetails"
          >
            ✎ ${escapeHtml(
              t(
                'literature_edit_action',
                'Modifier'
              )
            )}
          </button>

          <button
            type="button"
            class="primary-button"
            id="closeReferenceDetailsBottom"
          >
            ${escapeHtml(
              t(
                'close',
                'Fermer'
              )
            )}
          </button>

        </div>

      </div>
    `;

    // =====================================================
    // STYLE DE LA FICHE
    // =====================================================

    const style =
      document.createElement('style');

    style.textContent = `

      .nbprof-reference-details-dialog {
        width:
          min(
            760px,
            calc(100% - 28px)
          );

        max-height:
          88vh;

        overflow:
          auto;
      }

      .nbprof-reference-details-shell {
        padding:
          22px;
      }

      .nbprof-reference-details-meta {
        display:
          flex;

        flex-wrap:
          wrap;

        gap:
          8px 14px;

        margin:
          14px 0 18px;

        color:
          var(
            --muted,
            #94a3b8
          );

        font-size:
          13px;
      }

      .nbprof-reference-details-content {
        display:
          grid;

        gap:
          12px;
      }

      .nbprof-reference-detail-row {
        padding:
          14px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .08
          );

        border-radius:
          14px;

        background:
          rgba(
            255,
            255,
            255,
            .025
          );
      }

      .nbprof-reference-detail-row strong {
        display:
          block;

        margin-bottom:
          6px;

        color:
          var(
            --accent,
            #42d4ff
          );

        font-size:
          12px;
      }

      .nbprof-reference-detail-row div {
        color:
          var(
            --text,
            #f8fafc
          );

        line-height:
          1.6;

        white-space:
          pre-wrap;

        overflow-wrap:
          anywhere;
      }

      .nbprof-reference-details-actions {
        margin-top:
          20px;

        flex-wrap:
          wrap;
      }

      .literature-row-actions
      .literature-view-reference,

      .literature-row-actions
      .literature-open-reference {
        white-space:
          nowrap;
      }

    `;

    dialog.appendChild(
      style
    );

    document.body.appendChild(
      dialog
    );

    $('#closeReferenceDetails')
      ?.addEventListener(
        'click',
        closeReferenceDetails
      );

    $('#closeReferenceDetailsBottom')
      ?.addEventListener(
        'click',
        closeReferenceDetails
      );

    $('#editReferenceFromDetails')
      ?.addEventListener(
        'click',
        () => {
          closeReferenceDetails();

          openReferenceDialog(
            reference.id
          );
        }
      );

    dialog.addEventListener(
      'click',
      event => {
        if (
          event.target === dialog
        ) {
          closeReferenceDetails();
        }
      }
    );

    if (dialog.showModal) {
      dialog.showModal();
    } else {
      dialog.setAttribute(
        'open',
        ''
      );
    }
  }

  // =========================================================
  // RECHERCHE DANS LA LITTÉRATURE
  // =========================================================

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

      ...(
        Array.isArray(
          reference.keywords
        )
          ? reference.keywords
          : []
      )
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableContent.includes(
      query
    );
  }

  // =========================================================
  // AFFICHAGE DES RÉFÉRENCES
  // =========================================================

  function renderReferences() {
    const allItems =
      references();

    const items =
      allItems.filter(
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
        String(
          allItems.length
        );
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

    body.innerHTML =
      items
        .map(
          reference => {
            return `
              <tr>

                <td>
                  ${escapeHtml(
                    reference.authors ||
                    '—'
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    reference.year ||
                    '—'
                  )}
                </td>

                <td>
                  <strong>
                    ${escapeHtml(
                      reference.title ||
                      '—'
                    )}
                  </strong>
                </td>

                <td>
                  ${escapeHtml(
                    reference.source ||
                    '—'
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

                    <!-- VOIR LA FICHE -->

                    <button
                      type="button"
                      class="edit-project literature-view-reference"
                      data-action="view-literature-reference"
                      data-reference="${escapeHtml(
                        reference.id
                      )}"
                    >
                      👁 ${escapeHtml(
                        t(
                          'literature_view_action',
                          'Voir la fiche'
                        )
                      )}
                    </button>

                    <!-- OUVRIR L'ARTICLE -->

                    ${
                      referenceOpenUrl(
                        reference
                      )
                        ? `
                          <a
                            class="edit-project literature-open-reference"
                            href="${escapeHtml(
                              referenceOpenUrl(
                                reference
                              )
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            🔗 ${escapeHtml(
                              t(
                                'literature_open_action',
                                'Ouvrir'
                              )
                            )}
                          </a>
                        `
                        : ''
                    }

                    <!-- MODIFIER -->

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

                    <!-- SUPPRIMER -->

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
          }
        )
        .join('');
  }

  // =========================================================
  // UTILITAIRE FORMULAIRE
  // =========================================================

  function setValue(
    selector,
    value
  ) {
    const field =
      $(selector);

    if (field) {
      field.value =
        value || '';
    }
  }

  // =========================================================
  // RÉINITIALISER LE FORMULAIRE
  // =========================================================

  function resetReferenceForm() {
    $('#literatureReferenceForm')
      ?.reset();

    editingReferenceId =
      null;

    const title =
      $('#literatureReferenceDialogTitle');

    const submit =
      $('#saveLiteratureReference');

    if (title) {
      title.textContent =
        t(
          'literature_add_reference_title',
          'Ajouter une référence'
        );
    }

    if (submit) {
      submit.textContent =
        t(
          'literature_save_reference',
          'Enregistrer la référence'
        );
    }
  }

  // =========================================================
  // REMPLIR LE FORMULAIRE
  // =========================================================

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
        ? reference.keywords
            .join(', ')
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

  // =========================================================
  // OUVRIR LE FORMULAIRE
  // =========================================================

  function openReferenceDialog(
    referenceId = null
  ) {
    resetReferenceForm();

    if (referenceId) {
      const reference =
        referenceById(
          referenceId
        );

      if (!reference) return;

      editingReferenceId =
        referenceId;

      fillReferenceForm(
        reference
      );

      const title =
        $('#literatureReferenceDialogTitle');

      const submit =
        $('#saveLiteratureReference');

      if (title) {
        title.textContent =
          t(
            'literature_edit_reference_title',
            'Modifier la référence'
          );
      }

      if (submit) {
        submit.textContent =
          t(
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

  // =========================================================
  // FERMER LE FORMULAIRE
  // =========================================================

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

  // =========================================================
  // COLLECTER LE FORMULAIRE
  // =========================================================

  function collectReferenceForm() {
    return {

      authors:
        cleanText(
          $('#literatureAuthors')
            ?.value,
          500
        ),

      year:
        cleanText(
          $('#literatureYear')
            ?.value,
          20
        ),

      title:
        cleanText(
          $('#literatureTitle')
            ?.value,
          1000
        ),

      source:
        cleanText(
          $('#literatureSource')
            ?.value,
          500
        ),

      doi:
        cleanText(
          $('#literatureDoi')
            ?.value,
          500
        ),

      url:
        cleanText(
          $('#literatureUrl')
            ?.value,
          1500
        ),

      keywords:
        keywordsToList(
          $('#literatureKeywords')
            ?.value
        ),

      methodology:
        cleanText(
          $('#literatureMethodology')
            ?.value,
          2000
        ),

      sample:
        cleanText(
          $('#literatureSample')
            ?.value,
          2000
        ),

      results:
        cleanText(
          $('#literatureResults')
            ?.value,
          4000
        ),

      limitations:
        cleanText(
          $('#literatureLimitations')
            ?.value,
          3000
        ),

      contribution:
        cleanText(
          $('#literatureContribution')
            ?.value,
          3000
        ),

      notes:
        cleanText(
          $('#literatureNotes')
            ?.value,
          4000
        )

    };
  }

  // =========================================================
  // SAUVEGARDER LES PROJETS
  // =========================================================

  function saveProjects() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        projects
      )
    );
  }

  // =========================================================
  // ENREGISTRER UNE RÉFÉRENCE
  // =========================================================

  function saveReference() {
    const form =
      $('#literatureReferenceForm');

    if (!form) return;

    if (
      !form.checkValidity()
    ) {
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

    // MODIFICATION

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
          updatedAt:
            currentTime
        }
      );

      showToast(
        t(
          'literature_reference_updated_success',
          'Référence mise à jour avec succès.'
        )
      );
    }

    // AJOUT

    else {
      references().unshift(
        {
          id:
            id(),

          ...data,

          createdAt:
            currentTime,

          updatedAt:
            currentTime
        }
      );

      showToast(
        t(
          'literature_reference_added_success',
          'Référence ajoutée avec succès.'
        )
      );

    currentProject.updatedAt =
      currentTime;

    saveProjects();

    closeReferenceDialog();

    renderReferences();
  }

  // =========================================================
  // SUPPRIMER UNE RÉFÉRENCE
  // =========================================================

  function deleteReference(
    referenceId
  ) {
    const reference =
      referenceById(
        referenceId
      );

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
      references()
        .filter(
          item =>
            item.id !==
            referenceId
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

  // =========================================================
  // PROJET INTROUVABLE
  // =========================================================

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
      name.textContent =
        t(
          'literature_project_not_found',
          'Projet introuvable'
        );
    }

    if (goal) {
      goal.textContent =
        t(
          'literature_project_not_found_help',
          'Retournez dans Mes projets et ouvrez de nouveau la revue de littérature.'
        );
    }

    if (toolbar) {
      toolbar.hidden =
        true;
    }

    if (stats) {
      stats.hidden =
        true;
    }

    if (empty) {
      empty.hidden =
        true;
    }

    if (matrix) {
      matrix.hidden =
        true;
    }
  }

  // =========================================================
  // ÉVÉNEMENTS
  // =========================================================

  function bind() {

    // RECHERCHE

    $('#literatureSearch')
      ?.addEventListener(
        'input',
        event => {
          literatureSearchQuery =
            event.target.value ||
            '';

          renderReferences();
        }
      );

    // AJOUT MANUEL

    $('#addLiteratureReference')
      ?.addEventListener(
        'click',
        () =>
          openReferenceDialog()
      );

    // FERMER DIALOG

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

    // ENREGISTRER

    $('#literatureReferenceForm')
      ?.addEventListener(
        'submit',
        event => {
          event.preventDefault();

          saveReference();
        }
      );

    // ACTIONS SUR LES RÉFÉRENCES

    document.addEventListener(
      'click',
      event => {
        const target =
          event.target.closest(
            '[data-action]'
          );

        if (!target) return;

        // VOIR LA FICHE

        if (
          target.dataset.action ===
          'view-literature-reference'
        ) {
          openReferenceDetails(
            target.dataset.reference
          );

          return;
        }

        // MODIFIER

        if (
          target.dataset.action ===
          'edit-literature-reference'
        ) {
          openReferenceDialog(
            target.dataset.reference
          );

          return;
        }

        // SUPPRIMER

        if (
          target.dataset.action ===
          'delete-literature-reference'
        ) {
          deleteReference(
            target.dataset.reference
          );

          return;
        }
      }
    );
  }

  // =========================================================
  // INITIALISATION
  // =========================================================

  function init() {
    projects =
      readProjects();

    const projectId =
      requestedProjectId();

    currentProject =
      projects.find(
        project =>
          project?.id ===
          projectId
      );

    if (!currentProject) {
      showMissingProject();

      return;
    }

    renderProjectHeader();

    renderReferences();

    bind();
  }

  // =========================================================
  // DÉMARRAGE
  // =========================================================

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
