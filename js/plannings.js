import { fetchTable, insertRow, subscribeToTable } from './supabaseClient.js';
import { createSpinner, handleForm, showToast, formatDate, formatDay } from './ui.js';

const planningTimeline = document.getElementById('planningTimeline');
const absencesList = document.getElementById('absencesList');
const resourcesList = document.getElementById('resourcesList');
const teamFilter = document.getElementById('teamFilter');
const startFilter = document.getElementById('startFilter');
const endFilter = document.getElementById('endFilter');
const resetFilters = document.getElementById('resetFilters');
const linkGestion = document.getElementById('linkGestion');

let events = [];
let absences = [];
let resources = [];

async function loadData() {
  planningTimeline.innerHTML = createSpinner('Chargement des événements...');
  absencesList.innerHTML = createSpinner('Chargement des absences...');
  resourcesList.innerHTML = createSpinner('Chargement des ressources...');

  const [eventsResponse, absencesResponse, resourcesResponse] = await Promise.all([
    fetchTable('plannings', { order: { column: 'start_date', ascending: true } }),
    fetchTable('absences', { order: { column: 'start_date', ascending: true } }),
    fetchTable('resources', { order: { column: 'name', ascending: true } }),
  ]);

  if (eventsResponse.error || absencesResponse.error || resourcesResponse.error) {
    if (eventsResponse.error) console.error(eventsResponse.error);
    if (absencesResponse.error) console.error(absencesResponse.error);
    if (resourcesResponse.error) console.error(resourcesResponse.error);
    showToast('Impossible de charger toutes les données.', 'danger');
  }

  events = eventsResponse.data || [];
  absences = absencesResponse.data || [];
  resources = resourcesResponse.data || [];

  updateTeamFilter();
  renderEvents();
  renderAbsences();
  renderResources();
}

function updateTeamFilter() {
  const teams = new Set();
  events.forEach((item) => item.team && teams.add(item.team));
  absences.forEach((item) => item.team && teams.add(item.team));

  const currentValue = teamFilter.value;
  teamFilter.innerHTML = '<option value="">Toutes les équipes</option>';
  Array.from(teams)
    .sort((a, b) => a.localeCompare(b))
    .forEach((team) => {
      const option = document.createElement('option');
      option.value = team;
      option.textContent = team;
      teamFilter.append(option);
    });
  if (Array.from(teams).includes(currentValue)) {
    teamFilter.value = currentValue;
  }
}

function renderEvents() {
  const team = teamFilter.value;
  const start = startFilter.value ? new Date(startFilter.value) : null;
  const end = endFilter.value ? new Date(endFilter.value) : null;

  const filtered = events.filter((event) => {
    const eventStart = new Date(event.start_date);
    const matchesTeam = !team || event.team === team;
    const matchesStart = !start || eventStart >= start;
    const matchesEnd = !end || eventStart <= end;
    return matchesTeam && matchesStart && matchesEnd;
  });

  if (filtered.length === 0) {
    planningTimeline.innerHTML = '<div class="alert alert-info">Aucun événement pour la période sélectionnée.</div>';
    return;
  }

  planningTimeline.innerHTML = filtered
    .map(
      (event) => `
        <div class="timeline-item">
          <div class="timeline-date">${formatDay(event.start_date)}</div>
          <div class="timeline-content">
            <h3 class="h6 mb-1">${event.title}</h3>
            <p class="mb-1 text-muted">${formatDate(event.start_date)} → ${formatDate(event.end_date)}</p>
            <div class="d-flex flex-wrap gap-2 text-muted small mb-2">
              <span class="badge bg-primary-subtle text-primary">${event.team}</span>
              ${event.location ? `<span class="badge bg-light text-dark">${event.location}</span>` : ''}
            </div>
            ${event.description ? `<p class="mb-0">${event.description}</p>` : ''}
          </div>
        </div>
      `
    )
    .join('');
}

