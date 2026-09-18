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
