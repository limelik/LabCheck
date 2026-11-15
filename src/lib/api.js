export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`The API returned an unexpected response (${response.status}). Is the backend running?`);
  }
  const result = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(result.error || "The request could not be completed."), {
      status: response.status,
      data: result,
    });
  }

  return result;
}
