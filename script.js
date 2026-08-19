function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

let docsCache = [];

async function loadAndRender() {
  try {
    docsCache = await getDocuments();
    render();
  } catch (err) {
    console.error(err);
    document.getElementById('docList').innerHTML =
      `<p style="color:#A6432F;">Couldn't load documents: ${escapeHtml(err.message)}</p>`;
  }
}

function render() {
  const list = document.getElementById('docList');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('count');
  count.textContent = docsCache.length + (docsCache.length === 1 ? ' document' : ' documents');
  list.innerHTML = '';
  if (docsCache.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  docsCache.forEach((doc) => {
    const row = document.createElement('div');
    row.className = 'doc-row';
    row.innerHTML = `
      <div class="doc-icon">📃</div>
      <div class="doc-info">
        <div class="doc-name" style="overflow:visible;white-space:normal;">${escapeHtml(doc.name || doc.Name || '')}</div>
        <div class="doc-meta">ID ${escapeHtml(doc.id)} · added ${escapeHtml(doc.added || '')}</div>
        ${doc.description ? `<div class="doc-meta">${escapeHtml(doc.description)}</div>` : ''}
      </div>
      <div class="doc-actions">
        <a class="btn ghost" href="${escapeHtml(doc.url || doc['Doc-url'] || '#')}" target="_blank" rel="noopener">Open</a>
        <button class="btn ghost" data-action="edit" data-id="${escapeHtml(doc.id)}">Edit</button>
        <button class="btn ghost danger" data-action="delete" data-id="${escapeHtml(doc.id)}">Delete</button>
      </div>
    `;
    list.appendChild(row);
  });
}

const overlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const fieldId = document.getElementById('fieldId');
const fieldName = document.getElementById('fieldName');
const fieldUrl = document.getElementById('fieldUrl');
const fieldDesc = document.getElementById('fieldDesc');
const modalError = document.getElementById('modalError');
let editingId = null;

function openModal(id = null) {
  editingId = id;
  modalError.textContent = '';
  if (id === null) {
    modalTitle.textContent = 'Add a document';
    fieldId.value = '';
    fieldId.disabled = false;
    fieldName.value = '';
    fieldUrl.value = '';
    fieldDesc.value = '';
  } else {
    const doc = docsCache.find(d => d.id === id);
    modalTitle.textContent = 'Edit document';
    fieldId.value = doc.id;
    fieldId.disabled = true;
    fieldName.value = doc.name || doc.Name || '';
    fieldUrl.value = doc.url || doc['Doc-url'] || '';
    fieldDesc.value = doc.description || '';
  }
  overlay.classList.add('open');
  fieldName.focus();
}

function closeModal() {
  overlay.classList.remove('open');
  editingId = null;
}

document.getElementById('uploadBtn').addEventListener('click', () => openModal());
document.getElementById('dropZone').addEventListener('click', () => openModal());
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

document.getElementById('saveBtn').addEventListener('click', async () => {
  const id = fieldId.value.trim();
  const name = fieldName.value.trim();
  const url = fieldUrl.value.trim();
  const description = fieldDesc.value.trim();

  if (!id || !name || !url) {
    modalError.textContent = 'ID, Name, and Doc URL are required.';
    return;
  }

  try {
    const doc = { id, name, url, description, added: new Date().toLocaleDateString() };
    if (editingId === null) {
      await createDocument(doc);
    } else {
      await updateDocument(doc);
    }
    await loadAndRender();
    closeModal();
  } catch (err) {
    modalError.textContent = err.message;
  }
});

document.getElementById('docList').addEventListener('click', async e => {
  const action = e.target.dataset.action;
  if (!action) return;
  const id = e.target.dataset.id;

  if (action === 'delete') {
    const doc = docsCache.find(d => d.id === id);
    if (confirm(`Delete "${doc.name || doc.Name}"?`)) {
      try {
        await deleteDocument(id);
        await loadAndRender();
      } catch (err) {
        alert(err.message);
      }
    }
  } else if (action === 'edit') {
    openModal(id);
  }
});

loadAndRender();