import { fetchTable, insertRow, fetchDashboardMetrics, subscribeToTable } from './supabaseClient.js';
import { createSpinner, renderList, handleForm, showToast, formatDate, formatDay } from './ui.js';

const newsList = document.getElementById('newsList');
const announcementsList = document.getElementById('announcementsList');
const documentsList = document.getElementById('documentsList');
const reservationsList = document.getElementById('reservationsList');
const tasksList = document.getElementById('tasksList');
const metricsElements = document.querySelectorAll('[data-metric]');

async function loadDashboard() {
  newsList.innerHTML = createSpinner('Chargement des actualités...');
  announcementsList.innerHTML = createSpinner('Récupération des annonces...');
  documentsList.innerHTML = createSpinner('Chargement des documents...');
  reservationsList.innerHTML = createSpinner('Préparation des réservations...');
  tasksList.innerHTML = '<li class="placeholder-glow"><span class="placeholder col-8"></span></li>';

  const [news, announcements, documents, reservations, tasks] = await Promise.all([
    fetchTable('news', { order: { column: 'published_at' }, limit: 6 }),
    fetchTable('announcements', { order: { column: 'created_at' } }),
    fetchTable('documents', { order: { column: 'updated_at' }, limit: 6 }),
    fetchTable('reservations', { order: { column: 'start_time', ascending: true }, limit: 8 }),
    fetchTable('tasks', { order: { column: 'due_date', ascending: true }, limit: 5 }),
  ]);

  renderNews(news.data, news.error);
  renderAnnouncements(announcements.data, announcements.error);
  renderDocuments(documents.data, documents.error);
  renderReservations(reservations.data, reservations.error);
  renderTasks(tasks.data, tasks.error);

  await refreshMetrics();
}

function updateMetrics(values) {
  metricsElements.forEach((metric) => {
    const key = metric.dataset.metric;
    metric.textContent = values[key] ?? '-';
  });
}

async function refreshMetrics() {
  const { data, error } = await fetchDashboardMetrics();
  if (error) {
    console.error(error);
    return;
  }

  updateMetrics({
    news: data.news_count,
    announcements: data.announcements_count,
    documents: data.documents_count,
    reservations: data.reservations_count,
  });
}

function renderNews(items, error) {
  if (error) {
    newsList.innerHTML = `<div class="alert alert-danger">Impossible de charger les actualités.</div>`;
    console.error(error);
    return;
  }

  renderList(
    newsList,
    items,
    (item) => `
      <div class="col-md-6 col-xl-4">
        <article class="card h-100 border-0 shadow-sm">
          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-center justify-content-between text-muted small mb-2">
              <span class="badge bg-primary-subtle text-primary">${item.category || 'Général'}</span>
              <time datetime="${item.published_at || item.created_at}">${formatDate(item.published_at || item.created_at)}</time>
            </div>
            <h3 class="h5 fw-bold">${item.title}</h3>
            <p class="flex-grow-1 text-muted">${item.content}</p>
            <div class="d-flex justify-content-between align-items-center text-muted small">
              <span>Par ${item.author || 'Équipe Chromatotec'}</span>
              <a href="#" class="text-decoration-none">Lire</a>
            </div>
          </div>
        </article>
      </div>
    `,
    "Aucune actualité publiée pour le moment."
  );
}

function renderAnnouncements(items, error) {
  if (error) {
    announcementsList.innerHTML = `<div class="alert alert-danger">Impossible de charger les annonces.</div>`;
    console.error(error);
    return;
  }

  renderList(
    announcementsList,
    items,
    (item) => `
      <div class="list-group-item py-4 px-4">
        <div class="d-flex justify-content-between">
          <div>
            <h3 class="h6 fw-bold mb-1">${item.author || 'Anonyme'}</h3>
            <p class="mb-2">${item.message}</p>
            ${item.tags ? `<span class="badge bg-light text-primary">${item.tags}</span>` : ''}
          </div>
          <small class="text-muted ms-3">${formatDate(item.created_at)}</small>
        </div>
      </div>
    `,
    "Aucune annonce pour le moment."
  );
}

function renderDocuments(items, error) {
  if (error) {
    documentsList.innerHTML = `<div class="alert alert-danger">Impossible de charger les documents.</div>`;
    console.error(error);
    return;
  }

  renderList(
    documentsList,
    items,
    (item) => `
      <div class="col-md-6 col-xl-4">
        <div class="card h-100 border-0 shadow-sm">
          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-center justify-content-between text-muted small mb-2">
              <span class="badge bg-success-subtle text-success">${item.category}</span>
              <span>${formatDate(item.updated_at || item.created_at)}</span>
            </div>
            <h3 class="h5 fw-bold">${item.title}</h3>
            <p class="text-muted flex-grow-1">${item.description || 'Consultez la ressource associée pour plus de détails.'}</p>
            <a class="btn btn-outline-primary mt-3" href="${item.url}" target="_blank" rel="noopener">Ouvrir</a>
          </div>
        </div>
      </div>
    `,
    "Aucun document pour le moment."
  );
}

