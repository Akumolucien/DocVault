const headers = {
  "Content-Type": "application/json",
};

async function unwrap(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getDocuments() {
  const res = await fetch(`${API_URL}items`, { headers });
  return unwrap(res);
}

async function createDocument(doc) {
  const res = await fetch(`${API_URL}items`, {
    method: "POST",
    headers,
    body: JSON.stringify(doc),
  });
  return unwrap(res);
}

async function updateDocument(doc) {
  const res = await fetch(`${API_URL}items/${encodeURIComponent(doc.id)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(doc),
  });
  return unwrap(res);
}

async function deleteDocument(id) {
  const res = await fetch(`${API_URL}items/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });
  return unwrap(res);
}

async function uploadFile(file) {
  const res = await fetch(`${API_URL}upload?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`, {
    method: "GET",
    headers,
  });
  const { uploadUrl, fileUrl } = await unwrap(res);

  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  return fileUrl;
}