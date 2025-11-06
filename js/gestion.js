import { supabase, fetchTable, insertRow, deleteRow, subscribeToTable, updateRow } from './supabaseClient.js';
import { handleForm, showToast, formatDate } from './ui.js';

const guard = document.getElementById('adminGuard');
const panels = document.getElementById('adminPanels');
const statElements = document.querySelectorAll('[data-admin-stat]');
const newsTableBody = document.querySelector('#adminNewsTable tbody');
const documentTableBody = document.querySelector('#adminDocumentTable tbody');
const planningTableBody = document.querySelector('#adminPlanningTable tbody');
const resourceTableBody = document.querySelector('#adminResourceTable tbody');
const clockTableBody = document.querySelector('#adminClockTable tbody');
const taskTableBody = document.querySelector('#adminTaskTable tbody');
const approvalTableBody = document.querySelector('#adminApprovalTable tbody');
const approvalCountBadge = document.getElementById('approvalCount');
const clearSessionButton = document.getElementById('clearAdminSession');
const adminTaskForm = document.getElementById('adminTaskForm');

const hasAccess = sessionStorage.getItem('intranet_admin') === '1';

let realtimeUnsubscribes = [];

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

  realtimeUnsubscribes = [
    subscribeToTable('news', () => loadAdminData()),
    subscribeToTable('documents', () => loadAdminData()),
    subscribeToTable('plannings', () => loadAdminData()),
    subscribeToTable('resources', () => loadAdminData()),
    subscribeToTable('time_entries', () => loadAdminData()),
    subscribeToTable('tasks', () => loadAdminData()),
    subscribeToTable('attachments', () => loadAdminData()),
    subscribeToTable('approval_requests', () => loadAdminData()),
    subscribeToTable('approval_steps', () => loadAdminData()),
  ];
}

