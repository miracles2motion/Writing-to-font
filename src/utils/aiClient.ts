import { getCustomApiKey, getCustomModelPreference } from "../components/ApiKeyModal";

/**
 * Builds request headers for AI proxy endpoints.
 * Injects user's locally stored Gemini API key and model selection if present.
 */
export function getAiRequestHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  const customKey = getCustomApiKey();
  if (customKey) {
    headers["Authorization"] = `Bearer ${customKey}`;
    headers["x-gemini-api-key"] = customKey;
  }

  const preferredModel = getCustomModelPreference();
  if (preferredModel) {
    headers["x-gemini-model"] = preferredModel;
  }

  return headers;
}

/**
 * Checks whether an active Gemini API key is configured (either client custom key or server environment key).
 */
export async function checkHasActiveAiKey(): Promise<boolean> {
  const customKey = getCustomApiKey();
  if (customKey && customKey.trim()) return true;
  try {
    const res = await fetch("/api/ai/status");
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.hasKey);
    }
  } catch {}
  return false;
}
