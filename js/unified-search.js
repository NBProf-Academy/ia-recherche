(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const base = () => document.documentElement.dataset.basePath || './';
  const lang = () => window.NBProfI18n?.getLanguage?.() || 'fr';
  const t = (key, fallback = '') =>
    window.NBProfI18n?.t?.(key, fallback) || fallback || key;

  const SAVED_ARTICLES_KEY = 'nbprof_saved_articles_v1';
  const PROJECTS_STORAGE_KEY = 'nbprof-research-projects-v1';

  let publications = [];
  let tools = [];
  let currentQuery = '';
  let lastResults = [];
  let activeFilter = 'all';
  let requestSerial = 0;

  // =========================================================
  // UTILITAIRES
  // =========================================================

  const STOPWORDS = new Set(
    `a à au aux avec ce ces dans de des du elle en et eux il je la le les leur lui ma mais me même mes moi mon ne nos notre nous on ou par pas pour qu que quelle quelles quel quels qui sa sans se ses son sur ta te tes toi ton tu un une vos votre vous c est sont être the a an and or of in on for to with from by as is are was were be been this that these those into about using use study research article paper etude étude recherche les des une dans pour sur par avec entre selon vers comme their its our your they them we you`
      .split(/\s+/)
  );

  function normalize(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .trim();
  }

  function tokens(value = '') {
    return [
      ...new Set(
        normalize(value)
          .split(/\s+/)
          .filter(
            (word) =>
              word.length > 2 &&
              !STOPWORDS.has(word)
          )
      )
    ];
  }

  function textScore(query, text) {
    const queryTokens = tokens(query);

    if (!queryTokens.length) {
      return 0;
    }

    const normalizedText =
      normalize(text);

    let matched = 0;

    queryTokens.forEach((term) => {
      if (
        normalizedText.includes(term)
      ) {
        matched += 1;
      }
    });

    return Math.round(
      (matched / queryTokens.length) *
      100
    );
  }

  function escapeHtml(value = '') {
    return String(value).replace(
      /[&<>'"]/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[char])
    );
  }

  function cleanText(
    value,
    maxLength = 1000
  ) {
    return String(value || '')
      .trim()
      .slice(0, maxLength);
  }

  function relevanceLabel(score) {
    if (score >= 78) {
      return t(
        'unified_relevance_high',
        'Très pertinent'
      );
    }

    if (score >= 52) {
      return t(
        'unified_relevance_medium',
        'Pertinent'
      );
    }

    return t(
      'unified_relevance_explore',
      'À explorer'
    );
  }

  function sourceLabel(item) {
    if (item.kind === 'nbprof') {
      return t(
        'unified_source_nbprof',
        'Publication NBProf'
      );
    }

    if (item.kind === 'tool') {
      return t(
        'unified_source_tool',
        'Outil scientifique'
      );
    }

    return (
      item.source ||
      t(
        'unified_source_academic',
        'Article scientifique'
      )
    );
  }

  function abstractFor(publication) {
    return (
      publication.abstract?.[lang()] ||
      publication.abstract?.fr ||
      ''
    );
  }

  function publicationHaystack(
    publication
  ) {
    return [
      publication.title,
      publication.subtitle,
      (
        publication.authors || []
      ).join(' '),
      publication.journal,
      (
        publication.keywords || []
      ).join(' '),
      abstractFor(publication)
    ].join(' ');
  }

  // =========================================================
  // ARTICLES ENREGISTRÉS
  // =========================================================

  function getSavedArticles() {
    try {
      const raw =
        localStorage.getItem(
          SAVED_ARTICLES_KEY
        );

      if (!raw) {
        return [];
      }

      const data =
        JSON.parse(raw);

      return Array.isArray(data)
        ? data
        : [];
    } catch (error) {
      console.warn(
        'NBProf saved articles read error',
        error
      );

      return [];
    }
  }

  function setSavedArticles(items) {
    try {
      localStorage.setItem(
        SAVED_ARTICLES_KEY,
        JSON.stringify(items)
      );

      window.dispatchEvent(
        new CustomEvent(
          'nbprof:savedarticleschange',
          {
            detail: {
              count: items.length
            }
          }
        )
      );
    } catch (error) {
      console.warn(
        'NBProf saved articles write error',
        error
      );
    }
  }

  function articleKey(item) {
    if (item.doi) {
      return `doi:${normalize(
        item.doi
      )}`;
    }

    return `title:${normalize(
      item.title || ''
    ).slice(0, 160)}`;
  }

  function isSaved(item) {
    const key =
      articleKey(item);

    return getSavedArticles().some(
      (saved) =>
        saved.id === key
    );
  }

  function articleForStorage(item) {
    return {
      id:
        articleKey(item),

      kind:
        item.kind || 'academic',

      title:
        item.title || '',

      subtitle:
        item.subtitle || '',

      authors:
        Array.isArray(item.authors)
          ? item.authors
          : [],

      year:
        item.year || null,

      journal:
        item.journal || '',

      url:
        item.url || '',

      doi:
        item.doi || '',

      abstract:
        item.abstract || '',

      source:
        item.source || '',

      pdf:
        item.pdf || '',

      citationCount:
        item.citationCount || 0,

      savedAt:
        new Date().toISOString()
    };
  }

  function saveArticle(item) {
    const saved =
      getSavedArticles();

    const key =
      articleKey(item);

    if (
      saved.some(
        (article) =>
          article.id === key
      )
    ) {
      return false;
    }

    saved.unshift(
      articleForStorage(item)
    );

    setSavedArticles(saved);

    return true;
  }

  function removeSavedArticle(item) {
    const key =
      articleKey(item);

    const updated =
      getSavedArticles().filter(
        (article) =>
          article.id !== key
      );

    setSavedArticles(updated);

    return true;
  }

  function toggleSavedArticle(item) {
    if (isSaved(item)) {
      removeSavedArticle(item);

      showMessage(
        t(
          'unified_removed_saved',
          'Article retiré des éléments enregistrés.'
        )
      );

      return;
    }

    saveArticle(item);

    showMessage(
      t(
        'unified_article_saved',
        'Article enregistré avec succès.'
      )
    );
  }

  function showMessage(message) {
    document
      .querySelector(
        '.nbprof-save-toast'
      )
      ?.remove();

    const toast =
      document.createElement('div');

    toast.className =
      'nbprof-save-toast';

    toast.textContent =
      message;

    Object.assign(
      toast.style,
      {
        position: 'fixed',
        left: '50%',
        bottom: '24px',
        transform:
          'translateX(-50%)',

        zIndex: '99999',

        padding:
          '12px 18px',

        borderRadius:
          '12px',

        background:
          '#111827',

        color:
          '#ffffff',

        border:
          '1px solid rgba(66,212,255,.35)',

        boxShadow:
          '0 10px 30px rgba(0,0,0,.35)',

        fontSize:
          '14px',

        fontWeight:
          '700',

        maxWidth:
          '90vw',

        textAlign:
          'center'
      }
    );

    document.body.appendChild(
      toast
    );

    setTimeout(
      () => toast.remove(),
      2200
    );
  }

  // =========================================================
  // MES PROJETS
  // =========================================================

  function getResearchProjects() {
    try {
      const raw =
        localStorage.getItem(
          PROJECTS_STORAGE_KEY
        );

      if (!raw) {
        return [];
      }

      const data =
        JSON.parse(raw);

      return Array.isArray(data)
        ? data
        : [];
    } catch (error) {
      console.warn(
        'NBProf projects read error',
        error
      );

      return [];
    }
  }

  function saveResearchProjects(
    projects
  ) {
    try {
      localStorage.setItem(
        PROJECTS_STORAGE_KEY,
        JSON.stringify(projects)
      );

      return true;
    } catch (error) {
      console.warn(
        'NBProf projects write error',
        error
      );

      return false;
    }
  }

  function newProjectId() {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  function articleReferenceId(item) {
    if (item.doi) {
      return `doi-${normalize(
        item.doi
      )}`;
    }

    return `article-${normalize(
      item.title || ''
    ).slice(0, 80)}`;
  }

  function articleToLiteratureReference(
    item
  ) {
    const timestamp =
      new Date().toISOString();

    return {
      id:
        articleReferenceId(item),

      authors:
        Array.isArray(item.authors)
          ? item.authors.join(', ')
          : '',

      year:
        item.year
          ? String(item.year)
          : '',

      title:
        cleanText(
          item.title,
          1000
        ),

      source:
        cleanText(
          item.journal ||
          item.source ||
          '',
          500
        ),

      doi:
        cleanText(
          item.doi || '',
          500
        ),

      url:
        cleanText(
          item.url ||
          item.pdf ||
          '',
          1500
        ),

      keywords: [],

      methodology: '',

      sample: '',

      results: '',

      limitations: '',

      contribution: '',

      notes:
        cleanText(
          item.abstract || '',
          4000
        ),

      createdAt:
        timestamp,

      updatedAt:
        timestamp
    };
  }

  function sameReference(
    existing,
    article
  ) {
    const existingDoi =
      normalize(
        existing?.doi || ''
      );

    const articleDoi =
      normalize(
        article?.doi || ''
      );

    if (
      existingDoi &&
      articleDoi &&
      existingDoi === articleDoi
    ) {
      return true;
    }

    const existingTitle =
      normalize(
        existing?.title || ''
      );

    const articleTitle =
      normalize(
        article?.title || ''
      );

    return Boolean(
      existingTitle &&
      articleTitle &&
      existingTitle === articleTitle
    );
  }

  function addArticleToProject(
    projectId,
    item
  ) {
    const projects =
      getResearchProjects();

    const project =
      projects.find(
        (entry) =>
          entry.id === projectId
      );

    if (!project) {
      return {
        success: false,
        reason:
          'PROJECT_NOT_FOUND'
      };
    }

    if (!project.literature) {
      project.literature = {
        references: []
      };
    }

    if (
      !Array.isArray(
        project.literature.references
      )
    ) {
      project.literature.references = [];
    }

    const duplicate =
      project.literature.references.some(
        (reference) =>
          sameReference(
            reference,
            item
          )
      );

    if (duplicate) {
      return {
        success: false,
        reason:
          'ALREADY_EXISTS',
        project
      };
    }

    project.literature.references.unshift(
      articleToLiteratureReference(
        item
      )
    );

    project.updatedAt =
      new Date().toISOString();

    saveResearchProjects(
      projects
    );

    return {
      success: true,
      project
    };
  }

  function createProjectFromSearch(
    name
  ) {
    const projectName =
      String(name || '').trim();

    if (!projectName) {
      return null;
    }

    const projects =
      getResearchProjects();

    const createdAt =
      new Date().toISOString();

    const project = {
      id:
        newProjectId(),

      name:
        projectName.slice(
          0,
          120
        ),

      goal: '',

      stage:
        'exploration',

      exploration: {
        initialIdea: '',
        problem: '',
        mainQuestion: '',
        secondaryQuestions: [],
        generalObjective: '',
        specificObjectives: [],
        keywords: [],
        population: '',
        field: '',
        geography: '',
        period: '',
        discipline: '',
        scientificInterest: '',
        practicalInterest: '',
        limits: ''
      },

      literature: {
        references: []
      },

      archived:
        false,

      archivedAt:
        '',

      milestones: [],

      tasks: [],

      notes: '',

      createdAt,

      updatedAt:
        createdAt
    };

    projects.unshift(
      project
    );

    saveResearchProjects(
      projects
    );

    return project;
  }

  function closeProjectPicker() {
    const dialog =
      document.getElementById(
        'nbprofProjectPicker'
      );

    if (!dialog) {
      return;
    }

    if (
      typeof dialog.close ===
      'function'
    ) {
      dialog.close();
    }

    dialog.remove();
  }

  function openProjectPicker(item) {
    closeProjectPicker();

    const projects =
      getResearchProjects().filter(
        (project) =>
          !project.archived
      );

    const dialog =
      document.createElement(
        'dialog'
      );

    dialog.id =
      'nbprofProjectPicker';

    dialog.style.cssText = `
      width:min(560px,calc(100% - 28px));
      max-height:85vh;
      overflow:auto;
      padding:0;
      border:1px solid rgba(66,212,255,.25);
      border-radius:20px;
      background:#111827;
      color:#fff;
      box-shadow:0 25px 70px rgba(0,0,0,.55);
    `;

    const projectsMarkup =
      projects.length
        ? projects
            .map(
              (project) => `
                <button
                  type="button"
                  data-project-choice="${escapeHtml(
                    project.id
                  )}"
                  style="
                    width:100%;
                    text-align:left;
                    padding:14px;
                    margin-bottom:10px;
                    border-radius:12px;
                    border:1px solid rgba(255,255,255,.08);
                    background:#0b1220;
                    color:#fff;
                    cursor:pointer;
                  "
                >
                  <strong>
                    ${escapeHtml(
                      project.name
                    )}
                  </strong>

                  ${
                    project.goal
                      ? `
                        <div
                          style="
                            margin-top:5px;
                            color:#94a3b8;
                            font-size:12px;
                          "
                        >
                          ${escapeHtml(
                            project.goal
                          )}
                        </div>
                      `
                      : ''
                  }
                </button>
              `
            )
            .join('')
        : `
          <div
            style="
              padding:18px;
              text-align:center;
              color:#94a3b8;
            "
          >
            Aucun projet disponible.
            Créez votre premier projet
            ci-dessous.
          </div>
        `;

    dialog.innerHTML = `
      <div style="padding:22px;">

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:15px;
            margin-bottom:20px;
          "
        >

          <div>
            <div
              style="
                color:#42d4ff;
                font-size:11px;
                font-weight:800;
                text-transform:uppercase;
                letter-spacing:.08em;
              "
            >
              Recherche NBProf
            </div>

            <h2
              style="
                margin:6px 0 0;
                font-size:22px;
              "
            >
              Ajouter au projet
            </h2>
          </div>

          <button
            id="nbprofCloseProjectPicker"
            type="button"
            style="
              border:0;
              background:transparent;
              color:white;
              font-size:25px;
              cursor:pointer;
            "
          >
            ×
          </button>

        </div>

        <div
          style="
            margin-bottom:18px;
            color:#cbd5e1;
            font-size:14px;
            line-height:1.5;
          "
        >
          ${escapeHtml(
            item.title || ''
          )}
        </div>

        <div
          id="nbprofProjectChoices"
        >
          ${projectsMarkup}
        </div>

        <div
          style="
            border-top:1px solid rgba(255,255,255,.08);
            margin-top:20px;
            padding-top:20px;
          "
        >

          <strong>
            Créer un nouveau projet
          </strong>

          <div
            style="
              display:flex;
              gap:8px;
              margin-top:12px;
            "
          >

            <input
              id="nbprofNewProjectName"
              type="text"
              maxlength="120"
              placeholder="Titre du nouveau projet"
              style="
                flex:1;
                min-width:0;
                padding:12px;
                border-radius:10px;
                border:1px solid rgba(255,255,255,.12);
                background:#03040a;
                color:#fff;
                outline:none;
              "
            >

            <button
              id="nbprofCreateAndAdd"
              type="button"
              style="
                border:0;
                border-radius:10px;
                padding:0 14px;
                background:#42d4ff;
                color:#03040a;
                font-weight:800;
                cursor:pointer;
              "
            >
              Créer
            </button>

          </div>

        </div>

      </div>
    `;

    document.body.appendChild(
      dialog
    );

    dialog
      .querySelector(
        '#nbprofCloseProjectPicker'
      )
      ?.addEventListener(
        'click',
        closeProjectPicker
      );

    dialog
      .querySelectorAll(
        '[data-project-choice]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () => {
              const result =
                addArticleToProject(
                  button.dataset
                    .projectChoice,
                  item
                );

              if (result.success) {
                showMessage(
                  `Article ajouté au projet « ${result.project.name} ».`
                );

                closeProjectPicker();

                return;
              }

              if (
                result.reason ===
                'ALREADY_EXISTS'
              ) {
                showMessage(
                  `Cet article existe déjà dans « ${result.project.name} ».`
                );

                return;
              }

              showMessage(
                'Impossible d’ajouter cet article au projet.'
              );
            }
          );
        }
      );

    dialog
      .querySelector(
        '#nbprofCreateAndAdd'
      )
      ?.addEventListener(
        'click',
        () => {
          const input =
            dialog.querySelector(
              '#nbprofNewProjectName'
            );

          const project =
            createProjectFromSearch(
              input?.value
            );

          if (!project) {
            input?.focus();
            return;
          }

          const result =
            addArticleToProject(
              project.id,
              item
            );

          if (result.success) {
            showMessage(
              `Projet « ${project.name} » créé et article ajouté.`
            );

            closeProjectPicker();
          }
        }
      );

    dialog.addEventListener(
      'click',
      (event) => {
        if (
          event.target === dialog
        ) {
          closeProjectPicker();
        }
      }
    );

    if (
      typeof dialog.showModal ===
      'function'
    ) {
      dialog.showModal();
    } else {
      dialog.setAttribute(
        'open',
        ''
      );
    }
  }

  // =========================================================
  // CHARGEMENT DES SOURCES
  // =========================================================

  async function loadCatalogs() {
    try {
      const [
        publicationData,
        toolData
      ] =
        await Promise.all([
          fetch(
            `${base()}data/publications.json`,
            {
              cache:
                'no-store'
            }
          ).then(
            (response) =>
              response.ok
                ? response.json()
                : []
          ),

          fetch(
            `${base()}data/tools.json`,
            {
              cache:
                'no-store'
            }
          ).then(
            (response) =>
              response.ok
                ? response.json()
                : []
          )
        ]);

      publications =
        Array.isArray(
          publicationData
        )
          ? publicationData
          : [];

      tools =
        Array.isArray(
          toolData
        )
          ? toolData
          : [];
    } catch (error) {
      console.warn(
        'NBProf unified search catalogs',
        error
      );
    }
  }

  function localResults(query) {
    const own =
      publications
        .map(
          (publication) => {
            const score =
              textScore(
                query,
                publicationHaystack(
                  publication
                )
              );

            return {
              kind:
                'nbprof',

              score:
                Math.min(
                  100,
                  score + 20
                ),

              title:
                publication.title,

              subtitle:
                publication.subtitle ||
                '',

              authors:
                publication.authors ||
                [],

              year:
                publication.year,

              journal:
                publication.journal ||
                '',

              url:
                publication.url ||
                '',

              doi:
                publication.doi ||
                '',

              abstract:
                abstractFor(
                  publication
                ),

              source:
                'NBProf',

              priority:
                publication.priority ||
                100,

              pdf:
                publication.pdf ||
                ''
            };
          }
        )
        .filter(
          (item) =>
            item.score >= 35
        )
        .sort(
          (a, b) =>
            (
              b.priority -
              a.priority
            ) ||
            (
              b.score -
              a.score
            )
        );

    const toolResults =
      tools
        .map(
          (tool) => {
            const description =
              tool.description?.[
                lang()
              ] ||
              tool.description?.fr ||
              '';

            const score =
              textScore(
                query,
                `${tool.name} ${description} ${tool.category || ''}`
              );

            return {
              kind:
                'tool',

              score:
                Math.min(
                  91,
                  score
                ),

              title:
                tool.name,

              abstract:
                description,

              url:
                tool.url,

              source:
                'NBProf Research Hub',

              year:
                null,

              authors:
                [],

              journal:
                '',

              pdf:
                ''
            };
          }
        )
        .filter(
          (item) =>
            item.score >= 45
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        )
        .slice(
          0,
          6
        );

    return [
      ...own,
      ...toolResults
    ];
  }

  // =========================================================
  // SEMANTIC SCHOLAR
  // =========================================================

  function semanticScholarItem(
    paper,
    index,
    query
  ) {
    const authors =
      (
        paper.authors || []
      )
        .map(
          (author) =>
            author.name
        )
        .filter(Boolean);

    const doi =
      paper.externalIds
        ?.DOI ||
      '';

    const rawScore =
      textScore(
        query,
        `${paper.title || ''} ${paper.abstract || ''} ${authors.join(' ')} ${paper.venue || ''}`
      );

    const rankBonus =
      Math.max(
        0,
        22 -
        index * 2
      );

    const score =
      Math.max(
        38,
        Math.min(
          96,
          Math.round(
            rawScore *
            .72 +
            rankBonus +
            18
          )
        )
      );

    return {
      kind:
        'academic',

      score,

      title:
        paper.title ||
        t(
          'unified_untitled',
          'Sans titre'
        ),

      authors,

      year:
        paper.year ||
        null,

      journal:
        paper.venue ||
        '',

      url:
        paper.url ||
        (
          doi
            ? `https://doi.org/${doi}`
            : ''
        ),

      doi,

      abstract:
        paper.abstract ||
        '',

      source:
        'Semantic Scholar',

      citationCount:
        paper.citationCount ||
        0,

      pdf:
        paper.openAccessPdf
          ?.url ||
        ''
    };
  }

  async function semanticScholar(
    query,
    signal
  ) {
    const params =
      new URLSearchParams(
        {
          query,
          limit:
            '8',

          fields:
            'title,authors,year,abstract,url,externalIds,citationCount,openAccessPdf,venue'
        }
      );

    const response =
      await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
        {
          signal,

          headers: {
            Accept:
              'application/json'
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `Semantic Scholar ${response.status}`
      );
    }

    const data =
      await response.json();

    return (
      data.data || []
    ).map(
      (paper, index) =>
        semanticScholarItem(
          paper,
          index,
          query
        )
    );
  }

  // =========================================================
  // CROSSREF
  // =========================================================

  function crossrefItem(
    paper,
    index,
    query
  ) {
    const title =
      Array.isArray(
        paper.title
      )
        ? paper.title[0] ||
          ''
        : paper.title ||
          '';

    const authors =
      (
        paper.author || []
      )
        .map(
          (author) =>
            [
              author.given,
              author.family
            ]
              .filter(Boolean)
              .join(' ')
        )
        .filter(Boolean);

    const journal =
      Array.isArray(
        paper[
          'container-title'
        ]
      )
        ? paper[
            'container-title'
          ][0] ||
          ''
        : paper[
            'container-title'
          ] ||
          '';

    const year =
      paper.published?.[
        'date-parts'
      ]?.[0]?.[0] ||
      paper.issued?.[
        'date-parts'
      ]?.[0]?.[0] ||
      null;

    const doi =
      paper.DOI ||
      '';

    const rawScore =
      textScore(
        query,
        `${title} ${authors.join(' ')} ${journal}`
      );

    const rankBonus =
      Math.max(
        0,
        20 -
        index * 2
      );

    const score =
      Math.max(
        35,
        Math.min(
          91,
          Math.round(
            rawScore *
            .68 +
            rankBonus +
            16
          )
        )
      );

    return {
      kind:
        'academic',

      score,

      title:
        title ||
        t(
          'unified_untitled',
          'Sans titre'
        ),

      authors,

      year,

      journal,

      url:
        doi
          ? `https://doi.org/${doi}`
          : (
              paper.URL ||
              ''
            ),

      doi,

      abstract:
        '',

      source:
        'Crossref',

      citationCount:
        paper[
          'is-referenced-by-count'
        ] ||
        0,

      pdf:
        ''
    };
  }

  async function crossref(
    query,
    signal
  ) {
    const params =
      new URLSearchParams(
        {
          'query.bibliographic':
            query,

          rows:
            '8',

          select:
            'DOI,title,author,published,issued,container-title,URL,is-referenced-by-count'
        }
      );

    const response =
      await fetch(
        `https://api.crossref.org/works?${params}`,
        {
          signal,

          headers: {
            Accept:
              'application/json'
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `Crossref ${response.status}`
      );
    }

    const data =
      await response.json();

    return (
      data.message?.items || []
    ).map(
      (paper, index) =>
        crossrefItem(
          paper,
          index,
          query
        )
    );
  }

  function dedupe(items) {
    const seen =
      new Set();

    return items.filter(
      (item) => {
        const key =
          item.doi
            ? `doi:${normalize(
                item.doi
              )}`
            : `title:${normalize(
                item.title
              ).slice(0, 140)}`;

        if (
          !key ||
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        return true;
      }
    );
  }

  // =========================================================
  // AFFICHAGE
  // =========================================================

  function metaText(item) {
    const bits = [];

    if (item.authors?.length) {
      bits.push(
        item.authors
          .slice(0, 3)
          .join(', ') +
        (
          item.authors.length > 3
            ? ' et al.'
            : ''
        )
      );
    }

    if (item.year) {
      bits.push(
        item.year
      );
    }

    if (item.journal) {
      bits.push(
        item.journal
      );
    }

    return bits.join(
      ' · '
    );
  }

  function card(item) {
    const source =
      escapeHtml(
        sourceLabel(item)
      );

    const title =
      escapeHtml(
        item.title || ''
      );

    const meta =
      escapeHtml(
        metaText(item)
      );

    const abstract =
      escapeHtml(
        (
          item.abstract || ''
        ).trim()
      );

    const url =
      escapeHtml(
        item.url || ''
      );

    const pdf =
      escapeHtml(
        item.pdf || ''
      );

    const score =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            item.score || 0
          )
        )
      );

    const key =
      escapeHtml(
        articleKey(item)
      );

    const saved =
      item.kind !== 'tool' &&
      isSaved(item);

    const saveButton =
      item.kind === 'tool'
        ? ''
        : `
          <button
            type="button"
            class="secondary-button unified-save-button"
            data-save-key="${key}"
            aria-pressed="${saved ? 'true' : 'false'}"
          >
            ${
              saved
                ? `✓ ${escapeHtml(
                    t(
                      'unified_saved',
                      'Enregistré'
                    )
                  )}`
                : `♡ ${escapeHtml(
                    t(
                      'unified_save',
                      'Enregistrer'
                    )
                  )}`
            }
          </button>
        `;

    const projectButton =
      item.kind === 'tool'
        ? ''
        : `
          <button
            type="button"
            class="secondary-button unified-project-button"
            data-project-key="${key}"
          >
            ＋ Ajouter au projet
          </button>
        `;

    return `
      <article
        class="unified-result-card unified-result-card--${escapeHtml(
          item.kind || 'academic'
        )}"
      >

        <div
          class="unified-result-card__top"
        >

          <span
            class="unified-source-badge"
          >
            ${source}
          </span>

          <span
            class="unified-relevance"
            title="${escapeHtml(
              t(
                'unified_relevance_explanation',
                'Estimation basée sur la correspondance entre votre requête et les métadonnées disponibles.'
              )
            )}"
          >
            ${escapeHtml(
              relevanceLabel(
                score
              )
            )}
          </span>

        </div>

        <h3>
          ${title}
        </h3>

        ${
          meta
            ? `
              <div
                class="unified-meta"
              >
                ${meta}
              </div>
            `
            : ''
        }

        ${
          abstract
            ? `
              <p>
                ${
                  abstract.length > 420
                    ? `${abstract.slice(
                        0,
                        417
                      )}…`
                    : abstract
                }
              </p>
            `
            : ''
        }

        <div
          class="unified-result-actions"
        >

          ${
            url
              ? `
                <a
                  class="secondary-button"
                  href="${url}"
                >
                  ${escapeHtml(
                    t(
                      'unified_open',
                      'Ouvrir'
                    )
                  )} ↗
                </a>
              `
              : ''
          }

          ${
            pdf
              ? `
                <a
                  class="secondary-button"
                  href="${pdf}"
                >
                  PDF ↗
                </a>
              `
              : ''
          }

          ${saveButton}

          ${projectButton}

          ${
            item.doi
              ? `
                <span
                  class="unified-doi"
                >
                  DOI:
                  ${escapeHtml(
                    item.doi
                  )}
                </span>
              `
              : ''
          }

        </div>

      </article>
    `;
  }

  function renderCounts(results) {
    const counts = {
      all:
        results.length,

      nbprof:
        0,

      academic:
        0,

      tool:
        0
    };

    results.forEach(
      (item) => {
        if (
          counts[item.kind] !==
          undefined
        ) {
          counts[item.kind] +=
            1;
        }
      }
    );

    document
      .querySelectorAll(
        '[data-unified-filter]'
      )
      .forEach(
        (button) => {
          const key =
            button.dataset
              .unifiedFilter;

          const countElement =
            button.querySelector(
              '[data-count]'
            );

          if (countElement) {
            countElement.textContent =
              counts[key] || 0;
          }

          button.classList.toggle(
            'active',
            key === activeFilter
          );
        }
      );
  }

  function render(
    results,
    {
      loadingExternal = false,
      errorExternal = false
    } = {}
  ) {
    const section =
      $('#unifiedSearchResults');

    const list =
      $('#unifiedResultsList');

    const status =
      $('#unifiedSearchStatus');

    if (
      !section ||
      !list ||
      !status
    ) {
      return;
    }

    section.hidden =
      false;

    const filtered =
      activeFilter === 'all'
        ? results
        : results.filter(
            (item) =>
              item.kind ===
              activeFilter
          );

    list.innerHTML =
      filtered.length
        ? filtered
            .map(card)
            .join('')
        : `
          <div
            class="unified-empty"
          >
            ${escapeHtml(
              t(
                'unified_no_results',
                'Aucun résultat pertinent pour cette recherche.'
              )
            )}
          </div>
        `;

    if (loadingExternal) {
      status.innerHTML = `
        <span
          class="unified-spinner"
          aria-hidden="true"
        ></span>

        ${escapeHtml(
          t(
            'unified_searching_academic',
            'Recherche dans la littérature scientifique…'
          )
        )}
      `;
    } else if (
      errorExternal
    ) {
      status.textContent =
        t(
          'unified_external_unavailable',
          'Les résultats NBProf sont disponibles. La recherche académique externe est temporairement indisponible.'
        );
    } else {
      status.textContent =
        t(
          'unified_results_notice',
          'Les publications NBProf sont prioritaires, puis les résultats académiques sont classés selon leur pertinence estimée.'
        );
    }

    section.scrollIntoView(
      {
        behavior:
          'smooth',

        block:
          'start'
      }
    );
  }

  // =========================================================
  // RECHERCHE
  // =========================================================

  async function search(query) {
    const q =
      String(
        query || ''
      ).trim();

    if (q.length < 3) {
      $('#hubSearch')?.focus();

      const section =
        $('#unifiedSearchResults');

      const status =
        $('#unifiedSearchStatus');

      const list =
        $('#unifiedResultsList');

      if (
        section &&
        status
      ) {
        section.hidden =
          false;

        status.textContent =
          t(
            'unified_min_chars',
            'Saisissez au moins 3 caractères pour lancer la recherche.'
          );

        if (list) {
          list.innerHTML =
            '';
        }
      }

      return;
    }

    currentQuery =
      q;

    activeFilter =
      'all';

    const serial =
      ++requestSerial;

    if (
      !publications.length &&
      !tools.length
    ) {
      await loadCatalogs();
    }

    const local =
      localResults(q);

    lastResults =
      local;

    renderCounts(
      lastResults
    );

    render(
      lastResults,
      {
        loadingExternal:
          true
      }
    );

    window.plausible?.(
      'unified_search',
      {
        props: {
          language:
            lang(),

          query_length:
            String(
              q.length
            )
        }
      }
    );

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () =>
          controller.abort(),
        8500
      );

    let external = [];

    let externalError =
      false;

    try {
      try {
        external =
          await semanticScholar(
            q,
            controller.signal
          );
      } catch (error) {
        console.warn(
          'Semantic Scholar fallback',
          error
        );

        external =
          await crossref(
            q,
            controller.signal
          );
      }
    } catch (error) {
      console.warn(
        'Academic search unavailable',
        error
      );

      externalError =
        true;
    } finally {
      clearTimeout(
        timer
      );
    }

    if (
      serial !==
      requestSerial
    ) {
      return;
    }

    const kindWeight = {
      nbprof: 3,
      academic: 2,
      tool: 1
    };

    lastResults =
      dedupe(
        [
          ...local,
          ...external
        ]
      ).sort(
        (a, b) => {
          const kindDifference =
            (
              kindWeight[
                b.kind
              ] ||
              0
            ) -
            (
              kindWeight[
                a.kind
              ] ||
              0
            );

          return (
            kindDifference ||
            (
              (b.score || 0) -
              (a.score || 0)
            )
          );
        }
      );

    renderCounts(
      lastResults
    );

    render(
      lastResults,
      {
        errorExternal:
          externalError
      }
    );
  }

  // =========================================================
  // ÉVÉNEMENTS
  // =========================================================

  function updateUrlQuery(query) {
    const current =
      new URL(
        window.location.href
      );

    current.searchParams.set(
      'q',
      query
    );

    window.history.replaceState(
      {},
      '',
      `${current.pathname}${current.search}${current.hash}`
    );
  }

  async function runSearchFromInput() {
    const input =
      $('#hubSearch');

    const query =
      String(
        input?.value || ''
      ).trim();

    if (!query) {
      input?.focus();
      return;
    }

    updateUrlQuery(
      query
    );

    await search(
      query
    );
  }

  function bind() {
    document
      .querySelectorAll(
        '[data-unified-filter]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () => {
              activeFilter =
                button.dataset
                  .unifiedFilter ||
                'all';

              renderCounts(
                lastResults
              );

              render(
                lastResults
              );
            }
          );
        }
      );

    $('#hubSearchButton')
      ?.addEventListener(
        'click',
        runSearchFromInput
      );

    $('#hubSearch')
      ?.addEventListener(
        'keydown',
        (event) => {
          if (
            event.key ===
            'Enter'
          ) {
            event.preventDefault();

            runSearchFromInput();
          }
        }
      );

    document.addEventListener(
      'click',
      (event) => {
        const projectButton =
          event.target.closest?.(
            '.unified-project-button'
          );

        if (projectButton) {
          event.preventDefault();

          const item =
            lastResults.find(
              (result) =>
                articleKey(
                  result
                ) ===
                projectButton
                  .dataset
                  .projectKey
            );

          if (!item) {
            showMessage(
              'Article introuvable.'
            );

            return;
          }

          openProjectPicker(
            item
          );

          return;
        }

        const saveButton =
          event.target.closest?.(
            '.unified-save-button'
          );

        if (!saveButton) {
          return;
        }

        event.preventDefault();

        const item =
          lastResults.find(
            (result) =>
              articleKey(
                result
              ) ===
              saveButton
                .dataset
                .saveKey
          );

        if (!item) {
          console.warn(
            'NBProf article introuvable',
            saveButton
              .dataset
              .saveKey
          );

          return;
        }

        toggleSavedArticle(
          item
        );

        renderCounts(
          lastResults
        );

        render(
          lastResults
        );
      }
    );

    window.addEventListener(
      'nbprof:languagechange',
      () => {
        if (
          lastResults.length
        ) {
          renderCounts(
            lastResults
          );

          render(
            lastResults
          );
        }
      }
    );
  }

  // =========================================================
  // INITIALISATION
  // =========================================================

  async function init() {
    bind();

    await loadCatalogs();

    const params =
      new URLSearchParams(
        window.location.search
      );

    const query =
      String(
        params.get('q') ||
        ''
      ).trim();

    if (query.length >= 3) {
      const input =
        $('#hubSearch');

      if (input) {
        input.value =
          query;
      }

      await search(
        query
      );
    }
  }

  // =========================================================
  // API PUBLIQUE
  // =========================================================

  window.NBProfUnifiedSearch = {
    search
  };

  window.NBProfSavedArticles = {
    getAll:
      getSavedArticles,

    save:
      saveArticle,

    remove:
      removeSavedArticle,

    isSaved,

    key:
      articleKey
  };

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
