let docsCache = [];
let editingId = null;


function escapeHtml(value = '') {
  const d = document.createElement('div');
  d.textContent = String(value);
  return d.innerHTML;
}


function docName(doc) {
  return doc.name || doc.Name || 'Untitled document';
}


function documentIcon(doc) {
  const name = (doc.name || '').toLowerCase();

  if (name.endsWith('.pdf')) return 'PDF';

  if (
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  ) {
    return 'DOC';
  }

  if (name.match(/\.(png|jpe?g|gif|webp)$/)) {
    return 'IMG';
  }

  return 'FILE';
}


async function loadAndRender() {
  try {
    docsCache = await getDocuments();

    if (!Array.isArray(docsCache)) {
      docsCache = [];
    }

    render();

  } catch (err) {
    console.error(err);

    document.getElementById('docList').innerHTML =
      `<div class="error-card">
        Couldn't load documents: ${escapeHtml(err.message)}
      </div>`;
  }
}


function render() {
  const query = document
    .getElementById('searchInput')
    .value
    .trim()
    .toLowerCase();

  const filtered = docsCache.filter(doc => {
    const haystack = `
      ${docName(doc)}
      ${doc.description || ''}
      ${doc.id || ''}
    `.toLowerCase();

    return haystack.includes(query);
  });

  const list = document.getElementById('docList');
  const empty = document.getElementById('emptyState');

  document.getElementById('count').textContent =
    `${docsCache.length} ${
      docsCache.length === 1
        ? 'document'
        : 'documents'
    }`;

  document.getElementById('countNumber').textContent =
    docsCache.length;

  list.innerHTML = '';

  if (filtered.length === 0) {
    empty.style.display = 'flex';

    empty.querySelector('strong').textContent =
      docsCache.length
        ? 'No matching documents'
        : 'No documents yet';

    empty.querySelector('span:last-child').textContent =
      docsCache.length
        ? 'Try a different search.'
        : 'Upload your first document to get started.';

    return;
  }

  empty.style.display = 'none';

  filtered.forEach(doc => {
    const row = document.createElement('article');

    row.className = 'doc-row';

    row.innerHTML = `
      <div class="file-badge">
        ${documentIcon(doc)}
      </div>

      <div class="doc-info">

        <div class="doc-name">
          ${escapeHtml(docName(doc))}
        </div>

        <div class="doc-meta">
          ${escapeHtml(
            doc.description || 'No description'
          )}
        </div>

        <div class="doc-meta small">
          ID ${escapeHtml(doc.id || '')}
          ·
          Added ${escapeHtml(doc.added || '—')}
        </div>

      </div>

      <div class="doc-actions">

        <button
          class="btn ghost compact"
          data-action="open"
          data-id="${escapeHtml(doc.id)}">
          Open
        </button>

        <button
          class="btn ghost compact"
          data-action="share"
          data-id="${escapeHtml(doc.id)}">
          Share
        </button>

        <button
          class="btn ghost compact"
          data-action="edit"
          data-id="${escapeHtml(doc.id)}">
          Edit
        </button>

        <button
          class="btn ghost compact danger"
          data-action="delete"
          data-id="${escapeHtml(doc.id)}">
          Delete
        </button>

      </div>
    `;

    list.appendChild(row);
  });
}


const overlay =
  document.getElementById('modalOverlay');

const modalTitle =
  document.getElementById('modalTitle');

const fieldId =
  document.getElementById('fieldId');

const fieldName =
  document.getElementById('fieldName');

const fieldFile =
  document.getElementById('fieldFile');

const fieldDesc =
  document.getElementById('fieldDesc');

const modalError =
  document.getElementById('modalError');

const saveBtn =
  document.getElementById('saveBtn');


function openModal(id = null, droppedFile = null) {
  editingId = id;

  modalError.textContent = '';

  fieldFile.value = '';

  if (id === null) {
    modalTitle.textContent =
      'Upload document';

    fieldId.value =
      `DOC-${Date.now().toString().slice(-6)}`;

    fieldId.disabled = false;

    fieldName.value = droppedFile
      ? droppedFile.name.replace(/\.[^.]+$/, '')
      : '';

    fieldDesc.value = '';

  } else {
    const doc = docsCache.find(
      d => String(d.id) === String(id)
    );

    if (!doc) return;

    modalTitle.textContent =
      'Edit document';

    fieldId.value = doc.id;

    fieldId.disabled = true;

    fieldName.value =
      docName(doc);

    fieldDesc.value =
      doc.description || '';
  }

  overlay.classList.add('open');

  fieldName.focus();
}


function closeModal() {
  overlay.classList.remove('open');

  editingId = null;

  saveBtn.disabled = false;

  saveBtn.textContent =
    'Save document';
}


