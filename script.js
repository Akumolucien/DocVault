let docsCache = [];
let editingId = null;
let deleteTargetId = null;
let toastTimer = null;


function escapeHtml(value = '') {
  const div =
    document.createElement('div');

  div.textContent =
    String(value);

  return div.innerHTML;
}


function docName(doc) {
  return (
    doc.name ||
    doc.Name ||
    'Untitled document'
  );
}


function documentIcon(doc) {
  const name =
    docName(doc)
      .toLowerCase();

  if (
    name.endsWith('.pdf')
  ) {
    return 'PDF';
  }

  if (
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  ) {
    return 'DOC';
  }

  if (
    name.endsWith('.xls') ||
    name.endsWith('.xlsx')
  ) {
    return 'XLS';
  }

  if (
    name.endsWith('.ppt') ||
    name.endsWith('.pptx')
  ) {
    return 'PPT';
  }

  if (
    name.match(
      /\.(png|jpe?g|gif|webp)$/i
    )
  ) {
    return 'IMG';
  }

  if (
    name.endsWith('.txt')
  ) {
    return 'TXT';
  }

  return 'FILE';
}


function showToast(
  text,
  type = 'success'
) {
  const toast =
    document.getElementById(
      'toast'
    );

  clearTimeout(
    toastTimer
  );

  toast.textContent =
    text;

  toast.className =
    `toast ${type} show`;

  toastTimer =
    setTimeout(
      () => {
        toast.className =
          'toast';
      },
      3200
    );
}


function setOverlay(
  overlay,
  open
) {
  overlay.classList.toggle(
    'open',
    open
  );

  overlay.setAttribute(
    'aria-hidden',
    String(!open)
  );

  document.body.style.overflow =
    open
      ? 'hidden'
      : '';
}


async function loadAndRender() {
  const loadingState =
    document.getElementById(
      'loadingState'
    );

  const docList =
    document.getElementById(
      'docList'
    );

  const empty =
    document.getElementById(
      'emptyState'
    );

  loadingState.style.display =
    'flex';

  docList.style.display =
    'none';

  empty.style.display =
    'none';


  try {

    docsCache =
      await getDocuments();

    if (
      !Array.isArray(
        docsCache
      )
    ) {
      docsCache = [];
    }

    loadingState.style.display =
      'none';

    docList.style.display =
      'grid';

    render();

  } catch (err) {

    console.error(
      err
    );

    loadingState.style.display =
      'none';

    docList.style.display =
      'block';

    docList.innerHTML = `
      <div class="error-card">
        Couldn't load documents:
        ${escapeHtml(err.message)}
      </div>
    `;

  }
}


function getFilteredDocuments() {
  const query =
    document
      .getElementById(
        'searchInput'
      )
      .value
      .trim()
      .toLowerCase();

  const sort =
    document
      .getElementById(
        'sortSelect'
      )
      .value;


  let filtered =
    docsCache.filter(
      doc => {

        const haystack = `
          ${docName(doc)}
          ${doc.description || ''}
          ${doc.id || ''}
        `
          .toLowerCase();

        return haystack
          .includes(
            query
          );

      }
    );


  if (
    sort === 'name'
  ) {

    filtered =
      [...filtered]
        .sort(
          (a, b) =>
            docName(a)
              .localeCompare(
                docName(b)
              )
        );

  }


  return filtered;
}


