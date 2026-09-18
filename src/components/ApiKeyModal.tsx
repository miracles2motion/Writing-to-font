import React, { useState, useEffect } from "react";
import {
  Key,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  ExternalLink,
  Trash2,
  X,
  Cpu,
  RefreshCw,
  Sparkles,
  Zap,
  Activity,
  Layers,
} from "lucide-react";

const STORAGE_KEY = "user_gemini_api_key";
const MODEL_STORAGE_KEY = "user_gemini_model_preference";

export interface AvailableModel {
  id: string;
  name: string;
  description: string;
  badge: string;
  recommendedFor: string;
}

export const SUPPORTED_MODELS: AvailableModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Default)",
    description: "Ultra-fast vision & OCR intelligence. Highest quota and lowest latency for glyph segmentation.",
    badge: "Fastest & Recommended",
    recommendedFor: "Glyph detection, auto-casing, handwriting OCR",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Deep typographic reasoning & aesthetic synthesis for nuanced font advice & vector extrapolation.",
    badge: "Highest Intelligence",
    recommendedFor: "Complex decorative fonts, vector synthesis",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Lightweight fallback model for maximum throughput and resilience.",
    badge: "High Throughput",
    recommendedFor: "Rapid single-glyph classification",
  },
];

export function getCustomApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function setCustomApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent("gemini-api-key-updated"));
  } catch (err) {
    console.error("Failed to store Gemini API key in localStorage:", err);
  }
}

export function removeCustomApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("gemini-api-key-updated"));
  } catch (err) {
    console.error("Failed to remove Gemini API key:", err);
  }
}

export function getCustomModelPreference(): string {
  if (typeof window === "undefined") return "gemini-3.8-flash";
  try {
    const val = localStorage.getItem(MODEL_STORAGE_KEY);
    return val && val.trim() ? val.trim() : "gemini-3.8-flash";
  } catch {
    return "gemini-3.8-flash";
  }
}

export function setCustomModelPreference(modelId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    window.dispatchEvent(new CustomEvent("gemini-model-updated", { detail: modelId }));
  } catch (err) {
    console.error("Failed to store Gemini model preference:", err);
  }
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (key: string, model: string) => void;
  showToast?: (msg: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  showToast,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.8-flash");
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"key" | "models">("key");

  useEffect(() => {
    if (isOpen) {
      const existing = getCustomApiKey();
      if (existing) {
        setApiKey(existing);
        setHasExistingKey(true);
      } else {
        setApiKey("");
        setHasExistingKey(false);
      }
      setSelectedModel(getCustomModelPreference());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const cleaned = apiKey.trim();
    setCustomApiKey(cleaned);
    setCustomModelPreference(selectedModel);
    setHasExistingKey(Boolean(cleaned));
    setSavedSuccess(true);
    onSave?.(cleaned, selectedModel);
    showToast?.(
      `Settings saved! Preferred model: ${selectedModel}. Auto-fallback circuit active.`
    );
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleClear = () => {
    removeCustomApiKey();
    setApiKey("");
    setHasExistingKey(false);
    showToast?.("Removed custom Gemini API key from local storage.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">
                AI Engine &amp; Gemini Settings
              </h3>
              <p className="text-xs text-neutral-400">
                API Key, Model Switcher &amp; Automatic Failover
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2 border-b border-neutral-800 bg-neutral-900/50">
          <button
            onClick={() => setActiveTab("key")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "key"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Key Credentials</span>
            {hasExistingKey && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("models")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "models"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Model Selection &amp; Failover</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "key" ? (
            /* API Key Tab */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-neutral-850 border border-neutral-800 text-xs text-neutral-300 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Private Local Client Storage</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Your API key is saved solely in your web browser's <code className="text-neutral-300 font-mono">localStorage</code>.
                  It is passed securely via authenticated headers to the backend proxy for font extraction and auto-labeling.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  Google Gemini API Key
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setSavedSuccess(false);
                    }}
                    placeholder="AIzaSy..."
                    className="w-full pl-3.5 pr-20 py-2.5 bg-neutral-950 border border-neutral-700/80 rounded-xl text-sm font-mono text-neutral-100 placeholder-neutral-600 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition"
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                  <span>Need an API key?</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 underline"
                  >
                    <span>Get free key at Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* Model Selection & Auto-Failover Tab */
            <div className="space-y-4">
              {/* Failover Explainer Box */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-neutral-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Automatic Multi-Model Failover Architecture</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  If your chosen model encounters rate limits (429), temporary unavailability (503), or quota exhaustion, our server automatically intercepts the error and seamlessly falls back through the standby model chain in real time.
                </p>
                <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-mono text-amber-300/80">
                  <span>Selected Model</span>
                  <span>→</span>
                  <span>gemini-3.8-flash</span>
                  <span>→</span>
                  <span>gemini-3.1-flash-lite</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  Primary Preferred Model
                </label>
                <div className="space-y-2">
                  {SUPPORTED_MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5"
                            : "bg-neutral-850 hover:bg-neutral-800 border-neutral-750"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-100">
                              {model.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">
                            {model.description}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            Best for: {model.recommendedFor}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition ${
                            isSelected
                              ? "border-amber-400 bg-amber-500 text-neutral-950"
                              : "border-neutral-600 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>Settings updated successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3">
          {hasExistingKey ? (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Key</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 active:scale-95 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
