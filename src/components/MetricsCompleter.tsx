import React, { useState } from "react";
import {
  Sliders,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info,
  Type,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { FontSettings, DetectedGlyph } from "../types";

interface MetricsCompleterProps {
  settings: FontSettings;
  glyphs: DetectedGlyph[];
  onUpdateSettings: (settings: Partial<FontSettings>) => void;
  onBuildAndTest: () => void;
  isBuilding: boolean;
}

export const MetricsCompleter: React.FC<MetricsCompleterProps> = ({
  settings,
  glyphs,
  onUpdateSettings,
  onBuildAndTest,
  isBuilding,
}) => {
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Compute coverage statistics
  const charSet = new Set(glyphs.map((g) => g.char));
  let upperCount = 0;
  for (let i = 65; i <= 90; i++) {
    if (charSet.has(String.fromCharCode(i))) upperCount++;
  }
  let digitCount = 0;
  for (let i = 48; i <= 57; i++) {
    if (charSet.has(String.fromCharCode(i))) digitCount++;
  }
  let lowerCount = 0;
  for (let i = 97; i <= 122; i++) {
    if (charSet.has(String.fromCharCode(i))) lowerCount++;
  }

  const handleFetchAiAdvice = async () => {
    try {
      setLoadingAdvice(true);
      const res = await fetch("/api/ai/font-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableCharacters: Array.from(charSet),
          fontName: settings.name,
          fontStyle: settings.styleName,
        }),
      });
      const data = await res.json();
      setAiAdvice(data);
    } catch (err) {
      console.error("Failed to get font advice:", err);
    } finally {
      setLoadingAdvice(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Overview Card */}
      <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-2xl p-6 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Standard Font Specification Matching</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-100">
            Make Your Font Match Standard Font Files
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Standard fonts require essential character mappings, baseline metrics, ascender/descender limits, space widths, and character fallbacks.
            Configure how missing lowercase or punctuation is automatically synthesized to ensure your font works smoothly across all apps.
          </p>
        </div>

        {/* Character Coverage Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-700/60">
          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-750">
            <span className="text-xs text-neutral-400 font-medium block">Uppercase A-Z</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-neutral-100">{upperCount}/26</span>
              {upperCount >= 20 ? (
                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                  Complete
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                  Partial
                </span>
              )}
            </div>
          </div>

          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-750">
            <span className="text-xs text-neutral-400 font-medium block">Numbers 0-9</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-neutral-100">{digitCount}/10</span>
              {digitCount >= 8 ? (
                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                  Complete
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                  Partial
                </span>
              )}
            </div>
          </div>

          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-750">
            <span className="text-xs text-neutral-400 font-medium block">Lowercase a-z</span>
            <div className="flex items-center gap-2 mt-1">
              {lowerCount > 0 ? (
                <span className="text-xl font-bold text-neutral-100">{lowerCount}/26</span>
              ) : settings.autoSynthesizeLowercase ? (
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                  Auto-Synthesized (26)
                </span>
              ) : (
                <span className="text-xs text-neutral-500">None</span>
              )}
            </div>
          </div>

          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-750">
            <span className="text-xs text-neutral-400 font-medium block">Standard Space</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-emerald-400">Included</span>
              <span className="text-[10px] font-mono text-neutral-400">{settings.spaceWidth} units</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Font Synthesis Options & Metadata (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Automatic Synthesis Toggles */}
          <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Missing Character Synthesis</span>
            </h3>

            {/* Auto Synthesize Lowercase */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-neutral-900/70 border border-neutral-750">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-neutral-200 block">
                  Auto-synthesize lowercase a-z
                </span>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  If your image only contained capital letters A-Z, this creates harmonized small-caps lowercase glyphs so typing normal mixed-case text doesn't display empty rectangles.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  id="toggle-synthesize-lowercase"
                  type="checkbox"
                  checked={settings.autoSynthesizeLowercase}
                  onChange={(e) =>
                    onUpdateSettings({ autoSynthesizeLowercase: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Auto Synthesize Punctuation */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-neutral-900/70 border border-neutral-750">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-neutral-200 block">
                  Synthesize missing essential punctuation
                </span>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Adds clean matching period (.), comma (,), and hyphen (-) if they were not drawn on your sheet.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  id="toggle-synthesize-punctuation"
                  type="checkbox"
                  checked={settings.autoSynthesizePunctuation}
                  onChange={(e) =>
                    onUpdateSettings({ autoSynthesizePunctuation: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Font Identification / Naming */}
          <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-400" />
              <span>Font File Metadata</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  Font Family Name
                </label>
                <input
                  id="input-font-name"
                  type="text"
                  value={settings.name}
                  onChange={(e) =>
                    onUpdateSettings({ name: e.target.value, family: e.target.value })
                  }
                  placeholder="e.g. My Handwritten Script"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  Style / Subfamily
                </label>
                <input
                  id="input-font-style"
                  type="text"
                  value={settings.styleName}
                  onChange={(e) => onUpdateSettings({ styleName: e.target.value })}
                  placeholder="Regular"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Typography Metrics Sliders & AI Advice (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Metrics Sliders */}
          <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Typographic Dimensions & Spacing</span>
            </h3>

            {/* Space Character Width */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-medium">Spacebar Width</span>
                <span className="font-mono text-amber-400">{settings.spaceWidth} units</span>
              </div>
              <input
                id="slider-space-width"
                type="range"
                min="180"
                max="600"
                step="10"
                value={settings.spaceWidth}
                onChange={(e) =>
                  onUpdateSettings({ spaceWidth: parseInt(e.target.value, 10) })
                }
                className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400">
                Width of the blank space when pressing spacebar in your font.
              </p>
            </div>

            {/* Letter Spacing / Side Bearings */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-medium">Side Bearings / Spacing</span>
                <span className="font-mono text-amber-400">{settings.letterSpacing} units</span>
              </div>
              <input
                id="slider-letter-spacing"
                type="range"
                min="10"
                max="120"
                step="5"
                value={settings.letterSpacing}
                onChange={(e) =>
                  onUpdateSettings({ letterSpacing: parseInt(e.target.value, 10) })
                }
                className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400">
                Natural breathing margin around each character.
              </p>
            </div>

            {/* Ascender / Descender */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  Ascender Height
                </label>
                <input
                  type="number"
                  value={settings.ascender}
                  onChange={(e) =>
                    onUpdateSettings({ ascender: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  Descender Depth
                </label>
                <input
                  type="number"
                  value={settings.descender}
                  onChange={(e) =>
                    onUpdateSettings({ descender: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-200"
                />
              </div>
            </div>
          </div>

          {/* AI Typography Advice Button & Box */}
          <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  AI Typographer Analysis
                </h4>
              </div>
              <button
                id="btn-fetch-ai-advice"
                onClick={handleFetchAiAdvice}
                disabled={loadingAdvice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 hover:bg-neutral-750 text-amber-400 border border-neutral-700 transition"
              >
                {loadingAdvice ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>{loadingAdvice ? "Consulting AI..." : "Get Font Advice"}</span>
              </button>
            </div>

            {aiAdvice ? (
              <div className="space-y-3 text-xs bg-neutral-900/80 p-4 rounded-xl border border-neutral-750">
                <div>
                  <span className="font-semibold text-neutral-200 block">
                    Harmonizing Lowercase:
                  </span>
                  <p className="text-neutral-400 mt-0.5">{aiAdvice.lowercaseDerivationTip}</p>
                </div>
                <div>
                  <span className="font-semibold text-neutral-200 block">
                    Recommended Tracking:
                  </span>
                  <p className="text-neutral-400 mt-0.5">{aiAdvice.recommendedTracking}</p>
                </div>
                {aiAdvice.samplePangrams && (
                  <div>
                    <span className="font-semibold text-neutral-200 block">
                      Recommended Test Phrase:
                    </span>
                    <p className="text-amber-300 font-serif italic mt-0.5">
                      "{aiAdvice.samplePangrams[0]}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">
                Click above to have Gemini review your character shapes and suggest ideal spacing and custom sample pangrams.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Button: Build & Test Font */}
      <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-neutral-400 block">Step 3 Complete</span>
          <span className="text-base font-semibold text-neutral-100">
            Ready to compile your TrueType font binary and launch the live typing playground.
          </span>
        </div>
        <button
          id="btn-compile-and-test"
          onClick={onBuildAndTest}
          disabled={isBuilding}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-xl shadow-amber-500/25 transition disabled:opacity-50"
        >
          {isBuilding ? (
            <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isBuilding ? "Compiling TrueType Font..." : "Build Font & Open Live Tester"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
