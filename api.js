const headers = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

async function unwrap(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const payload = await res.json();
  let data = payload.body ?? payload.items ?? payload;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch {}
  }
  return data;
}

async function getDocuments() {
  const res = await fetch(`${API_URL}/listDocuments`, { headers });
  return unwrap(res);
}

async function createDocument(doc) {
  const res = await fetch(`${API_URL}/CreateDocuments`, {
    method: "POST", headers, body: JSON.stringify(doc),
  });
  return unwrap(res);
}

async function updateDocument(doc) {
  const res = await fetch(`${API_URL}/updateDocuments`, {
    method: "PUT", headers, body: JSON.stringify(doc),
  });
  return unwrap(res);
}

async function deleteDocument(id) {
  const res = await fetch(`${API_URL}/deleteDocuments?id=${encodeURIComponent(id)}`, {
    method: "DELETE", headers,
  });
  return unwrap(res);
}

async function uploadFile(file) {
  const res = await fetch(`${API_URL}/CreateDocuments?fileName=${encodeURIComponent(file.name)}`, {
    method: "POST",
    headers
  });
  const { uploadUrl, fileUrl } = await unwrap(res);

  await fetch(uploadUrl, {
    method: "PUT",
    body: file
  });

  return fileUrl;
}
