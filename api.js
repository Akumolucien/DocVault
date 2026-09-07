function apiHeaders(includeJson = true) {
  const headers = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getIdToken();

  if (token) {
    headers['Authorization'] = token;
  }

  return headers;
}


async function unwrap(res) {
  if (res.status === 401 || res.status === 403) {
    clearSession();

    window.location.href = 'login.html';

    throw new Error(
      'Your session expired. Please sign in again.'
    );
  }

  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `API error ${res.status}: ${text}`
    );
  }

  if (res.status === 204) {
    return null;
  }

  const text = await res.text();

  return text
    ? JSON.parse(text)
    : null;
}


async function getDocuments() {
  const res = await fetch(
    `${API_URL}items`,
    {
      method: 'GET',
      headers: apiHeaders(false)
    }
  );

  return unwrap(res);
}


async function createDocument(doc) {
  const res = await fetch(
    `${API_URL}items`,
    {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(doc)
    }
  );

  return unwrap(res);
}


async function updateDocument(doc) {
  const res = await fetch(
    `${API_URL}items/${encodeURIComponent(doc.id)}`,
    {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify(doc)
    }
  );

  return unwrap(res);
}


async function deleteDocument(id) {
  const res = await fetch(
    `${API_URL}items/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: apiHeaders(false)
    }
  );

  return unwrap(res);
}


async function getDownloadUrl(id) {
  const res = await fetch(
    `${API_URL}items/${encodeURIComponent(id)}/download`,
    {
      method: 'GET',
      headers: apiHeaders(false)
    }
  );

  const data = await unwrap(res);

  return data.downloadUrl;
}


async function createShareLink(id) {
  const res = await fetch(
    `${API_URL}items/${encodeURIComponent(id)}/share`,
    {
      method: 'POST',
      headers: apiHeaders(false)
    }
  );

  const data = await unwrap(res);

  return `${API_URL}${data.sharePath}`;
}


async function uploadFile(file) {
  const res = await fetch(
    `${API_URL}upload?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(
      file.type || 'application/octet-stream'
    )}`,
    {
      method: 'GET',
      headers: apiHeaders(false)
    }
  );

  const {
    uploadUrl,
    fileUrl
  } = await unwrap(res);

  const uploadResponse = await fetch(
    uploadUrl,
    {
      method: 'PUT',
      headers: {
        'Content-Type':
          file.type ||
          'application/octet-stream'
      },
      body: file
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `S3 upload failed (${uploadResponse.status})`
    );
  }

  return fileUrl;
}