function renderAbsences() {
  if (!absences.length) {
    absencesList.innerHTML = '<p class="text-muted">Aucun congé enregistré.</p>';
    return;
  }

  absencesList.innerHTML = absences
    .map(
      (absence) => `
        <article class="absence-item border rounded-3 p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h3 class="h6 mb-1">${absence.employee}</h3>
              <span class="badge bg-secondary-subtle text-secondary">${absence.team}</span>
            </div>
            <small class="text-muted">${formatDate(absence.start_date)} → ${formatDate(absence.end_date)}</small>
          </div>
          ${absence.reason ? `<p class="mb-0 text-muted small">Motif : ${absence.reason}</p>` : ''}
        </article>
      `
    )
    .join('');
}

function renderResources() {
  if (!resources.length) {
    resourcesList.innerHTML = '<p class="text-muted">Aucune ressource suivie.</p>';
    return;
  }

  resourcesList.innerHTML = resources
    .map(
      (resource) => `
        <div class="resource-item border rounded-3 p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h3 class="h6 mb-0">${resource.name}</h3>
            <span class="badge ${resource.status === 'indisponible' ? 'bg-danger' : resource.status === 'réservé' ? 'bg-warning text-dark' : 'bg-success'}">${resource.status || 'disponible'}</span>
          </div>
          ${resource.next_available ? `<p class="text-muted small mb-1">Prochaine disponibilité : ${formatDate(resource.next_available)}</p>` : ''}
          ${resource.notes ? `<p class="text-muted small mb-0">${resource.notes}</p>` : ''}
        </div>
      `
    )
    .join('');
}

handleForm(document.getElementById('planningForm'), async (formData) => {
  const payload = {
    title: formData.get('title'),
    team: formData.get('team'),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    location: formData.get('location'),
    description: formData.get('description'),
  };

  const { error } = await insertRow('plannings', payload);
  if (error) throw error;
  showToast('Événement ajouté', 'success');
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById('planningModal')).hide();
  await reloadEvents();
});

handleForm(document.getElementById('absenceForm'), async (formData) => {
  const payload = {
    employee: formData.get('employee'),
    team: formData.get('team'),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    reason: formData.get('reason'),
  };

  const { error } = await insertRow('absences', payload);
  if (error) throw error;
  showToast('Absence enregistrée', 'success');
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById('absenceModal')).hide();
  await reloadAbsences();
});

async function reloadEvents() {
  const { data, error } = await fetchTable('plannings', { order: { column: 'start_date', ascending: true } });
  if (error) {
    console.error(error);
    showToast('Impossible de recharger les événements.', 'danger');
    return;
  }
  events = data || [];
  updateTeamFilter();
  renderEvents();
}

async function reloadAbsences() {
  const { data, error } = await fetchTable('absences', { order: { column: 'start_date', ascending: true } });
  if (error) {
    console.error(error);
    showToast('Impossible de recharger les absences.', 'danger');
    return;
  }
  absences = data || [];
  updateTeamFilter();
  renderAbsences();
}

async function reloadResources() {
  const { data, error } = await fetchTable('resources', { order: { column: 'name', ascending: true } });
  if (error) {
    console.error(error);
    showToast('Impossible de recharger les ressources.', 'danger');
    return;
  }
  resources = data || [];
  renderResources();
}

teamFilter.addEventListener('change', renderEvents);
startFilter.addEventListener('change', renderEvents);
endFilter.addEventListener('change', renderEvents);
resetFilters.addEventListener('click', (event) => {
  event.preventDefault();
  teamFilter.value = '';
  startFilter.value = '';
  endFilter.value = '';
  renderEvents();
});

linkGestion.addEventListener('click', (event) => {
  event.preventDefault();
  const password = prompt('Entrez le mot de passe administrateur');
  if (password === 'ADMIN') {
    sessionStorage.setItem('intranet_admin', '1');
    window.location.href = 'gestion.html';
  } else if (password) {
    showToast('Mot de passe incorrect', 'danger');
  }
});

const realtimeUnsubscribes = [
  subscribeToTable('plannings', () => reloadEvents()),
  subscribeToTable('absences', () => reloadAbsences()),
  subscribeToTable('resources', () => reloadResources()),
];

window.addEventListener('beforeunload', () => {
  realtimeUnsubscribes.forEach((unsubscribe) => unsubscribe());
});

loadData().catch((error) => {
  console.error(error);
  showToast('Impossible de charger les plannings.', 'danger');
});