function renderReservations(items, error) {
  if (error) {
    reservationsList.innerHTML = `<div class="alert alert-danger">Impossible de charger les réservations.</div>`;
    console.error(error);
    return;
  }

  if (!items || items.length === 0) {
    reservationsList.innerHTML = `<div class="alert alert-info">Aucune réservation planifiée.</div>`;
    return;
  }

  reservationsList.innerHTML = items
    .map(
      (item) => `
        <div class="timeline-item">
          <div class="timeline-date">${formatDay(item.start_time)}</div>
          <div class="timeline-content">
            <h3 class="h6 mb-1">${item.resource}</h3>
            <p class="mb-1 text-muted">${formatDate(item.start_time)} → ${formatDate(item.end_time)}</p>
            <div class="d-flex flex-wrap gap-2 text-muted small">
              <span class="badge bg-primary-subtle text-primary">${item.team}</span>
              ${item.notes ? `<span>${item.notes}</span>` : ''}
            </div>
          </div>
        </div>
      `
    )
    .join('');
}

function renderTasks(items, error) {
  if (error) {
    tasksList.innerHTML = `<li class="text-danger">Impossible de charger les tâches.</li>`;
    console.error(error);
    return;
  }

  if (!items || items.length === 0) {
    tasksList.innerHTML = '<li class="text-muted">Aucune tâche assignée.</li>';
    return;
  }

  tasksList.innerHTML = items
    .map(
      (task) => `
        <li class="task-item">
          <div>
            <p class="mb-1 fw-semibold">${task.title}</p>
            <p class="mb-0 text-muted small">${task.description || ''}</p>
          </div>
          <span class="badge bg-${task.priority === 'haute' ? 'danger' : task.priority === 'moyenne' ? 'warning text-dark' : 'success-subtle text-success'}">${task.priority || 'normale'}</span>
          <small class="text-muted">${formatDate(task.due_date)}</small>
        </li>
      `
    )
    .join('');
}

handleForm(document.getElementById('announcementForm'), async (formData) => {
  const payload = {
    author: formData.get('author'),
    message: formData.get('message'),
  };
  const { error } = await insertRow('announcements', payload);
  if (error) throw error;
  showToast('Annonce publiée', 'success');
  await refreshAnnouncements();
});

handleForm(document.getElementById('newsForm'), async (formData) => {
  const payload = {
    title: formData.get('title'),
    author: formData.get('author'),
    content: formData.get('content'),
    category: formData.get('category') || 'Général',
    published_at: formData.get('published_at') || new Date().toISOString(),
  };
  const { error } = await insertRow('news', payload);
  if (error) throw error;
  showToast('Actualité publiée', 'success');
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById('newsModal')).hide();
  await refreshNews();
});

handleForm(document.getElementById('documentForm'), async (formData) => {
  const payload = {
    title: formData.get('title'),
    category: formData.get('category'),
    url: formData.get('url'),
    description: formData.get('description'),
    updated_at: new Date().toISOString(),
  };
  const { error } = await insertRow('documents', payload);
  if (error) throw error;
  showToast('Document ajouté', 'success');
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById('documentModal')).hide();
  await refreshDocuments();
});

handleForm(document.getElementById('reservationForm'), async (formData) => {
  const payload = {
    resource: formData.get('resource'),
    team: formData.get('team'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    notes: formData.get('notes'),
  };

  const { error } = await insertRow('reservations', payload);
  if (error) throw error;
  showToast('Réservation créée', 'success');
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById('reservationModal')).hide();
  await refreshReservations();
});

async function refreshAnnouncements() {
  const { data, error } = await fetchTable('announcements', { order: { column: 'created_at' } });
  renderAnnouncements(data, error);
  await refreshMetrics();
}

async function refreshNews() {
  const { data, error } = await fetchTable('news', { order: { column: 'published_at' }, limit: 6 });
  renderNews(data, error);
  await refreshMetrics();
}

async function refreshDocuments() {
  const { data, error } = await fetchTable('documents', { order: { column: 'updated_at' }, limit: 6 });
  renderDocuments(data, error);
  await refreshMetrics();
}

async function refreshReservations() {
  const { data, error } = await fetchTable('reservations', { order: { column: 'start_time', ascending: true }, limit: 8 });
  renderReservations(data, error);
  await refreshMetrics();
}

async function refreshTasks() {
  const { data, error } = await fetchTable('tasks', { order: { column: 'due_date', ascending: true }, limit: 5 });
  renderTasks(data, error);
}

function setupRealtime() {
  if (setupRealtime.initialized) return;
  setupRealtime.initialized = true;

  const unsubscribes = [
    subscribeToTable('announcements', () => refreshAnnouncements()),
    subscribeToTable('news', () => refreshNews()),
    subscribeToTable('documents', () => refreshDocuments()),
    subscribeToTable('reservations', () => refreshReservations()),
    subscribeToTable('tasks', () => refreshTasks()),
  ];

  const cleanup = () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    window.removeEventListener('beforeunload', cleanup);
  };

  window.addEventListener('beforeunload', cleanup);
}

setupRealtime.initialized = false;

const linkGestion = document.getElementById('linkGestion');
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

loadDashboard()
  .then(() => setupRealtime())
  .catch((error) => {
    console.error(error);
    showToast('Impossible de charger le tableau de bord.', 'danger');
  });
