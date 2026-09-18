import React, { useState } from "react";
import {
  Sparkles,
  ArrowUpDown,
  Merge,
  Trash2,
  Plus,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  Edit2,
  Check,
  Scissors,
  Split,
  Maximize2,
  ListOrdered,
  ChevronDown,
} from "lucide-react";
import { DetectedGlyph } from "../types";
import { GlyphCropModal } from "./GlyphCropModal";
import {
  getCharacterCasing,
  SEQUENCE_PATTERNS,
  toggleCharacterCase,
} from "../utils/glyphUtils";

interface GlyphGridProps {
  glyphs: DetectedGlyph[];
  cleanedCanvas: HTMLCanvasElement | null;
  colorCanvas: HTMLCanvasElement | null;
  sourceCanvas: HTMLCanvasElement | HTMLImageElement | null;
  binaryMask: Uint8Array | null;
  maskWidth: number;
  maskHeight: number;
  smoothing: number;
  onUpdateGlyphChar: (glyphId: string, newChar: string) => void;
  onDeleteGlyph: (glyphId: string) => void;
  onMergeGlyphs: (glyphIds: string[]) => void;
  onSaveGlyph: (updated: DetectedGlyph) => void;
  onSplitGlyph: (originalId: string, leftGlyph: DetectedGlyph, rightGlyph: DetectedGlyph) => void;
  onBatchCaseConvert: (glyphIds: string[], targetCase: "lower" | "upper") => void;
  onAutoSequence: (patternId: string) => void;
  onAiAutoLabel: () => void;
  onProceedToMetrics: () => void;
  isAiLabeling: boolean;
}

