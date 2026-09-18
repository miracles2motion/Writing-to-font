import React, { useState, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Wand2,
  FileText,
  HelpCircle,
  Cpu,
  Zap,
  ListOrdered,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Key,
} from "lucide-react";
import { DetectedGlyph, AlphabetHarvestResult } from "../types";
import { SEQUENCE_PATTERNS, performNormalHarvest, getCharacterCasing } from "../utils/glyphUtils";

interface AlphabetHarvesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  glyphs: DetectedGlyph[];
  sourceImageUrl: string | null;
  harvestResult: AlphabetHarvestResult | null;
  isLoading: boolean;
  onApplyHarvest: (resolvedResult: AlphabetHarvestResult, mode: "replace" | "keep-all") => void;
  onRunAiHarvest?: () => void;
  onOpenExpanderModal?: () => void;
  onUpdateFontName?: (name: string) => void;
  onOpenApiKeyModal?: () => void;
}

export const AlphabetHarvesterModal: React.FC<AlphabetHarvesterModalProps> = ({
  isOpen,
  onClose,
  glyphs,
  sourceImageUrl,
  harvestResult,
  isLoading,
  onApplyHarvest,
  onRunAiHarvest,
  onOpenExpanderModal,
  onUpdateFontName,
  onOpenApiKeyModal,
}) => {
  // Mode Selection: "normal" (Offline Local Spatial Sort) vs "ai" (Gemini Multimodal OCR)
  const [harvestMode, setHarvestMode] = useState<"normal" | "ai">("normal");
  const [selectedPattern, setSelectedPattern] = useState<string>("A-Z_a-z_0-9");
  const [activeCategoryTab, setActiveCategoryTab] = useState<"all" | "upper" | "lower" | "digits" | "symbols">("all");
  const [applyMode, setApplyMode] = useState<"replace" | "keep-all">("replace");

  // Normal Mode Result (computed dynamically in-browser in real time)
  const normalHarvestResult = useMemo(() => {
    return performNormalHarvest(glyphs, selectedPattern);
  }, [glyphs, selectedPattern]);

  if (!isOpen) return null;

  // Select active result depending on current mode
  const activeResult = harvestMode === "ai" && harvestResult ? harvestResult : normalHarvestResult;

  const resolved = activeResult?.resolvedCharacters || [];
  const missing = activeResult?.missingStandardCharacters || [];

  const upperList = resolved.filter((r) => r.casing === "upper");
  const lowerList = resolved.filter((r) => r.casing === "lower");
  const digitList = resolved.filter((r) => r.casing === "digit");
  const symbolList = resolved.filter((r) => r.casing === "symbol");

  const filteredResolved = resolved.filter((r) => {
    if (activeCategoryTab === "upper") return r.casing === "upper";
    if (activeCategoryTab === "lower") return r.casing === "lower";
    if (activeCategoryTab === "digits") return r.casing === "digit";
    if (activeCategoryTab === "symbols") return r.casing === "symbol";
    return true;
  });

  const duplicatesDiscarded = Math.max(0, glyphs.length - resolved.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2">
                <span>Alphabet Harvester</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  {harvestMode === "normal" ? "⚡ Normal (Instant Local)" : "✨ AI Vision Mode"}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Single out unique A-Z, a-z, 0-9 &amp; symbols from your handwriting.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Mode Selector Bar: Normal (Offline Local) vs AI Vision Mode */}
        <div className="px-6 py-3 border-b border-neutral-800 bg-neutral-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-2xl border border-neutral-750">
            <button
              type="button"
              onClick={() => setHarvestMode("normal")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                harvestMode === "normal"
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Normal Mode (Instant Local)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${harvestMode === "normal" ? "bg-neutral-950/20 text-neutral-950" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                Offline 0s
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setHarvestMode("ai");
                if (!harvestResult && !isLoading && onRunAiHarvest) {
                  onRunAiHarvest();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                harvestMode === "ai"
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Vision Mode (Gemini)</span>
              {harvestResult && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Mode Context Controls */}
          {harvestMode === "normal" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 hidden sm:inline">Sequence Preset:</span>
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                className="bg-neutral-850 border border-neutral-700 text-neutral-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400"
              >
                {SEQUENCE_PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRunAiHarvest}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                <span>{isLoading ? "Scanning..." : "Re-Scan with AI"}</span>
              </button>
              {onOpenApiKeyModal && (
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
                  title="Configure Gemini API Key"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Key Settings</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && harvestMode === "ai" ? (
            <div className="text-center py-16 space-y-5 max-w-md mx-auto animate-in fade-in">
              <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-amber-500/10" />
              <div className="space-y-2">
                <h3 className="text-base font-bold text-neutral-200">
                  Scanning Handwritten Document with Vision AI...
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Pinpointing character coordinates, verifying upper/lower cases, and selecting highest-clarity exemplars.
                </p>
                <div className="p-3 bg-neutral-800/60 border border-neutral-700/60 rounded-xl text-xs text-neutral-300">
                  💡 <strong>Want results immediately?</strong> Switch to <strong>Normal Mode</strong> above for 100% in-browser offline extraction with zero waiting!
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHarvestMode("normal")}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
              >
                Switch to Normal Instant Extraction
              </button>
            </div>
          ) : harvestMode === "ai" && !harvestResult ? (
            <div className="text-center py-16 space-y-4 max-w-md mx-auto animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-neutral-200">
                  Ready to Analyze Document with AI
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Gemini Vision OCR will scan full sentences, extract individual characters from words, and select the cleanest instances.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onRunAiHarvest}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  ✨ Run AI Document Scan
                </button>
                <button
                  type="button"
                  onClick={() => setHarvestMode("normal")}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition"
                >
                  ⚡ Use Normal Mode Instead
                </button>
              </div>
            </div>
          ) : activeResult ? (
            <>
              {/* Executive Summary Banner */}
              <div className="bg-neutral-850 border border-neutral-700/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      {harvestMode === "normal" ? "Normal Mode In-Browser Extraction" : "AI Vision Handwriting Classification"}
                    </span>
                    <h3 className="text-base font-bold text-neutral-100">
                      {activeResult.handwritingStyle || "Natural Handwritten Script"}
                    </h3>
                  </div>

                  {activeResult.suggestedFontName && (
                    <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-700">
                      <span className="text-xs text-neutral-400">Suggested Name:</span>
                      <span className="text-xs font-bold text-neutral-100 font-mono">
                        {activeResult.suggestedFontName}
                      </span>
                      {onUpdateFontName && (
                        <button
                          onClick={() => onUpdateFontName(activeResult.suggestedFontName!)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-1"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  {activeResult.summary}
                </p>

                {/* Stat pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-800 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                    ✓ {resolved.length} Unique Characters Singled Out
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                    🔠 {upperList.length} Uppercase [A-Z]
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                    🔡 {lowerList.length} Lowercase [a-z]
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                    🔢 {digitList.length} Digits [0-9]
                  </span>
                  {duplicatesDiscarded > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-400 border border-neutral-700">
                      🗑️ {duplicatesDiscarded} Stray Instances Filtered
                    </span>
                  )}
                </div>
              </div>

              {/* Missing Characters Alert (if any) */}
              {missing.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>{missing.length} Standard Characters Missing from Extraction</span>
                    </div>
                    <p className="text-xs text-neutral-300">
                      Not found in the image:{" "}
                      <span className="font-mono text-amber-200 font-bold">
                        {missing.slice(0, 16).join(" ")}
                        {missing.length > 16 ? ` +${missing.length - 16} more` : ""}
                      </span>
                    </p>
                  </div>

                  {onOpenExpanderModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenExpanderModal();
                      }}
                      className="whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition active:scale-95 shadow"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Synthesize Missing ({missing.length})</span>
                    </button>
                  )}
                </div>
              )}

              {/* Tabs for Category Breakdown */}
              <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveCategoryTab("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryTab === "all"
                      ? "bg-amber-500 text-neutral-950 font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  All Singled Out ({resolved.length})
                </button>
                <button
                  onClick={() => setActiveCategoryTab("upper")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryTab === "upper"
                      ? "bg-blue-500 text-white font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  Uppercase [A-Z] ({upperList.length})
                </button>
                <button
                  onClick={() => setActiveCategoryTab("lower")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryTab === "lower"
                      ? "bg-amber-500 text-neutral-950 font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  Lowercase [a-z] ({lowerList.length})
                </button>
                <button
                  onClick={() => setActiveCategoryTab("digits")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryTab === "digits"
                      ? "bg-indigo-500 text-white font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  Digits [0-9] ({digitList.length})
                </button>
                <button
                  onClick={() => setActiveCategoryTab("symbols")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryTab === "symbols"
                      ? "bg-neutral-700 text-neutral-100 font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  Symbols ({symbolList.length})
                </button>
              </div>

              {/* Resolved Characters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredResolved.map((item, idx) => {
                  const targetGlyph =
                    glyphs.find((g) => g.id === item.glyphId) ||
                    (item.glyphIndex !== undefined ? glyphs[item.glyphIndex] : undefined);

                  return (
                    <div
                      key={`${item.char}-${idx}`}
                      className="bg-neutral-850/90 border border-neutral-750 rounded-2xl p-3 flex flex-col justify-between space-y-2 hover:border-amber-500/40 transition group shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center font-mono text-base font-bold text-amber-400 shadow-inner">
                          {item.char}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            item.casing === "upper"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : item.casing === "lower"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : item.casing === "digit"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-neutral-700 text-neutral-300"
                          }`}
                        >
                          {item.casing}
                        </span>
                      </div>

                      {/* Image Preview */}
                      <div className="h-16 bg-neutral-950 rounded-xl flex items-center justify-center p-1.5 overflow-hidden border border-neutral-800">
                        {item.colorCroppedDataUrl || item.croppedDataUrl || targetGlyph?.colorCanvasDataUrl || targetGlyph?.canvasDataUrl ? (
                          <img
                            src={item.colorCroppedDataUrl || item.croppedDataUrl || targetGlyph?.colorCanvasDataUrl || targetGlyph?.canvasDataUrl}
                            alt={item.char}
                            className="max-h-full max-w-full object-contain filter invert"
                          />
                        ) : (
                          <span className="font-mono text-xs text-neutral-500 font-bold">{item.char}</span>
                        )}
                      </div>

                      {/* Provenance note */}
                      <div className="text-[11px] text-neutral-400 truncate" title={item.notes || item.sourceWord}>
                        {item.sourceWord ? (
                          <span className="text-neutral-300">
                            {item.sourceWord}
                          </span>
                        ) : (
                          <span>Quality: {Math.round((item.qualityScore || 0.95) * 100)}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/90 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="radio"
                name="applyMode"
                checked={applyMode === "replace"}
                onChange={() => setApplyMode("replace")}
                className="text-amber-500 focus:ring-amber-500"
              />
              <span>Replace glyphs with curated set</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
              <input
                type="radio"
                name="applyMode"
                checked={applyMode === "keep-all"}
                onChange={() => setApplyMode("keep-all")}
                className="text-amber-500 focus:ring-amber-500"
              />
              <span>Keep all as alternates</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              id="btn-apply-curated-harvest"
              onClick={() => {
                if (activeResult) {
                  onApplyHarvest(activeResult, applyMode);
                  onClose();
                }
              }}
              disabled={!activeResult || resolved.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Apply Harvest ({resolved.length} Glyphs)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