async function loadAdminData() {
  const [
    newsResponse,
    documentsResponse,
    planningResponse,
    resourcesResponse,
    clocksResponse,
    tasksResponse,
    taskAttachmentsResponse,
    approvalsResponse,
    approvalStepsResponse,
  ] = await Promise.all([
    fetchTable('news', { order: { column: 'published_at', ascending: false } }),
    fetchTable('documents', { order: { column: 'updated_at', ascending: false } }),
    fetchTable('plannings', { order: { column: 'start_date', ascending: false } }),
    fetchTable('resources', { order: { column: 'name', ascending: true } }),
    fetchTable('time_entries', { order: { column: 'timestamp', ascending: false }, limit: 50 }),
    fetchTable('tasks', { order: { column: 'due_date', ascending: true } }),
    fetchTable('attachments', { eq: { target_type: 'task' } }),
    fetchTable('approval_requests', { order: { column: 'created_at', ascending: false } }),
    fetchTable('approval_steps'),
  ]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (newsResponse.error) console.error(newsResponse.error);
  if (documentsResponse.error) console.error(documentsResponse.error);
  if (planningResponse.error) console.error(planningResponse.error);
  if (resourcesResponse.error) console.error(resourcesResponse.error);
  if (clocksResponse.error) console.error(clocksResponse.error);
  if (tasksResponse.error) console.error(tasksResponse.error);
  if (taskAttachmentsResponse.error) console.error(taskAttachmentsResponse.error);
  if (approvalsResponse.error) console.error(approvalsResponse.error);
  if (approvalStepsResponse.error) console.error(approvalStepsResponse.error);

  renderNews(newsResponse.data || []);
  renderDocuments(documentsResponse.data || []);
  renderPlannings(planningResponse.data || []);
  renderResources(resourcesResponse.data || []);
  const todaysEntries = (clocksResponse.data || []).filter((entry) => new Date(entry.timestamp) >= now);
  renderClocks(todaysEntries);

  const attachmentsByTask = new Map();
  (taskAttachmentsResponse.data || [])
    .filter((attachment) => attachment.target_type === 'task')
    .forEach((attachment) => {
      if (!attachmentsByTask.has(attachment.target_id)) {
        attachmentsByTask.set(attachment.target_id, []);
      }
      attachmentsByTask.get(attachment.target_id).push(attachment);
    });
  renderTasksAdmin(tasksResponse.data || [], attachmentsByTask);

  renderApprovals(approvalsResponse.data || [], approvalStepsResponse.data || []);

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

function renderTasksAdmin(items, attachmentsByTask) {
  if (!taskTableBody) return;
  if (!items.length) {
    taskTableBody.innerHTML = '<tr><td colspan="6" class="text-muted">Aucune tâche enregistrée.</td></tr>';
    return;
  }

  taskTableBody.innerHTML = items
    .map((item) => {
      const attachments = attachmentsByTask.get(item.id) || [];
      const attachmentMarkup = attachments.length
        ? attachments
            .map((attachment) => `<a href="${attachment.file_url}" target="_blank" rel="noopener">${attachment.file_name}</a>`)
            .join('<br>')
        : '<span class="text-muted small">-</span>';
      const statusClass =
        item.status === 'terminee'
          ? 'badge bg-success'
          : item.status === 'en_cours'
          ? 'badge bg-info text-dark'
          : item.status === 'archivee'
          ? 'badge bg-secondary'
          : 'badge bg-warning text-dark';
      const priorityClass =
        item.priority === 'haute'
          ? 'badge bg-danger'
          : item.priority === 'moyenne'
          ? 'badge bg-warning text-dark'
          : item.priority === 'basse'
          ? 'badge bg-secondary'
          : 'badge bg-primary-subtle text-primary';
      return `
        <tr data-id="${item.id}" data-table="tasks">
          <td>${item.title}<div class="text-muted small">${item.assigned_to || ''}</div></td>
          <td>${item.due_date ? formatDate(item.due_date) : '-'}</td>
          <td><span class="${priorityClass}">${item.priority || 'normale'}</span></td>
          <td><span class="${statusClass}">${item.status || 'ouverte'}</span></td>
          <td>${attachmentMarkup}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-action="delete">Supprimer</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderApprovals(requests, steps) {
  if (!approvalTableBody) return;
  if (!requests.length) {
    approvalTableBody.innerHTML = '<tr><td colspan="6" class="text-muted">Aucune demande en cours.</td></tr>';
    if (approvalCountBadge) approvalCountBadge.textContent = '0 en attente';
    return;
  }

  const stepsByRequest = new Map();
  (steps || []).forEach((step) => {
    if (!stepsByRequest.has(step.request_id)) {
      stepsByRequest.set(step.request_id, []);
    }
    stepsByRequest.get(step.request_id).push(step);
  });

  const pendingCount = requests.filter((request) => request.status === 'en_attente').length;
  if (approvalCountBadge) {
    approvalCountBadge.textContent = `${pendingCount} en attente`;
  }

  approvalTableBody.innerHTML = requests
    .map((request) => {
      const statusBadge =
        request.status === 'approuvee'
          ? 'badge bg-success'
          : request.status === 'refusee'
          ? 'badge bg-danger'
          : 'badge bg-warning text-dark';
      const requestSteps = (stepsByRequest.get(request.id) || []).sort((a, b) => a.step_order - b.step_order);
      const primaryStep = requestSteps[0];
      const note = request.decision_note || primaryStep?.note || '';
      const decidedAt = request.updated_at ? formatDate(request.updated_at) : '-';
      const actions =
        request.status === 'en_attente'
          ? `
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-success" data-action="approve" data-id="${request.id}" data-step-id="${primaryStep?.id || ''}">Approuver</button>
                <button class="btn btn-outline-danger" data-action="reject" data-id="${request.id}" data-step-id="${primaryStep?.id || ''}">Refuser</button>
              </div>
            `
          : '<span class="text-muted small">—</span>';

      return `
        <tr data-id="${request.id}">
          <td>${request.request_type === 'reservation' ? 'Réservation' : 'Absence'}</td>
          <td>${request.requester || '-'}</td>
          <td><span class="${statusBadge}">${request.status}</span></td>
          <td>${decidedAt}</td>
          <td>${note ? `<span class="small">${note}</span>` : '<span class="text-muted small">—</span>'}</td>
          <td class="text-end" data-step-id="${primaryStep?.id || ''}">${actions}</td>
        </tr>
      `;
    })
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

if (adminTaskForm) {
  handleForm(adminTaskForm, async (formData) => {
    const payload = {
      title: formData.get('title'),
      assigned_to: formData.get('assigned_to'),
      due_date: formData.get('due_date'),
      priority: formData.get('priority') || 'normale',
      status: formData.get('status') || 'ouverte',
      description: formData.get('description'),
    };

    const { error } = await insertRow('tasks', payload);
    if (error) throw error;
    showToast('Tâche créée', 'success');
    await loadAdminData();
  });
}

newsTableBody.addEventListener('click', handleDeleteClick);
documentTableBody.addEventListener('click', handleDeleteClick);
planningTableBody.addEventListener('click', handleDeleteClick);
resourceTableBody.addEventListener('click', handleDeleteClick);
taskTableBody?.addEventListener('click', handleDeleteClick);

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

  if (table === 'tasks' || table === 'reservations') {
    await supabase
      .from('attachments')
      .delete()
      .eq('target_type', table === 'tasks' ? 'task' : 'reservation')
      .eq('target_id', id);
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

approvalTableBody?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const cell = button.closest('td');
  const stepId = button.dataset.stepId || cell?.dataset.stepId;
  const status = action === 'approve' ? 'approuvee' : 'refusee';
  const note = action === 'approve' ? 'Approuvé par l\'administration' : 'Refusé par l\'administration';

  const { error } = await updateRow('approval_requests', id, {
    status,
    decision_note: note,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(error);
    showToast('Impossible de mettre à jour la demande.', 'danger');
    return;
  }

  if (stepId) {
    const { error: stepError } = await updateRow('approval_steps', stepId, {
      status,
      note,
      decided_at: new Date().toISOString(),
    });
    if (stepError) {
      console.error(stepError);
    }
  } else {
    await supabase
      .from('approval_steps')
      .update({ status, note, decided_at: new Date().toISOString() })
      .eq('request_id', id)
      .eq('step_order', 1);
  }

  showToast('Workflow mis à jour', 'success');
  await loadAdminData();
});

window.addEventListener('beforeunload', () => {
  realtimeUnsubscribes.forEach((unsubscribe) => unsubscribe());
});
