import { fetchTable, insertRow, subscribeToTable } from './supabaseClient.js';
import { createSpinner, handleForm, showToast, formatDate } from './ui.js';

const historyBody = document.getElementById('historyBody');
const historyEmail = document.getElementById('historyEmail');
const filterHistoryButton = document.getElementById('filterHistory');
const statsValues = document.querySelectorAll('[data-stat]');
const linkGestion = document.getElementById('linkGestion');

let entries = [];

async function loadHistory(email) {
  historyBody.innerHTML = `<tr><td colspan="4">${createSpinner('Chargement des pointages...')}</td></tr>`;
  const options = { order: { column: 'timestamp', ascending: false }, limit: 50 };
  if (email) {
    options.match = { email };
  }

  const { data, error } = await fetchTable('time_entries', options);
  if (error) {
    console.error(error);
    historyBody.innerHTML = `<tr><td colspan="4" class="text-danger">Impossible de charger l'historique.</td></tr>`;
    return;
  }

  entries = data || [];
  renderHistory();
  updateStats();
}

function renderHistory() {
  if (!entries.length) {
    historyBody.innerHTML = '<tr><td colspan="4" class="text-muted">Aucun pointage enregistré.</td></tr>';
    return;
  }

  historyBody.innerHTML = entries
    .map(
      (entry) => `
        <tr>
          <td>${formatDate(entry.timestamp)}</td>
          <td><span class="badge ${badgeClass(entry.type)} text-uppercase">${formatType(entry.type)}</span></td>
          <td>
            <div class="fw-semibold">${entry.employee}</div>
            <div class="text-muted small">${entry.email}</div>
          </td>
          <td>${entry.note || ''}</td>
        </tr>
      `
    )
    .join('');
}

function updateStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = entries.reduce(
    (acc, entry) => {
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= today) {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  statsValues.forEach((element) => {
    const type = element.dataset.stat;
    element.textContent = stats[type] || 0;
  });
}

function badgeClass(type) {
  switch (type) {
    case 'arrivee':
      return 'bg-success-subtle text-success';
    case 'depart':
      return 'bg-danger-subtle text-danger';
    case 'pause':
    case 'retour_pause':
      return 'bg-warning text-dark';
    case 'teletravail':
      return 'bg-info text-dark';
    default:
      return 'bg-secondary';
  }
}

function formatType(type) {
  const map = {
    arrivee: 'Arrivée',
    depart: 'Départ',
    pause: 'Pause',
    retour_pause: 'Retour de pause',
    teletravail: 'Télétravail',
  };
  return map[type] || type;
}

handleForm(document.getElementById('clockForm'), async (formData) => {
  const payload = {
    employee: formData.get('employee'),
    email: formData.get('email'),
    type: formData.get('type'),
    note: formData.get('note'),
    timestamp: new Date().toISOString(),
  };

  const { error } = await insertRow('time_entries', payload);
  if (error) throw error;
  showToast('Pointage enregistré', 'success');
  historyEmail.value = payload.email;
  await loadHistory(payload.email);
});

filterHistoryButton.addEventListener('click', async () => {
  await loadHistory(historyEmail.value || undefined);
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

const unsubscribeRealtime = subscribeToTable('time_entries', () => loadHistory(historyEmail.value || undefined));

window.addEventListener('beforeunload', () => {
  unsubscribeRealtime();
});

loadHistory().catch((error) => {
  console.error(error);
  showToast('Impossible de charger la pointeuse.', 'danger');
});