async function saveDocument() {
  const id =
    fieldId.value.trim();

  const name =
    fieldName.value.trim();

  const description =
    fieldDesc.value.trim();

  const file =
    fieldFile.files[0];

  if (
    !id ||
    !name ||
    (!file && editingId === null)
  ) {
    modalError.textContent =
      'Document ID, name and file are required.';

    return;
  }

  try {
    saveBtn.disabled = true;

    saveBtn.textContent =
      file
        ? 'Uploading...'
        : 'Saving...';

    modalError.textContent = '';

    const existing =
      editingId !== null
        ? docsCache.find(
            d =>
              String(d.id) ===
              String(editingId)
          )
        : null;

    let url = null;

    if (file) {
      url = await uploadFile(file);
    }

    const doc = {
      id,
      name,
      description,
      added:
        existing?.added ||
        new Date().toLocaleDateString()
    };

    if (url) {
      doc.url = url;
    }

    if (editingId === null) {
      await createDocument(doc);
    } else {
      await updateDocument(doc);
    }

    await loadAndRender();

    closeModal();

  } catch (err) {
    modalError.textContent =
      err.message;

    saveBtn.disabled = false;

    saveBtn.textContent =
      'Save document';
  }
}


async function init() {
  const ok =
    await ensureAuthenticated();

  if (!ok) return;

  const user =
    getCurrentUser();

  const display =
    user.email ||
    user.username ||
    'User';

  document.getElementById(
    'userEmail'
  ).textContent = display;

  document.getElementById(
    'avatar'
  ).textContent =
    display.charAt(0).toUpperCase();


  document.getElementById(
    'logoutBtn'
  ).addEventListener(
    'click',
    logout
  );


  document.getElementById(
    'uploadBtn'
  ).addEventListener(
    'click',
    () => openModal()
  );


  document.getElementById(
    'sideUpload'
  ).addEventListener(
    'click',
    () => openModal()
  );


  document.getElementById(
    'cancelBtn'
  ).addEventListener(
    'click',
    closeModal
  );


  document.getElementById(
    'closeModalBtn'
  ).addEventListener(
    'click',
    closeModal
  );


  document.getElementById(
    'saveBtn'
  ).addEventListener(
    'click',
    saveDocument
  );


  document.getElementById(
    'searchInput'
  ).addEventListener(
    'input',
    render
  );


  overlay.addEventListener(
    'click',
    e => {
      if (e.target === overlay) {
        closeModal();
      }
    }
  );


  const dropZone =
    document.getElementById(
      'dropZone'
    );


  dropZone.addEventListener(
    'click',
    () => openModal()
  );


  ['dragenter', 'dragover']
    .forEach(type => {
      dropZone.addEventListener(
        type,
        e => {
          e.preventDefault();

          dropZone
            .classList
            .add('drag');
        }
      );
    });


  ['dragleave', 'drop']
    .forEach(type => {
      dropZone.addEventListener(
        type,
        e => {
          e.preventDefault();

          dropZone
            .classList
            .remove('drag');
        }
      );
    });


  dropZone.addEventListener(
    'drop',
    e => {
      const file =
        e.dataTransfer.files[0];

      if (file) {
        openModal(
          null,
          file
        );

        try {
          const dt =
            new DataTransfer();

          dt.items.add(file);

          fieldFile.files =
            dt.files;

        } catch (_) {}
      }
    }
  );


  document.getElementById(
    'docList'
  ).addEventListener(
    'click',
    async e => {
      const button =
        e.target.closest(
          '[data-action]'
        );

      if (!button) return;

      const id =
        button.dataset.id;

      const action =
        button.dataset.action;


      if (action === 'open') {
        try {
          button.disabled = true;

          button.textContent =
            'Opening...';

          const downloadUrl =
            await getDownloadUrl(id);

          window.open(
            downloadUrl,
            '_blank',
            'noopener'
          );

        } catch (err) {
          alert(err.message);

        } finally {
          button.disabled = false;

          button.textContent =
            'Open';
        }

        return;
      }


      if (action === 'share') {
        try {
          button.disabled = true;

          button.textContent =
            'Creating...';

          const shareUrl =
            await createShareLink(id);

          try {
            await navigator.clipboard.writeText(
              shareUrl
            );

            alert(
              'Share link copied to clipboard.\n\n' +
              shareUrl
            );

          } catch (_) {
            prompt(
              'Copy this share link:',
              shareUrl
            );
          }

        } catch (err) {
          alert(err.message);

        } finally {
          button.disabled = false;

          button.textContent =
            'Share';
        }

        return;
      }


      if (action === 'edit') {
        openModal(id);

        return;
      }


      if (action === 'delete') {
        const doc =
          docsCache.find(
            d =>
              String(d.id) ===
              String(id)
          );

        if (
          doc &&
          confirm(
            `Delete "${docName(doc)}"?`
          )
        ) {
          try {
            button.disabled = true;

            await deleteDocument(id);

            await loadAndRender();

          } catch (err) {
            alert(err.message);

            button.disabled = false;
          }
        }
      }
    }
  );


  await loadAndRender();
}


init();