function render() {
  const filtered =
    getFilteredDocuments();

  const list =
    document.getElementById(
      'docList'
    );

  const empty =
    document.getElementById(
      'emptyState'
    );

  const count =
    docsCache.length;


  document
    .getElementById(
      'count'
    )
    .textContent =
      `${count} ${
        count === 1
          ? 'document'
          : 'documents'
      }`;


  document
    .getElementById(
      'countNumber'
    )
    .textContent =
      count;


  list.innerHTML =
    '';


  if (
    filtered.length === 0
  ) {

    empty.style.display =
      'flex';

    list.style.display =
      'none';


    const title =
      empty.querySelector(
        'strong'
      );

    const description =
      empty.querySelector(
        ':scope > span'
      );

    const uploadButton =
      document.getElementById(
        'emptyUploadBtn'
      );


    if (
      docsCache.length
    ) {

      title.textContent =
        'No matching documents';

      description.textContent =
        'Try a different search.';

      uploadButton.style.display =
        'none';

    } else {

      title.textContent =
        'No documents yet';

      description.textContent =
        'Upload your first document to get started.';

      uploadButton.style.display =
        'inline-flex';

    }

    return;

  }


  empty.style.display =
    'none';

  list.style.display =
    'grid';


  filtered.forEach(
    doc => {

      const row =
        document.createElement(
          'article'
        );

      row.className =
        'doc-row';


      row.innerHTML = `
        <div class="file-badge">
          ${documentIcon(doc)}
        </div>

        <div class="doc-info">

          <div
            class="doc-name"
            title="${escapeHtml(
              docName(doc)
            )}"
          >
            ${escapeHtml(
              docName(doc)
            )}
          </div>

          <div class="doc-meta">
            ${escapeHtml(
              doc.description ||
              'No description'
            )}
          </div>

          <div class="doc-meta small">
            ID ${escapeHtml(
              doc.id || ''
            )}
            ·
            Added ${escapeHtml(
              doc.added || '—'
            )}
          </div>

        </div>

        <div class="doc-actions">

          <button
            type="button"
            class="btn secondary compact"
            data-action="open"
            data-id="${escapeHtml(
              doc.id
            )}"
          >
            Open
          </button>

          <button
            type="button"
            class="btn secondary compact"
            data-action="share"
            data-id="${escapeHtml(
              doc.id
            )}"
          >
            Share
          </button>

          <button
            type="button"
            class="btn secondary compact"
            data-action="edit"
            data-id="${escapeHtml(
              doc.id
            )}"
          >
            Edit
          </button>

          <button
            type="button"
            class="btn secondary compact danger"
            data-action="delete"
            data-id="${escapeHtml(
              doc.id
            )}"
          >
            Delete
          </button>

        </div>
      `;


      list.appendChild(
        row
      );

    }
  );
}


const overlay =
  document.getElementById(
    'modalOverlay'
  );

const shareOverlay =
  document.getElementById(
    'shareOverlay'
  );

const deleteOverlay =
  document.getElementById(
    'deleteOverlay'
  );

const modalTitle =
  document.getElementById(
    'modalTitle'
  );

const modalSubtitle =
  document.getElementById(
    'modalSubtitle'
  );

const fieldId =
  document.getElementById(
    'fieldId'
  );

const fieldName =
  document.getElementById(
    'fieldName'
  );

const fieldFile =
  document.getElementById(
    'fieldFile'
  );

const fieldDesc =
  document.getElementById(
    'fieldDesc'
  );

const modalError =
  document.getElementById(
    'modalError'
  );

const saveBtn =
  document.getElementById(
    'saveBtn'
  );


function openModal(
  id = null,
  droppedFile = null
) {
  editingId =
    id;

  modalError.textContent =
    '';

  fieldFile.value =
    '';


  if (
    id === null
  ) {

    modalTitle.textContent =
      'Upload document';

    modalSubtitle.textContent =
      'Add a file and its details to your vault.';

    fieldId.value =
      `DOC-${
        Date.now()
          .toString()
          .slice(-6)
      }`;

    fieldId.disabled =
      false;

    fieldName.value =
      droppedFile
        ? droppedFile.name
        : '';

    fieldDesc.value =
      '';

    document
      .getElementById(
        'fileGroup'
      )
      .style.display =
        'block';

  } else {

    const doc =
      docsCache.find(
        item =>
          String(item.id) ===
          String(id)
      );

    if (!doc) {
      return;
    }

    modalTitle.textContent =
      'Edit document';

    modalSubtitle.textContent =
      'Update this document’s information.';

    fieldId.value =
      doc.id;

    fieldId.disabled =
      true;

    fieldName.value =
      docName(doc);

    fieldDesc.value =
      doc.description || '';

    document
      .getElementById(
        'fileGroup'
      )
      .style.display =
        'none';

  }


  setOverlay(
    overlay,
    true
  );

  setTimeout(
    () => {
      fieldName.focus();
    },
    50
  );
}


function closeModal() {
  setOverlay(
    overlay,
    false
  );

  editingId =
    null;

  saveBtn.disabled =
    false;

  saveBtn.textContent =
    'Save document';

  modalError.textContent =
    '';
}


