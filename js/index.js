import {
  fetchTable,
  insertRow,
  fetchDashboardMetrics,
  fetchEngagementDashboard,
  subscribeToTable,
  uploadAttachment,
  fetchAttachments,
} from './supabaseClient.js';
import { createSpinner, renderList, handleForm, showToast, formatDate, formatDay } from './ui.js';
import { createStore } from './state.js';

const store = createStore({
  reservations: [],
  reservationAttachments: new Map(),
  reservationError: null,
  tasks: [],
  taskAttachments: new Map(),
  taskError: null,
  messages: [],
  currentChannel: 'general',
  comments: [],
  commentContext: null,
});

const newsList = document.getElementById('newsList');
const announcementsList = document.getElementById('announcementsList');
const documentsList = document.getElementById('documentsList');
const reservationsList = document.getElementById('reservationsList');
const tasksList = document.getElementById('tasksList');
const metricsElements = document.querySelectorAll('[data-metric]');
const engagementSnapshot = document.getElementById('engagementSnapshot');
const commentsModalEl = document.getElementById('commentsModal');
const commentsModalLabel = document.getElementById('commentsModalLabel');
const commentsListEl = document.getElementById('commentsList');
const commentsEmptyState = document.getElementById('commentsEmptyState');
const commentForm = document.getElementById('commentForm');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatAuthor = document.getElementById('chatAuthor');
const chatMessage = document.getElementById('chatMessage');
const chatChannel = document.getElementById('chatChannel');
const linkGestion = document.getElementById('linkGestion');

const commentModal = commentsModalEl ? window.bootstrap.Modal.getOrCreateInstance(commentsModalEl) : null;

if (chatAuthor && window.localStorage) {
  const savedAuthor = window.localStorage.getItem('chatAuthor');
  if (savedAuthor) {
    chatAuthor.value = savedAuthor;
  }

  chatAuthor.addEventListener('input', () => {
    const value = chatAuthor.value.trim();
    if (value) {
      window.localStorage.setItem('chatAuthor', value);
    } else {
      window.localStorage.removeItem('chatAuthor');
    }
  });
}

store.subscribe('reservations', () => renderReservations());
store.subscribe('reservationAttachments', () => renderReservations());
store.subscribe('reservationError', () => renderReservations());
store.subscribe('tasks', () => renderTasks());
store.subscribe('taskAttachments', () => renderTasks());
store.subscribe('taskError', () => renderTasks());
store.subscribe('messages', () => renderMessages());
store.subscribe('currentChannel', (channel) => {
  if (chatChannel && chatChannel.value !== channel) {
    chatChannel.value = channel;
  }
  loadMessages(channel);
});
store.subscribe('comments', () => renderComments());
store.subscribe('commentContext', () => updateCommentsModalHeader());

async function loadDashboard() {
  newsList.innerHTML = createSpinner('Chargement des actualités...');
  announcementsList.innerHTML = createSpinner('Récupération des annonces...');
  documentsList.innerHTML = createSpinner('Chargement des documents...');
  reservationsList.innerHTML = createSpinner('Préparation des réservations...');
  tasksList.innerHTML = '<li class="placeholder-glow"><span class="placeholder col-8"></span></li>';
  if (chatMessages) {
    chatMessages.innerHTML = createSpinner('Connexion au chat...');
  }

  const [news, announcements, documents, reservations, tasks, engagement] = await Promise.all([
    fetchTable('news', { order: { column: 'published_at' }, limit: 6 }),
    fetchTable('announcements', { order: { column: 'created_at' } }),
    fetchTable('documents', { order: { column: 'updated_at' }, limit: 6 }),
    fetchTable('reservations', { order: { column: 'start_time', ascending: true }, limit: 8 }),
    fetchTable('tasks', { order: { column: 'due_date', ascending: true }, limit: 5 }),
    fetchEngagementDashboard(),
  ]);

  renderNews(news.data, news.error);
  renderAnnouncements(announcements.data, announcements.error);
  renderDocuments(documents.data, documents.error);
  await applyReservationsResponse(reservations);
  await applyTasksResponse(tasks);
  renderEngagement(engagement.data, engagement.error);

  await refreshMetrics();
  await loadMessages(store.getState().currentChannel);
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
    open_tasks: data.open_tasks,
    pending_approvals: data.pending_approvals,
    general_messages: data.general_messages,
  });
}

