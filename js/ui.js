export function createSpinner(message = 'Chargement...') {
  return `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">${message}</p>
    </div>
  `;
}

export function showToast(message, type = 'primary') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
  }

  const wrapper = document.createElement('div');
  wrapper.className = `toast align-items-center text-bg-${type} border-0`;
  wrapper.role = 'alert';
  wrapper.ariaLive = 'assertive';
  wrapper.ariaAtomic = 'true';
  wrapper.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button>
    </div>`;

  container.append(wrapper);
  const toast = new bootstrap.Toast(wrapper, { delay: 3500 });
  toast.show();
}

export function renderList(container, items, renderItem, emptyMessage) {
  if (!items || items.length === 0) {
    container.innerHTML = `<div class="alert alert-info">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = items.map(renderItem).join('');
}

export function handleForm(form, callback) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.innerHTML : null;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Envoi...';
    }

    try {
      await callback(new FormData(form));
      form.reset();
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Une erreur est survenue', 'danger');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    }
  });
}

export function formatDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatDay(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
}
