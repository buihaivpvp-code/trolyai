/**
 * Custom Fetch API wrapper to handle Gemini API Key injection
 * safely without overriding readonly window.fetch properties.
 */

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const customKey = localStorage.getItem("custom_gemini_api_key");
  const authToken = localStorage.getItem("auth_token");
  
  let isGeminiApi = false;
  if (typeof input === "string") {
    isGeminiApi = input.includes("/api/gemini");
  } else if (input && typeof input === "object" && "url" in input) {
    isGeminiApi = (input as any).url.includes("/api/gemini");
  }

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

  return fetch(input, actualInit);
}