async function refreshEngagement() {
  const { data, error } = await fetchEngagementDashboard();
  renderEngagement(data, error);
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
              <button class="btn btn-link btn-sm p-0" data-action="open-comments" data-target-type="news" data-target-id="${item.id}" data-target-title="${item.title}">
                Commentaires
              </button>
            </div>
          </div>
        </article>
      </div>
    `,
    'Aucune actualité publiée pour le moment.'
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
    'Aucune annonce pour le moment.'
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
            <div class="d-flex justify-content-between align-items-center">
              <a class="btn btn-outline-primary" href="${item.url}" target="_blank" rel="noopener">Ouvrir</a>
              <button class="btn btn-link btn-sm p-0" data-action="open-comments" data-target-type="document" data-target-id="${item.id}" data-target-title="${item.title}">
                Commentaires
              </button>
            </div>
          </div>
        </div>
      </div>
    `,
    'Aucun document pour le moment.'
  );
}

function getStatusBadge(status, type) {
  if (!status) return '';
  const normalized = status.toLowerCase();
  const labels = {
    en_attente: { text: 'En attente', className: 'bg-warning text-dark' },
    approuvee: { text: 'Approuvée', className: 'bg-success' },
    refusee: { text: 'Refusée', className: 'bg-danger' },
    ouverte: { text: 'Ouverte', className: 'bg-secondary' },
    en_cours: { text: 'En cours', className: 'bg-info text-dark' },
    terminee: { text: 'Terminée', className: 'bg-success' },
    archivee: { text: 'Archivée', className: 'bg-dark' },
  };
  const badge = labels[normalized];
  if (!badge) return '';
  const prefix = type === 'task' ? 'task-' : '';
  return `<span class="badge ${badge.className} ${prefix}status">${badge.text}</span>`;
}

function renderAttachmentLinks(attachments) {
  if (!attachments || attachments.length === 0) return '';
  return `
    <div class="d-flex flex-wrap gap-2 mt-2">
      ${attachments
        .map(
          (attachment) => `
            <a href="${attachment.file_url}" class="attachment-pill" target="_blank" rel="noopener" title="${attachment.file_name}">
              <span class="me-1" aria-hidden="true">📎</span>${attachment.file_name}
            </a>`
        )
        .join('')}
    </div>
  `;
}

function renderReservations() {
  const { reservations, reservationAttachments, reservationError } = store.getState();

  if (reservationError) {
    reservationsList.innerHTML = `<div class="alert alert-danger">${reservationError}</div>`;
    return;
  }

  if (!reservations.length) {
    reservationsList.innerHTML = `<div class="alert alert-info">Aucune réservation planifiée.</div>`;
    return;
  }

  reservationsList.innerHTML = reservations
    .map((item) => {
      const attachments = reservationAttachments.get(item.id) || [];
      return `
        <div class="timeline-item">
          <div class="timeline-date">${formatDay(item.start_time)}</div>
          <div class="timeline-content">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <h3 class="h6 mb-0">${item.resource}</h3>
              ${getStatusBadge(item.status, 'reservation')}
            </div>
            <p class="mb-1 text-muted">${formatDate(item.start_time)} → ${formatDate(item.end_time)}</p>
            <div class="d-flex flex-wrap gap-2 text-muted small">
              <span class="badge bg-primary-subtle text-primary">${item.team}</span>
              ${item.notes ? `<span>${item.notes}</span>` : ''}
            </div>
            ${renderAttachmentLinks(attachments)}
          </div>
        </div>
      `;
    })
    .join('');
}

function renderTasks() {
  const { tasks, taskAttachments, taskError } = store.getState();

  if (taskError) {
    tasksList.innerHTML = `<li class="text-danger">${taskError}</li>`;
    return;
  }

  if (!tasks.length) {
    tasksList.innerHTML = '<li class="text-muted">Aucune tâche assignée.</li>';
    return;
  }

  tasksList.innerHTML = tasks
    .map((task) => {
      const attachments = taskAttachments.get(task.id) || [];
      const priorityClass =
        task.priority === 'haute'
          ? 'bg-danger'
          : task.priority === 'moyenne'
          ? 'bg-warning text-dark'
          : task.priority === 'basse'
          ? 'bg-secondary'
          : 'bg-success-subtle text-success';
      return `
        <li class="task-item">
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <p class="mb-1 fw-semibold">${task.title}</p>
                <p class="mb-0 text-muted small">${task.description || ''}</p>
              </div>
              ${getStatusBadge(task.status, 'task')}
            </div>
            ${renderAttachmentLinks(attachments)}
          </div>
          <div class="text-end ms-3 d-flex flex-column align-items-end gap-1">
            <span class="badge ${priorityClass}">${task.priority || 'normale'}</span>
            <small class="text-muted">${formatDate(task.due_date)}</small>
          </div>
        </li>
      `;
    })
    .join('');
}