async function saveDocument() {
  const id =
    fieldId
      .value
      .trim();

  const name =
    fieldName
      .value
      .trim();

  const description =
    fieldDesc
      .value
      .trim();

  const file =
    fieldFile
      .files[0];


  if (
    !id ||
    !name ||
    (
      !file &&
      editingId === null
    )
  ) {

    modalError.textContent =
      'Please complete all required fields.';

    return;

  }


  try {

    saveBtn.disabled =
      true;

    saveBtn.textContent =
      file
        ? 'Uploading...'
        : 'Saving...';

    modalError.textContent =
      '';


    const existing =
      editingId !== null
        ? docsCache.find(
            doc =>
              String(doc.id) ===
              String(editingId)
          )
        : null;


    let url =
      null;


    if (file) {
      url =
        await uploadFile(
          file
        );
    }


    const doc = {
      id,
      name,
      description,

      added:
        existing?.added ||
        new Date()
          .toLocaleDateString()
    };


    if (url) {
      doc.url =
        url;
    }


    if (
      editingId === null
    ) {

      await createDocument(
        doc
      );

      showToast(
        'Document uploaded successfully.'
      );

    } else {

      await updateDocument(
        doc
      );

      showToast(
        'Document updated successfully.'
      );

    }


    closeModal();

    await loadAndRender();

  } catch (err) {

    modalError.textContent =
      err.message;

    saveBtn.disabled =
      false;

    saveBtn.textContent =
      'Save document';

  }
}


function openShareModal(
  link
) {
  document
    .getElementById(
      'shareLinkInput'
    )
    .value =
      link;

  setOverlay(
    shareOverlay,
    true
  );
}


function closeShareModal() {
  setOverlay(
    shareOverlay,
    false
  );
}


function openDeleteModal(
  id
) {
  const doc =
    docsCache.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!doc) {
    return;
  }


  deleteTargetId =
    id;

  document
    .getElementById(
      'deleteMessage'
    )
    .textContent =
      `"${
        docName(doc)
      }" will be permanently deleted.`;

  setOverlay(
    deleteOverlay,
    true
  );
}


function closeDeleteModal() {
  deleteTargetId =
    null;

  setOverlay(
    deleteOverlay,
    false
  );
}


async function confirmDelete() {
  if (
    !deleteTargetId
  ) {
    return;
  }


  const button =
    document.getElementById(
      'confirmDeleteBtn'
    );

  try {

    button.disabled =
      true;

    button.textContent =
      'Deleting...';


    await deleteDocument(
      deleteTargetId
    );


    closeDeleteModal();

    showToast(
      'Document deleted.'
    );

    await loadAndRender();

  } catch (err) {

    showToast(
      err.message,
      'error'
    );

  } finally {

    button.disabled =
      false;

    button.textContent =
      'Delete document';

  }
}


async function handleDocumentAction(
  button
) {
  const id =
    button.dataset.id;

  const action =
    button.dataset.action;


  if (
    action === 'open'
  ) {

    const originalText =
      button.textContent;

    try {

      button.disabled =
        true;

      button.textContent =
        'Opening...';

      const downloadUrl =
        await getDownloadUrl(
          id
        );

      window.open(
        downloadUrl,
        '_blank',
        'noopener'
      );

    } catch (err) {

      showToast(
        err.message,
        'error'
      );

    } finally {

      button.disabled =
        false;

      button.textContent =
        originalText;

    }

    return;
  }


  if (
    action === 'share'
  ) {

    const originalText =
      button.textContent;

    try {

      button.disabled =
        true;

      button.textContent =
        'Creating...';

      const shareUrl =
        await createShareLink(
          id
        );

      openShareModal(
        shareUrl
      );

    } catch (err) {

      showToast(
        err.message,
        'error'
      );

    } finally {

      button.disabled =
        false;

      button.textContent =
        originalText;

    }

    return;
  }


  if (
    action === 'edit'
  ) {

    openModal(
      id
    );

    return;
  }


  if (
    action === 'delete'
  ) {

    openDeleteModal(
      id
    );

  }
}