export const GlyphGrid: React.FC<GlyphGridProps> = ({
  glyphs,
  cleanedCanvas,
  colorCanvas,
  sourceCanvas,
  binaryMask,
  maskWidth,
  maskHeight,
  smoothing,
  onUpdateGlyphChar,
  onDeleteGlyph,
  onMergeGlyphs,
  onSaveGlyph,
  onSplitGlyph,
  onBatchCaseConvert,
  onAutoSequence,
  onAiAutoLabel,
  onProceedToMetrics,
  isAiLabeling,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<
    "all" | "upper" | "lower" | "numbers" | "symbols"
  >("all");
  const [editingGlyphId, setEditingGlyphId] = useState<string | null>(null);
  const [glyphViewMode, setGlyphViewMode] = useState<"color" | "mono">("color");

  // Manual Crop & Cutout Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropGlyphIndex, setCropGlyphIndex] = useState<number>(0);

  // Sequence dropdown toggle
  const [sequenceMenuOpen, setSequenceMenuOpen] = useState(false);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === glyphs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(glyphs.map((g) => g.id)));
    }
  };

  const handleMergeSelected = () => {
    if (selectedIds.size >= 2) {
      onMergeGlyphs(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => onDeleteGlyph(id));
    setSelectedIds(new Set());
  };

  // Open crop modal for specific glyph
  const openCropModalForGlyph = (index: number) => {
    if (index >= 0 && index < glyphs.length) {
      setCropGlyphIndex(index);
      setCropModalOpen(true);
    }
  };

  // Filtered glyph list with casing differentiation
  const filteredGlyphs = glyphs.filter((g) => {
    const casing = getCharacterCasing(g.char);
    if (activeFilter === "upper") return casing === "upper";
    if (activeFilter === "lower") return casing === "lower";
    if (activeFilter === "numbers") return casing === "digit";
    if (activeFilter === "symbols") return casing === "symbol";
    return true;
  });

  const upperCount = glyphs.filter((g) => getCharacterCasing(g.char) === "upper").length;
  const lowerCount = glyphs.filter((g) => getCharacterCasing(g.char) === "lower").length;
  const digitCount = glyphs.filter((g) => getCharacterCasing(g.char) === "digit").length;

  const currentCropGlyph = glyphs[cropGlyphIndex] || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
      {/* Top action & batch bar */}
      <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-100 flex flex-wrap items-center gap-2">
              <span>Isolated Glyphs & Character Mapping</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                {glyphs.length} Total
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                {upperCount} Upper [A-Z]
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                {lowerCount} Lower [a-z]
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                {digitCount} Digits [0-9]
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Review isolated characters. Click <strong>Edit Crop</strong> on any glyph to trim neighbor characters that slipped in or split fused letters.
            </p>
          </div>

          {/* Top Actions: AI Auto-Label, Review All Cutouts & Sequencing */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Step-by-Step Cutout Review */}
            <button
              id="btn-review-cutouts-step-by-step"
              onClick={() => openCropModalForGlyph(0)}
              disabled={glyphs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 transition active:scale-95 disabled:opacity-50"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Review Cutouts Manually</span>
            </button>

            {/* AI Auto-Label Button */}
            <button
              id="btn-ai-auto-label"
              onClick={onAiAutoLabel}
              disabled={isAiLabeling || glyphs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-neutral-950 shadow-md shadow-amber-500/10 disabled:opacity-50 transition"
            >
              {isAiLabeling ? (
                <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isAiLabeling ? "AI Differentiating Upper & Lower..." : "AI Auto-Label with Gemini"}</span>
            </button>

            {/* Sequence Patterns Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSequenceMenuOpen(!sequenceMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 border border-neutral-700 text-neutral-200 hover:bg-neutral-800 transition"
              >
                <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Sequence</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {sequenceMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                    Apply Sequence Preset
                  </div>
                  {SEQUENCE_PATTERNS.map((pattern) => (
                    <button
                      key={pattern.id}
                      onClick={() => {
                        onAutoSequence(pattern.id);
                        setSequenceMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-neutral-800 text-xs text-neutral-200 hover:text-amber-300 transition flex flex-col"
                    >
                      <span className="font-semibold">{pattern.name}</span>
                      <span className="text-[10px] text-neutral-500">{pattern.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary control strip: Filters, Color Toggle & Batch operations */}
        <div className="pt-3 border-t border-neutral-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filters with Casing Tabs */}
            <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-750">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  activeFilter === "all"
                    ? "bg-amber-500 text-neutral-950 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                All ({glyphs.length})
              </button>
              <button
                onClick={() => setActiveFilter("upper")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeFilter === "upper"
                    ? "bg-blue-500 text-neutral-950 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Uppercase ({upperCount})
              </button>
              <button
                onClick={() => setActiveFilter("lower")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeFilter === "lower"
                    ? "bg-amber-500 text-neutral-950 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Lowercase ({lowerCount})
              </button>
              <button
                onClick={() => setActiveFilter("numbers")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeFilter === "numbers"
                    ? "bg-emerald-500 text-neutral-950 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Digits ({digitCount})
              </button>
              <button
                onClick={() => setActiveFilter("symbols")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeFilter === "symbols"
                    ? "bg-neutral-700 text-neutral-100 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Symbols
              </button>
            </div>

            {/* Cultural Color vs Monochrome View Mode Toggle */}
            <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-750">
              <button
                id="btn-glyph-view-color"
                onClick={() => setGlyphViewMode("color")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  glyphViewMode === "color"
                    ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Cultural Colors
              </button>
              <button
                id="btn-glyph-view-mono"
                onClick={() => setGlyphViewMode("mono")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  glyphViewMode === "mono"
                    ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Monochrome
              </button>
            </div>
          </div>

          {/* Batch operations */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-750 text-neutral-300 transition"
            >
              {selectedIds.size === glyphs.length && glyphs.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span>Select All</span>
            </button>

            {/* Batch Case Conversion */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-xl border border-neutral-750">
                <button
                  onClick={() => onBatchCaseConvert(Array.from(selectedIds), "lower")}
                  title="Convert selected characters to lowercase"
                  className="px-2 py-1 rounded-lg text-amber-400 hover:bg-neutral-800 text-[11px] font-semibold transition"
                >
                  To Lower (a-z)
                </button>
                <button
                  onClick={() => onBatchCaseConvert(Array.from(selectedIds), "upper")}
                  title="Convert selected characters to uppercase"
                  className="px-2 py-1 rounded-lg text-blue-400 hover:bg-neutral-800 text-[11px] font-semibold transition"
                >
                  To Upper (A-Z)
                </button>
              </div>
            )}

            {selectedIds.size >= 2 && (
              <button
                onClick={handleMergeSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white font-medium transition active:scale-95 shadow"
              >
                <Merge className="w-3.5 h-3.5" />
                <span>Merge Selected ({selectedIds.size})</span>
              </button>
            )}

            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-medium transition active:scale-95 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Glyphs Card Grid or Empty State */}
      {filteredGlyphs.length === 0 ? (
        <div className="bg-neutral-800/30 border border-neutral-700/60 rounded-2xl p-12 text-center space-y-3">
          <p className="text-base font-semibold text-neutral-200">
            {glyphs.length === 0 ? "No Character Glyphs Isolated Yet" : "No Glyphs Match Active Filter"}
          </p>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {glyphs.length === 0
              ? "Upload an image in Step 1 (Upload & Cutout) to isolate your drawn characters and review them here."
              : "Try clicking 'All' in the filter bar above to see all isolated characters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filteredGlyphs.map((glyph) => {
          const isSelected = selectedIds.has(glyph.id);
          const isEditing = editingGlyphId === glyph.id;
          const casing = getCharacterCasing(glyph.char);
          const originalIndex = glyphs.findIndex((g) => g.id === glyph.id);

          return (
            <div
              key={glyph.id}
              className={`group relative rounded-2xl border transition-all duration-150 overflow-hidden flex flex-col items-center p-3 text-center ${
                isSelected
                  ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-[1.02]"
                  : "border-neutral-800 bg-neutral-850 hover:border-neutral-650 hover:bg-neutral-800/80"
              }`}
            >
              {/* Checkbox selector */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(glyph.id);
                }}
                className="absolute top-2 left-2 p-1 text-neutral-400 hover:text-neutral-100 transition z-10"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400" />
                )}
              </button>

              {/* Top Right: Edit Crop / Delete Buttons */}
              <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCropModalForGlyph(originalIndex);
                  }}
                  title="Edit Crop / Cutout & Trim Edges"
                  className="p-1 rounded bg-neutral-800/90 text-neutral-300 hover:text-amber-400 hover:bg-neutral-700 transition"
                >
                  <Scissors className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteGlyph(glyph.id);
                  }}
                  title="Remove glyph"
                  className="p-1 rounded bg-neutral-800/90 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Glyph Image Cutout on checkerboard */}
              <div
                onClick={() => openCropModalForGlyph(originalIndex)}
                className="w-20 h-20 rounded-xl flex items-center justify-center mb-2 mt-4 border border-neutral-750 overflow-hidden cursor-pointer hover:border-amber-500/60 transition group/img relative"
                title="Click to edit crop or trim cutout"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #18181f 25%, transparent 25%),
                    linear-gradient(-45deg, #18181f 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #18181f 75%),
                    linear-gradient(-45deg, transparent 75%, #18181f 75%)
                  `,
                  backgroundSize: "10px 10px",
                  backgroundColor: "#0d0d12",
                }}
              >
                {glyphViewMode === "color" ? (
                  (glyph.colorCanvasDataUrl || glyph.canvasDataUrl) ? (
                    <img
                      src={glyph.colorCanvasDataUrl || glyph.canvasDataUrl}
                      alt={`Cultural glyph ${glyph.char}`}
                      className="max-h-16 max-w-16 object-contain drop-shadow"
                    />
                  ) : (
                    <span className="text-xl font-bold font-mono text-neutral-400">
                      {glyph.char}
                    </span>
                  )
                ) : glyph.canvasDataUrl ? (
                  <img
                    src={glyph.canvasDataUrl}
                    alt={`Glyph ${glyph.char}`}
                    className="max-h-16 max-w-16 object-contain filter invert contrast-125"
                  />
                ) : (
                  <span className="text-xl font-bold font-mono text-neutral-400">
                    {glyph.char}
                  </span>
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                  <Scissors className="w-4 h-4 text-amber-300" />
                </div>
              </div>

              {/* Character Mapping Badge, Casing Tag & Quick Toggle */}
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-center gap-1">
                  {isEditing ? (
                    <input
                      type="text"
                      maxLength={1}
                      autoFocus
                      defaultValue={glyph.char}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val) {
                          onUpdateGlyphChar(glyph.id, val);
                        }
                        setEditingGlyphId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) onUpdateGlyphChar(glyph.id, val);
                          setEditingGlyphId(null);
                        } else if (e.key === "Escape") {
                          setEditingGlyphId(null);
                        }
                      }}
                      className="w-10 h-8 text-center text-sm font-bold bg-amber-500 text-neutral-950 rounded-lg outline-none ring-2 ring-amber-400"
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingGlyphId(glyph.id)}
                        className="group/btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-amber-400/60 hover:bg-neutral-750 transition"
                        title="Click to edit character label"
                      >
                        <span className="font-mono font-bold text-sm text-neutral-100 group-hover/btn:text-amber-300">
                          {glyph.char}
                        </span>
                        <Edit2 className="w-2.5 h-2.5 text-neutral-500 group-hover/btn:text-amber-400 opacity-60 group-hover/btn:opacity-100" />
                      </button>

                      {/* Quick Case Toggle Button (a ⇄ A) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const toggled = toggleCharacterCase(glyph.char);
                          onUpdateGlyphChar(glyph.id, toggled);
                        }}
                        title={`Toggle casing: ${glyph.char} ⇄ ${toggleCharacterCase(glyph.char)}`}
                        className="p-1 rounded-lg bg-neutral-900 border border-neutral-750 hover:bg-neutral-750 text-neutral-400 hover:text-amber-300 transition"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>

                {/* Casing Badge & Dimensions footer */}
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono">
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold ${
                      casing === "upper"
                        ? "bg-blue-500/10 text-blue-400"
                        : casing === "lower"
                        ? "bg-amber-500/10 text-amber-400"
                        : casing === "digit"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {casing === "upper"
                      ? "CAP"
                      : casing === "lower"
                      ? "lower"
                      : casing === "digit"
                      ? "0-9"
                      : "SYM"}
                  </span>
                  <span className="text-neutral-500">
                    {glyph.bbox.width}x{glyph.bbox.height}
                  </span>
                </div>

                {/* Edit Cutout button */}
                <button
                  onClick={() => openCropModalForGlyph(originalIndex)}
                  className="w-full mt-1 py-1 rounded-lg text-[11px] font-medium bg-neutral-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-neutral-400 border border-neutral-750 transition flex items-center justify-center gap-1"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Edit Crop</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Bottom CTA to next step */}
      {glyphs.length > 0 && (
        <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-neutral-400 block">Step 2 Complete</span>
            <span className="text-sm font-semibold text-neutral-200">
              {glyphs.length} characters reviewed. Next: configure font standards & missing lowercase.
            </span>
          </div>
          <button
            id="btn-proceed-to-font-standards"
            onClick={onProceedToMetrics}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-lg shadow-amber-500/20 transition"
          >
            <span>Configure Font Standards</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Glyph Crop & Cutout Review Modal */}
      {cropModalOpen && currentCropGlyph && (
        <GlyphCropModal
          isOpen={cropModalOpen}
          glyph={currentCropGlyph}
          glyphIndex={cropGlyphIndex}
          totalGlyphs={glyphs.length}
          cleanedCanvas={cleanedCanvas}
          colorCanvas={colorCanvas}
          sourceCanvas={sourceCanvas}
          binaryMask={binaryMask}
          maskWidth={maskWidth}
          maskHeight={maskHeight}
          smoothing={smoothing}
          onSaveGlyph={onSaveGlyph}
          onSplitGlyph={onSplitGlyph}
          onNextGlyph={() => {
            if (cropGlyphIndex < glyphs.length - 1) {
              setCropGlyphIndex(cropGlyphIndex + 1);
            }
          }}
          onPrevGlyph={() => {
            if (cropGlyphIndex > 0) {
              setCropGlyphIndex(cropGlyphIndex - 1);
            }
          }}
          onClose={() => setCropModalOpen(false)}
        />
      )}
    </div>
  );
};
