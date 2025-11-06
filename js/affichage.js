import { fetchTable, insertRow, deleteRow } from './supabaseClient.js';
import { createSpinner, handleForm, showToast, formatDate } from './ui.js';

const boardList = document.getElementById('boardList');
const searchInput = document.getElementById('searchBoard');
const tagFilter = document.getElementById('tagFilter');
const linkGestion = document.getElementById('linkGestion');

let announcements = [];
const isAdmin = sessionStorage.getItem('intranet_admin') === '1';

async function loadAnnouncements() {
  boardList.innerHTML = createSpinner('Chargement des annonces...');
  const { data, error } = await fetchTable('announcements', { order: { column: 'created_at' } });

  if (error) {
    console.error(error);
    boardList.innerHTML = '<div class="alert alert-danger">Impossible de charger les annonces.</div>';
    return;
  }

  announcements = data || [];
  updateTagFilter();
  renderBoard();
}

function updateTagFilter() {
  const tags = new Set();
  announcements.forEach((item) => {
    if (!item.tags) return;
    item.tags.split(',').forEach((tag) => {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    });
  });

  tagFilter.innerHTML = '<option value="">Tous les tags</option>';
  Array.from(tags)
    .sort((a, b) => a.localeCompare(b))
    .forEach((tag) => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });
}

function renderBoard() {
  const query = searchInput.value.toLowerCase();
  const tag = tagFilter.value;

  const filtered = announcements.filter((item) => {
    const matchesQuery = [item.title, item.message, item.author, item.tags]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
    const matchesTag = !tag || (item.tags && item.tags.split(',').map((t) => t.trim()).includes(tag));
    return matchesQuery && matchesTag;
  });

  if (filtered.length === 0) {
    boardList.innerHTML = '<div class="alert alert-info">Aucune annonce ne correspond à votre recherche.</div>';
    return;
  }

  boardList.innerHTML = filtered
    .map(
      (item) => `
        <article class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h2 class="h5 mb-1">${item.title || 'Annonce interne'}</h2>
                <p class="text-muted small mb-0">${item.author || 'Anonyme'} · ${formatDate(item.created_at)}</p>
              </div>
              ${isAdmin ? `<button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${item.id}">Supprimer</button>` : ''}
            </div>
            <p class="mb-3">${item.message}</p>
            ${item.tags ? renderTags(item.tags) : ''}
          </div>
        </article>
      `
    )
    .join('');
}

function renderTags(tags) {
  return `
    <div class="d-flex flex-wrap gap-2">
      ${tags
        .split(',')
        .map((tag) => `<span class="badge bg-primary-subtle text-primary">${tag.trim()}</span>`)
        .join('')}
    </div>`;
}

handleForm(document.getElementById('boardForm'), async (formData) => {
  const payload = {
    author: formData.get('author'),
    title: formData.get('title'),
    message: formData.get('message'),
    tags: formData.get('tags'),
  };

  const { error } = await insertRow('announcements', payload);
  if (error) throw error;
  showToast('Annonce publiée', 'success');
  await loadAnnouncements();
});

searchInput.addEventListener('input', renderBoard);
tagFilter.addEventListener('change', renderBoard);

boardList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) return;
  const id = button.dataset.id;
  const confirmed = confirm('Confirmez-vous la suppression de cette annonce ?');
  if (!confirmed) return;

  const { error } = await deleteRow('announcements', id);
  if (error) {
    showToast('Suppression impossible', 'danger');
    console.error(error);
    return;
  }

  showToast('Annonce supprimée', 'success');
  await loadAnnouncements();
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

loadAnnouncements().catch((error) => {
  console.error(error);
  showToast('Impossible de charger les annonces.', 'danger');
});