async function init() {
  const ok =
    await ensureAuthenticated();

  if (!ok) {
    return;
  }


  const user =
    getCurrentUser();

  const display =
    user.email ||
    user.username ||
    'User';


  document
    .getElementById(
      'userEmail'
    )
    .textContent =
      display;


  document
    .getElementById(
      'avatar'
    )
    .textContent =
      display
        .charAt(0)
        .toUpperCase();


  document
    .getElementById(
      'logoutBtn'
    )
    .addEventListener(
      'click',
      logout
    );


  document
    .getElementById(
      'uploadBtn'
    )
    .addEventListener(
      'click',
      () =>
        openModal()
    );


  document
    .getElementById(
      'emptyUploadBtn'
    )
    .addEventListener(
      'click',
      () =>
        openModal()
    );


  document
    .getElementById(
      'cancelBtn'
    )
    .addEventListener(
      'click',
      closeModal
    );


  document
    .getElementById(
      'closeModalBtn'
    )
    .addEventListener(
      'click',
      closeModal
    );


  saveBtn.addEventListener(
    'click',
    saveDocument
  );


  document
    .getElementById(
      'searchInput'
    )
    .addEventListener(
      'input',
      render
    );


  document
    .getElementById(
      'sortSelect'
    )
    .addEventListener(
      'change',
      render
    );


  overlay.addEventListener(
    'click',
    e => {

      if (
        e.target === overlay
      ) {
        closeModal();
      }

    }
  );


  shareOverlay.addEventListener(
    'click',
    e => {

      if (
        e.target ===
        shareOverlay
      ) {
        closeShareModal();
      }

    }
  );


  deleteOverlay.addEventListener(
    'click',
    e => {

      if (
        e.target ===
        deleteOverlay
      ) {
        closeDeleteModal();
      }

    }
  );


  document
    .getElementById(
      'closeShareBtn'
    )
    .addEventListener(
      'click',
      closeShareModal
    );


  document
    .getElementById(
      'copyShareBtn'
    )
    .addEventListener(
      'click',
      async () => {

        const input =
          document.getElementById(
            'shareLinkInput'
          );

        try {

          await navigator
            .clipboard
            .writeText(
              input.value
            );

          showToast(
            'Share link copied.'
          );

        } catch {

          input.select();

          document.execCommand(
            'copy'
          );

          showToast(
            'Share link copied.'
          );

        }

      }
    );


  document
    .getElementById(
      'cancelDeleteBtn'
    )
    .addEventListener(
      'click',
      closeDeleteModal
    );


  document
    .getElementById(
      'confirmDeleteBtn'
    )
    .addEventListener(
      'click',
      confirmDelete
    );


  document
    .getElementById(
      'docList'
    )
    .addEventListener(
      'click',
      async e => {

        const button =
          e.target.closest(
            '[data-action]'
          );

        if (!button) {
          return;
        }

        await handleDocumentAction(
          button
        );

      }
    );


  const dropZone =
    document.getElementById(
      'dropZone'
    );


  [
    'dragenter',
    'dragover'
  ].forEach(
    type => {

      dropZone.addEventListener(
        type,
        e => {

          e.preventDefault();

          dropZone
            .classList
            .add(
              'drag'
            );

        }
      );

    }
  );


  [
    'dragleave',
    'drop'
  ].forEach(
    type => {

      dropZone.addEventListener(
        type,
        e => {

          e.preventDefault();

          dropZone
            .classList
            .remove(
              'drag'
            );

        }
      );

    }
  );


  dropZone.addEventListener(
    'drop',
    e => {

      const file =
        e.dataTransfer
          .files[0];

      if (!file) {
        return;
      }


      openModal(
        null,
        file
      );


      try {

        const transfer =
          new DataTransfer();

        transfer.items.add(
          file
        );

        fieldFile.files =
          transfer.files;

      } catch {

        showToast(
          'Select the file again in the upload window.',
          'error'
        );

      }

    }
  );


  document.addEventListener(
    'keydown',
    e => {

      if (
        e.key !== 'Escape'
      ) {
        return;
      }


      if (
        overlay
          .classList
          .contains(
            'open'
          )
      ) {
        closeModal();
      }


      if (
        shareOverlay
          .classList
          .contains(
            'open'
          )
      ) {
        closeShareModal();
      }


      if (
        deleteOverlay
          .classList
          .contains(
            'open'
          )
      ) {
        closeDeleteModal();
      }

    }
  );


  await loadAndRender();
}


init();