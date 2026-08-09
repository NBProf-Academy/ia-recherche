(() => {
  const STORAGE_KEY = 'nbprof-research-projects-v1';

  const $ = selector => document.querySelector(selector);

  const cleanText = (value, maxLength = 400) =>
    typeof value === 'string'
      ? value.trim().slice(0, maxLength)
      : '';

  let projects = [];
  let currentProject = null;


  function readProjects() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );

      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.error(
        'NBProf exploration storage error:',
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


  function cleanList(items, maxItems, maxLength) {
    if (!Array.isArray(items)) return [];

    return items
      .map(item => cleanText(item, maxLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }


  function normalizedExploration(project) {
    const exploration = project?.exploration || {};

    return {
      initialIdea: cleanText(
        exploration.initialIdea,
        1500
      ),

      problem: cleanText(
        exploration.problem,
        3000
      ),

      mainQuestion: cleanText(
        exploration.mainQuestion,
        1000
      ),

      secondaryQuestions: cleanList(
        exploration.secondaryQuestions,
        10,
        500
      ),

      generalObjective: cleanText(
        exploration.generalObjective ||
          project?.goal,
        1500
      ),

      specificObjectives: cleanList(
        exploration.specificObjectives,
        10,
        500
      ),

      keywords: cleanList(
        exploration.keywords,
        20,
        100
      ),

      population: cleanText(
        exploration.population,
        1000
      ),

      field: cleanText(
        exploration.field,
        1000
      ),

      geography: cleanText(
        exploration.geography,
        500
      ),

      period: cleanText(
        exploration.period,
        500
      ),

      discipline: cleanText(
        exploration.discipline,
        500
      ),

      scientificInterest: cleanText(
        exploration.scientificInterest,
        2500
      ),

      practicalInterest: cleanText(
        exploration.practicalInterest,
        2500
      ),

      limits: cleanText(
        exploration.limits,
        2500
      )
    };
  }


  function setValue(selector, value) {
    const field = $(selector);

    if (field) {
      field.value = value || '';
    }
  }


  function fillForm() {
    const data = normalizedExploration(
      currentProject
    );

    setValue(
      '#explorationInitialIdea',
      data.initialIdea
    );

    setValue(
      '#explorationDiscipline',
      data.discipline
    );

    setValue(
      '#explorationProblem',
      data.problem
    );

    setValue(
      '#explorationMainQuestion',
      data.mainQuestion
    );

    setValue(
      '#explorationSecondaryQuestions',
      data.secondaryQuestions.join('\n')
    );

    setValue(
      '#explorationGeneralObjective',
      data.generalObjective
    );

    setValue(
      '#explorationSpecificObjectives',
      data.specificObjectives.join('\n')
    );

    setValue(
      '#explorationKeywords',
      data.keywords.join(', ')
    );

    setValue(
      '#explorationPopulation',
      data.population
    );

    setValue(
      '#explorationField',
      data.field
    );

    setValue(
      '#explorationGeography',
      data.geography
    );

    setValue(
      '#explorationPeriod',
      data.period
    );

    setValue(
      '#explorationScientificInterest',
      data.scientificInterest
    );

    setValue(
      '#explorationPracticalInterest',
      data.practicalInterest
    );

    setValue(
      '#explorationLimits',
      data.limits
    );
  }


  function linesToList(value, maxItems, maxLength) {
    return String(value || '')
      .split('\n')
      .map(item => cleanText(item, maxLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }


  function keywordsToList(value) {
    return String(value || '')
      .split(',')
      .map(item => cleanText(item, 100))
      .filter(Boolean)
      .slice(0, 20);
  }


  function collectForm() {
    return {
      initialIdea: cleanText(
        $('#explorationInitialIdea')?.value,
        1500
      ),

      problem: cleanText(
        $('#explorationProblem')?.value,
        3000
      ),

      mainQuestion: cleanText(
        $('#explorationMainQuestion')?.value,
        1000
      ),

      secondaryQuestions: linesToList(
        $('#explorationSecondaryQuestions')?.value,
        10,
        500
      ),

      generalObjective: cleanText(
        $('#explorationGeneralObjective')?.value,
        1500
      ),

      specificObjectives: linesToList(
        $('#explorationSpecificObjectives')?.value,
        10,
        500
      ),

      keywords: keywordsToList(
        $('#explorationKeywords')?.value
      ),

      population: cleanText(
        $('#explorationPopulation')?.value,
        1000
      ),

      field: cleanText(
        $('#explorationField')?.value,
        1000
      ),

      geography: cleanText(
        $('#explorationGeography')?.value,
        500
      ),

      period: cleanText(
        $('#explorationPeriod')?.value,
        500
      ),

      discipline: cleanText(
        $('#explorationDiscipline')?.value,
        500
      ),

      scientificInterest: cleanText(
        $('#explorationScientificInterest')?.value,
        2500
      ),

      practicalInterest: cleanText(
        $('#explorationPracticalInterest')?.value,
        2500
      ),

      limits: cleanText(
        $('#explorationLimits')?.value,
        2500
      )
    };
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


  function renderProjectHeader() {
    $('#explorationProjectName').textContent =
      currentProject.name || 'Projet';

    $('#explorationProjectGoal').textContent =
      currentProject.goal || '';

    const backButton = $('#backToProject');

    if (backButton) {
      backButton.href =
        `projets.html?project=${encodeURIComponent(
          currentProject.id
        )}`;
    }
  }


  function saveExploration() {
    if (!currentProject) return;

    const exploration = collectForm();

    currentProject.exploration = exploration;

    /*
     * L'objectif général de l'exploration devient
     * également l'objectif principal affiché
     * dans le projet.
     */
    currentProject.goal =
      exploration.generalObjective;

    currentProject.updatedAt =
      new Date().toISOString();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(projects)
    );

    renderProjectHeader();

    showToast(
      'Exploration enregistrée avec succès.'
    );
  }


  function showMissingProject() {
    const name = $('#explorationProjectName');
    const goal = $('#explorationProjectGoal');
    const form = $('#explorationForm');

    if (name) {
      name.textContent = 'Projet introuvable';
    }

    if (goal) {
      goal.textContent =
        'Retournez dans Mes projets et ouvrez de nouveau l’exploration.';
    }

    if (form) {
      form.hidden = true;
    }
  }


  function bind() {
    $('#explorationForm')?.addEventListener(
      'submit',
      event => {
        event.preventDefault();
        saveExploration();
      }
    );
  }


  function init() {
    projects = readProjects();

    const projectId = requestedProjectId();

    currentProject = projects.find(
      project => project?.id === projectId
    );

    if (!currentProject) {
      showMissingProject();
      return;
    }

    renderProjectHeader();
    fillForm();
    bind();
  }


  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }
})();
