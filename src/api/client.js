export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      "X-LabCheck-Request": "1",
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    body:
      options.body &&
      !(options.body instanceof FormData) &&
      typeof options.body !== "string" &&
      !(options.body instanceof Blob)
        ? JSON.stringify(options.body)
        : options.body,
  });
  const body =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      body?.error?.message || `Request failed (${response.status}).`,
    );
    error.code = body?.error?.code;
    error.status = response.status;
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("labcheck-session-expired"));
    throw error;
  }
  return body;
}

export async function uploadLabAttachment(labId, file) {
  return api(`/labs/${labId}/attachments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Filename": encodeURIComponent(file.name),
    },
    body: file,
  });
}
