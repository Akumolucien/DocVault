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