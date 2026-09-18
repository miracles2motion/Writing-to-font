import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Wand2,
  FileText,
  HelpCircle,
} from "lucide-react";
import { DetectedGlyph, AlphabetHarvestResult } from "../types";

interface AlphabetHarvesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  glyphs: DetectedGlyph[];
  sourceImageUrl: string | null;
  harvestResult: AlphabetHarvestResult | null;
  isLoading: boolean;
  onApplyHarvest: (resolvedResult: AlphabetHarvestResult, mode: "replace" | "keep-all") => void;
  onOpenExpanderModal?: () => void;
  onUpdateFontName?: (name: string) => void;
}

export const AlphabetHarvesterModal: React.FC<AlphabetHarvesterModalProps> = ({
  isOpen,
  onClose,
  glyphs,
  harvestResult,
  isLoading,
  onApplyHarvest,
  onOpenExpanderModal,
  onUpdateFontName,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "upper" | "lower" | "digits" | "symbols">("all");
  const [applyMode, setApplyMode] = useState<"replace" | "keep-all">("replace");

  if (!isOpen) return null;

  const resolved = harvestResult?.resolvedCharacters || [];
  const missing = harvestResult?.missingStandardCharacters || [];

  const upperList = resolved.filter((r) => r.casing === "upper");
  const lowerList = resolved.filter((r) => r.casing === "lower");
  const digitList = resolved.filter((r) => r.casing === "digit");
  const symbolList = resolved.filter((r) => r.casing === "symbol");

  const filteredResolved = resolved.filter((r) => {
    if (activeTab === "upper") return r.casing === "upper";
    if (activeTab === "lower") return r.casing === "lower";
    if (activeTab === "digits") return r.casing === "digit";
    if (activeTab === "symbols") return r.casing === "symbol";
    return true;
  });

  const duplicatesDiscarded = Math.max(0, glyphs.length - resolved.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <span>One-Click Alphabet Harvester from Notes</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  AI Resolved
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Singles out unique A-Z, a-z, 0-9 & symbols from scattered handwriting and picks the highest quality exemplars.
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
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
                  💡 <strong>Prefer instant local extraction?</strong> You can cancel anytime to use 100% offline local extraction and sequential mapping with zero waiting.
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
              >
                Cancel & Return to Standard Extraction
              </button>
            </div>
          ) : harvestResult ? (
            <>
              {/* Executive Summary Banner */}
              <div className="bg-neutral-850 border border-neutral-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Handwriting Classification
                    </span>
                    <h3 className="text-base font-bold text-neutral-100">
                      {harvestResult.handwritingStyle || "Handwritten Script"}
                    </h3>
                  </div>

                  {harvestResult.suggestedFontName && (
                    <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-700">
                      <span className="text-xs text-neutral-400">Suggested Name:</span>
                      <span className="text-xs font-bold text-neutral-100 font-mono">
                        {harvestResult.suggestedFontName}
                      </span>
                      {onUpdateFontName && (
                        <button
                          onClick={() => onUpdateFontName(harvestResult.suggestedFontName!)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-1"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  {harvestResult.summary}
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
                      🗑️ {duplicatesDiscarded} Duplicate/Stray Instances Filtered
                    </span>
                  )}
                </div>
              </div>

              {/* Missing Characters Alert (if any) */}
              {missing.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>{missing.length} Standard Characters Missing from Notes</span>
                    </div>
                    <p className="text-xs text-neutral-300">
                      Not found in the written text:{" "}
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
                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition active:scale-95 shadow"
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
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "all"
                      ? "bg-amber-500 text-neutral-950 font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  All Singled Out ({resolved.length})
                </button>
                <button
                  onClick={() => setActiveTab("upper")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "upper"
                      ? "bg-blue-500 text-white font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  Uppercase [A-Z] ({upperList.length})
                </button>
                <button
                  onClick={() => setActiveTab("lower")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "lower"
                      ? "bg-amber-500 text-neutral-950 font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  Lowercase [a-z] ({lowerList.length})
                </button>
                <button
                  onClick={() => setActiveTab("digits")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "digits"
                      ? "bg-indigo-500 text-white font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  Digits [0-9] ({digitList.length})
                </button>
                <button
                  onClick={() => setActiveTab("symbols")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "symbols"
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
                      className="bg-neutral-800/80 border border-neutral-700 rounded-2xl p-3 flex flex-col justify-between space-y-2 hover:border-amber-500/40 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-mono text-base font-bold text-amber-400 shadow-inner">
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
                            Word: <span className="text-amber-300 font-medium">"{item.sourceWord}"</span>
                          </span>
                        ) : (
                          <span>Quality: {Math.round((item.qualityScore || 0.9) * 100)}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-neutral-400">
              <FileText className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
              <p>No document analysis results yet.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/90 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="radio"
                name="applyMode"
                checked={applyMode === "replace"}
                onChange={() => setApplyMode("replace")}
                className="text-amber-500 focus:ring-amber-500"
              />
              <span>Replace scattered glyphs with clean curated alphabet</span>
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
                if (harvestResult) {
                  onApplyHarvest(harvestResult, applyMode);
                  onClose();
                }
              }}
              disabled={!harvestResult || resolved.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Curated Alphabet (1-Click Resolution)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