function renderMessages() {
  if (!chatMessages) return;
  const { messages } = store.getState();

  if (!messages.length) {
    chatMessages.innerHTML = '<p class="text-muted small mb-0">Aucun message pour cette chaîne pour le moment.</p>';
    return;
  }

  chatMessages.innerHTML = messages
    .map(
      (message) => `
        <div class="chat-message">
          <div class="d-flex justify-content-between align-items-center">
            <strong>${message.author || 'Anonyme'}</strong>
            <small class="text-muted">${formatDate(message.created_at)}</small>
          </div>
          <p class="mb-0">${message.content}</p>
        </div>
      `
    )
    .join('');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderComments() {
  if (!commentsListEl) return;
  const { comments } = store.getState();

  if (!comments.length) {
    commentsListEl.innerHTML = '';
    if (commentsEmptyState) commentsEmptyState.classList.remove('d-none');
    return;
  }

  if (commentsEmptyState) commentsEmptyState.classList.add('d-none');
  commentsListEl.innerHTML = comments
    .map(
      (comment) => `
        <li class="list-group-item">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <strong>${comment.author}</strong>
            <small class="text-muted">${formatDate(comment.created_at)}</small>
          </div>
          <p class="mb-0">${comment.message}</p>
        </li>
      `
    )
    .join('');
}

function updateCommentsModalHeader() {
  if (!commentsModalLabel) return;
  const context = store.getState().commentContext;
  if (!context) {
    commentsModalLabel.textContent = 'Commentaires';
    return;
  }
  commentsModalLabel.textContent = `Commentaires – ${context.title}`;
}

async function applyReservationsResponse(response) {
  if (response.error) {
    console.error(response.error);
    store.setState({ reservationError: "Impossible de charger les réservations.", reservations: [] });
    return;
  }
  const reservations = response.data || [];
  store.setState({ reservationError: null, reservations });
  const attachments = await buildAttachmentMap('reservation', reservations);
  store.setState({ reservationAttachments: attachments });
}

async function applyTasksResponse(response) {
  if (response.error) {
    console.error(response.error);
    store.setState({ taskError: 'Impossible de charger les tâches.', tasks: [] });
    return;
  }
  const tasks = response.data || [];
  store.setState({ taskError: null, tasks });
  const attachments = await buildAttachmentMap('task', tasks);
  store.setState({ taskAttachments: attachments });
}

async function buildAttachmentMap(targetType, records) {
  if (!records.length) {
    return new Map();
  }
  const { data, error } = await fetchAttachments(targetType, records.map((item) => item.id));
  if (error) {
    console.error(error);
    return new Map();
  }
  const map = new Map();
  data.forEach((attachment) => {
    if (!map.has(attachment.target_id)) {
      map.set(attachment.target_id, []);
    }
    map.get(attachment.target_id).push(attachment);
  });
  return map;
}

async function loadMessages(channel) {
  if (!chatMessages) return;
  const { data, error } = await fetchTable('messages', {
    order: { column: 'created_at', ascending: true },
    eq: { channel },
    limit: 50,
  });
  if (error) {
    console.error(error);
    chatMessages.innerHTML = '<div class="alert alert-danger">Impossible de charger les messages.</div>';
    return;
  }
  store.setState({ messages: data || [] });
}

async function loadComments(targetType, targetId) {
  const { data, error } = await fetchTable('comments', {
    eq: { target_type: targetType, target_id: targetId },
    order: { column: 'created_at', ascending: false },
  });
  if (error) {
    console.error(error);
    showToast("Impossible de charger les commentaires.", 'danger');
    return;
  }
  store.setState({ comments: data || [] });
}

function openComments(targetType, targetId, title) {
  store.setState({ commentContext: { type: targetType, id: targetId, title } });
  loadComments(targetType, targetId);
  if (commentModal) {
    commentModal.show();
  }
}

async function handleAttachment(file, folder, targetType, targetId, uploadedBy) {
  if (!file || !file.name || file.size === 0) {
    return;
  }
  const { data, error } = await uploadAttachment(file, folder);
  if (error) {
    throw error;
  }
  const attachmentPayload = {
    target_type: targetType,
    target_id: targetId,
    file_name: file.name,
    storage_path: data.path,
    file_url: data.url,
    uploaded_by: uploadedBy,
  };
  const { error: attachmentError } = await insertRow('attachments', attachmentPayload);
  if (attachmentError) {
    throw attachmentError;
  }
}

const announcementForm = document.getElementById('announcementForm');
if (announcementForm) {
  handleForm(announcementForm, async (formData) => {
    const payload = {
      author: formData.get('author'),
      message: formData.get('message'),
    };
    const { error } = await insertRow('announcements', payload);
    if (error) throw error;
    showToast('Annonce publiée', 'success');
    await refreshAnnouncements();
  });
}

const newsForm = document.getElementById('newsForm');
if (newsForm) {
  handleForm(newsForm, async (formData) => {
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
}

const documentForm = document.getElementById('documentForm');
if (documentForm) {
  handleForm(documentForm, async (formData) => {
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
}

const reservationForm = document.getElementById('reservationForm');
if (reservationForm) {
  handleForm(reservationForm, async (formData) => {
  const payload = {
    resource: formData.get('resource'),
    team: formData.get('team'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    notes: formData.get('notes'),
  };

  const file = formData.get('attachment');
  const { data, error } = await insertRow('reservations', payload);
  if (error) throw error;

  if (file && file.size) {
    await handleAttachment(file, `reservations/${data.id}`, 'reservation', data.id, payload.team);
  }

  showToast('Réservation créée', 'success');
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById('reservationModal')).hide();
  await refreshReservations();
  await refreshEngagement();
  });
}

const taskForm = document.getElementById('taskForm');
if (taskForm) {
  handleForm(taskForm, async (formData) => {
  const payload = {
    title: formData.get('title'),
    description: formData.get('description'),
    assigned_to: formData.get('assigned_to'),
    due_date: formData.get('due_date'),
    priority: formData.get('priority') || 'normale',
    status: formData.get('status') || 'ouverte',
  };
  const file = formData.get('attachment');
  const { data, error } = await insertRow('tasks', payload);
  if (error) throw error;
  if (file && file.size) {
    await handleAttachment(file, `tasks/${data.id}`, 'task', data.id, payload.assigned_to);
  }
  showToast('Tâche ajoutée', 'success');
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById('taskModal')).hide();
  await refreshTasks();
  await refreshEngagement();
  });
}

if (commentForm) {
  handleForm(commentForm, async (formData) => {
  const context = store.getState().commentContext;
  if (!context) {
    throw new Error('Aucun élément sélectionné pour le commentaire.');
  }
  const payload = {
    target_type: context.type,
    target_id: context.id,
    author: formData.get('author'),
    message: formData.get('message'),
  };
  const { error } = await insertRow('comments', payload);
  if (error) throw error;
  showToast('Commentaire publié', 'success');
  await loadComments(context.type, context.id);
  });
}

if (chatForm) {
  handleForm(chatForm, async (formData) => {
  const payload = {
    author: formData.get('author'),
    content: formData.get('message'),
    channel: chatChannel.value,
  };
  const { error } = await insertRow('messages', payload);
  if (error) throw error;
  showToast('Message envoyé', 'success');
  chatMessage?.focus();
  await refreshMetrics();
  });
}

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
  const response = await fetchTable('reservations', { order: { column: 'start_time', ascending: true }, limit: 8 });
  await applyReservationsResponse(response);
  await refreshMetrics();
}

async function refreshTasks() {
  const response = await fetchTable('tasks', { order: { column: 'due_date', ascending: true }, limit: 5 });
  await applyTasksResponse(response);
  await refreshMetrics();
}

function renderEngagement(data, error) {
  if (!engagementSnapshot) return;
  if (error) {
    engagementSnapshot.innerHTML = '<div class="alert alert-danger mb-0">Impossible de charger le tableau de bord analytique.</div>';
    console.error(error);
    return;
  }
  if (!data) {
    engagementSnapshot.innerHTML = '<p class="text-muted mb-0">Aucune donnée analytique disponible.</p>';
    return;
  }

  const topResources = Array.isArray(data.top_resources)
    ? data.top_resources
        .map((resource) => `<li class="list-group-item d-flex justify-content-between"><span>${resource.resource}</span><span class="fw-semibold">${resource.upcoming_reservations}</span></li>`)
        .join('')
    : '';
  const approvalBreakdown = Array.isArray(data.approval_breakdown)
    ? data.approval_breakdown
        .map((item) => `<li class="list-group-item d-flex justify-content-between"><span>${item.request_type} – ${item.status}</span><span class="fw-semibold">${item.total}</span></li>`)
        .join('')
    : '';

  engagementSnapshot.innerHTML = `
    <div class="row g-3">
      <div class="col-md-4">
        <div class="analytics-tile">
          <span class="analytics-value">${(data.avg_reservations_per_resource || 0).toFixed(1)}</span>
          <span class="analytics-label">Réservations / ressource</span>
        </div>
      </div>
      <div class="col-md-4">
        <div class="analytics-tile">
          <span class="analytics-value">${data.total_late_arrivals || 0}</span>
          <span class="analytics-label">Retards cumulés</span>
        </div>
      </div>
      <div class="col-md-4">
        <div class="analytics-tile">
          <span class="analytics-value">${data.total_comments || 0}</span>
          <span class="analytics-label">Commentaires publiés</span>
        </div>
      </div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-6">
        <h3 class="h6 fw-semibold">Ressources les plus sollicitées</h3>
        ${topResources ? `<ul class="list-group list-group-flush small">${topResources}</ul>` : '<p class="text-muted small">Pas encore de tendances.</p>'}
      </div>
      <div class="col-md-6">
        <h3 class="h6 fw-semibold">Statut des workflows</h3>
        ${approvalBreakdown ? `<ul class="list-group list-group-flush small">${approvalBreakdown}</ul>` : '<p class="text-muted small">Aucune demande suivie.</p>'}
      </div>
    </div>
  `;
}

function setupRealtime() {
  if (setupRealtime.initialized) return;
  setupRealtime.initialized = true;

  const unsubscribes = [
    subscribeToTable('announcements', () => refreshAnnouncements()),
    subscribeToTable('news', () => refreshNews()),
    subscribeToTable('documents', () => refreshDocuments()),
    subscribeToTable('reservations', () => {
      refreshReservations();
      refreshEngagement();
    }),
    subscribeToTable('tasks', () => {
      refreshTasks();
      refreshEngagement();
    }),
    subscribeToTable('attachments', (payload) => {
      const record = payload.new || payload.old;
      if (!record) return;
      if (record.target_type === 'reservation') {
        refreshReservations();
      } else if (record.target_type === 'task') {
        refreshTasks();
      }
    }),
    subscribeToTable('messages', (payload) => {
      const message = payload.new;
      if (message && message.channel === store.getState().currentChannel) {
        const messages = [...store.getState().messages, message].slice(-50);
        store.setState({ messages });
        refreshMetrics();
      }
    }),
    subscribeToTable('comments', (payload) => {
      const context = store.getState().commentContext;
      const record = payload.new || payload.old;
      if (!context || !record) return;
      if (record.target_type === context.type && record.target_id === context.id) {
        loadComments(context.type, context.id);
      }
    }),
  ];

  const cleanup = () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    window.removeEventListener('beforeunload', cleanup);
  };

  window.addEventListener('beforeunload', cleanup);
}

setupRealtime.initialized = false;

newsList.addEventListener('click', handleCommentButtonClick);
documentsList.addEventListener('click', handleCommentButtonClick);

function handleCommentButtonClick(event) {
  const button = event.target.closest('[data-action="open-comments"]');
  if (!button) return;
  event.preventDefault();
  openComments(button.dataset.targetType, button.dataset.targetId, button.dataset.targetTitle);
}

chatChannel?.addEventListener('change', (event) => {
  store.setState({ currentChannel: event.target.value });
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

loadDashboard()
  .then(() => setupRealtime())
  .catch((error) => {
    console.error(error);
    showToast('Impossible de charger le tableau de bord.', 'danger');
  });
