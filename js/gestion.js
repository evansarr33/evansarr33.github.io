import { fetchTable, insertRow, deleteRow } from './supabaseClient.js';
import { handleForm, showToast, formatDate } from './ui.js';

const guard = document.getElementById('adminGuard');
const panels = document.getElementById('adminPanels');
const statElements = document.querySelectorAll('[data-admin-stat]');
const newsTableBody = document.querySelector('#adminNewsTable tbody');
const documentTableBody = document.querySelector('#adminDocumentTable tbody');
const planningTableBody = document.querySelector('#adminPlanningTable tbody');
const resourceTableBody = document.querySelector('#adminResourceTable tbody');
const clockTableBody = document.querySelector('#adminClockTable tbody');
const clearSessionButton = document.getElementById('clearAdminSession');

const hasAccess = sessionStorage.getItem('intranet_admin') === '1';

if (!hasAccess) {
  guard.classList.remove('d-none');
  panels.classList.add('d-none');
} else {
  guard.classList.add('d-none');
  panels.classList.remove('d-none');
  loadAdminData().catch((error) => {
    console.error(error);
    showToast('Impossible de charger les données administrateur.', 'danger');
  });
}

async function loadAdminData() {
  const [newsResponse, documentsResponse, planningResponse, resourcesResponse, clocksResponse] = await Promise.all([
    fetchTable('news', { order: { column: 'published_at', ascending: false } }),
    fetchTable('documents', { order: { column: 'updated_at', ascending: false } }),
    fetchTable('plannings', { order: { column: 'start_date', ascending: false } }),
    fetchTable('resources', { order: { column: 'name', ascending: true } }),
    fetchTable('time_entries', { order: { column: 'timestamp', ascending: false }, limit: 50 }),
  ]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (newsResponse.error) console.error(newsResponse.error);
  if (documentsResponse.error) console.error(documentsResponse.error);
  if (planningResponse.error) console.error(planningResponse.error);
  if (resourcesResponse.error) console.error(resourcesResponse.error);
  if (clocksResponse.error) console.error(clocksResponse.error);

  renderNews(newsResponse.data || []);
  renderDocuments(documentsResponse.data || []);
  renderPlannings(planningResponse.data || []);
  renderResources(resourcesResponse.data || []);
  const todaysEntries = (clocksResponse.data || []).filter((entry) => new Date(entry.timestamp) >= now);
  renderClocks(todaysEntries);

  updateStats({
    news: newsResponse.data?.length ?? 0,
    documents: documentsResponse.data?.length ?? 0,
    plannings: planningResponse.data?.length ?? 0,
    users: todaysEntries.length,
  });
}

function updateStats(values) {
  statElements.forEach((element) => {
    const key = element.dataset.adminStat;
    element.textContent = values[key] ?? '-';
  });
}

function renderNews(items) {
  newsTableBody.innerHTML = items
    .map(
      (item) => `
        <tr data-id="${item.id}" data-table="news">
          <td>${item.title}</td>
          <td>${item.category}</td>
          <td>${formatDate(item.published_at || item.created_at)}</td>
          <td>${item.author}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-action="delete">Supprimer</button>
          </td>
        </tr>
      `
    )
    .join('');
}

function renderDocuments(items) {
  documentTableBody.innerHTML = items
    .map(
      (item) => `
        <tr data-id="${item.id}" data-table="documents">
          <td><a href="${item.url}" target="_blank" rel="noopener">${item.title}</a></td>
          <td>${item.category}</td>
          <td>${formatDate(item.updated_at || item.created_at)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-action="delete">Supprimer</button>
          </td>
        </tr>
      `
    )
    .join('');
}

function renderPlannings(items) {
  planningTableBody.innerHTML = items
    .map(
      (item) => `
        <tr data-id="${item.id}" data-table="plannings">
          <td>${item.title}</td>
          <td>${item.team}</td>
          <td>${formatDate(item.start_date)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-action="delete">Supprimer</button>
          </td>
        </tr>
      `
    )
    .join('');
}

function renderResources(items) {
  resourceTableBody.innerHTML = items
    .map(
      (item) => `
        <tr data-id="${item.id}" data-table="resources">
          <td>${item.name}</td>
          <td>${item.status || 'disponible'}</td>
          <td>${item.next_available ? formatDate(item.next_available) : '-'}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-action="delete">Supprimer</button>
          </td>
        </tr>
      `
    )
    .join('');
}

function renderClocks(items) {
  if (!items.length) {
    clockTableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Aucun pointage aujourd\'hui.</td></tr>';
    return;
  }

  clockTableBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${formatDate(item.timestamp)}</td>
          <td>${item.type}</td>
          <td>${item.employee} <span class="text-muted small d-block">${item.email}</span></td>
          <td>${item.note || ''}</td>
        </tr>
      `
    )
    .join('');
}

handleForm(document.getElementById('adminNewsForm'), async (formData) => {
  const payload = {
    title: formData.get('title'),
    author: formData.get('author'),
    category: formData.get('category') || 'Général',
    content: formData.get('content'),
    published_at: formData.get('published_at') || new Date().toISOString(),
  };

  const { error } = await insertRow('news', payload);
  if (error) throw error;
  showToast('Actualité ajoutée', 'success');
  await loadAdminData();
});

handleForm(document.getElementById('adminDocumentForm'), async (formData) => {
  const payload = {
    title: formData.get('title'),
    category: formData.get('category'),
    url: formData.get('url'),
    description: formData.get('description'),
    updated_at: new Date().toISOString(),
  };

  const { error } = await insertRow('documents', payload);
  if (error) throw error;
  showToast('Document enregistré', 'success');
  await loadAdminData();
});

handleForm(document.getElementById('adminResourceForm'), async (formData) => {
  const payload = {
    name: formData.get('name'),
    status: formData.get('status'),
    next_available: formData.get('next_available') || null,
    notes: formData.get('notes'),
  };

  const { error } = await insertRow('resources', payload);
  if (error) throw error;
  showToast('Ressource ajoutée', 'success');
  await loadAdminData();
});

newsTableBody.addEventListener('click', handleDeleteClick);
documentTableBody.addEventListener('click', handleDeleteClick);
planningTableBody.addEventListener('click', handleDeleteClick);
resourceTableBody.addEventListener('click', handleDeleteClick);

async function handleDeleteClick(event) {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const row = button.closest('tr');
  const id = row.dataset.id;
  const table = row.dataset.table;
  const confirmed = confirm('Confirmez-vous la suppression de cet élément ?');
  if (!confirmed) return;

  const { error } = await deleteRow(table, id);
  if (error) {
    console.error(error);
    showToast('Suppression impossible', 'danger');
    return;
  }

  showToast('Élément supprimé', 'success');
  await loadAdminData();
}

clearSessionButton.addEventListener('click', () => {
  sessionStorage.removeItem('intranet_admin');
  showToast('Session administrateur fermée', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 800);
});
