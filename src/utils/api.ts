/**
 * Custom Fetch API wrapper to handle Gemini API Key injection
 * safely without overriding readonly window.fetch properties.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");

function resolveApiUrl(input: RequestInfo | URL): string | RequestInfo | URL {
  if (typeof input !== "string") {
    return input;
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  if (!input.startsWith("/")) {
    return input;
  }

  if (!API_BASE_URL) {
    return input;
  }

  return `${API_BASE_URL}${input}`;
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }

  return "";
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const customKey = localStorage.getItem("custom_gemini_api_key");
  const authToken = localStorage.getItem("auth_token");
  const resolvedInput = resolveApiUrl(input);
  const requestUrl = extractUrl(resolvedInput);

  const isGeminiApi = requestUrl.includes("/api/gemini");

  let actualInit = init || {};
  const headers = new Headers(actualInit.headers || {});

  if (customKey && customKey.trim() && isGeminiApi) {
    headers.set("x-gemini-api-key", customKey.trim());
  }

  if (authToken && authToken.trim()) {
    headers.set("Authorization", `Bearer ${authToken.trim()}`);
  }

  actualInit = {
    ...actualInit,
    headers
  };

  return fetch(resolvedInput, actualInit);
}
