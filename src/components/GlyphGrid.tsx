import React, { useState } from "react";
import {
  Sparkles,
  ArrowUpDown,
  Merge,
  Trash2,
  Plus,
  ArrowRight,
  HelpCircle,
  Filter,
  CheckSquare,
  Square,
  Edit2,
  Check,
} from "lucide-react";
import { DetectedGlyph } from "../types";

interface GlyphGridProps {
  glyphs: DetectedGlyph[];
  onUpdateGlyphChar: (glyphId: string, newChar: string) => void;
  onDeleteGlyph: (glyphId: string) => void;
  onMergeGlyphs: (glyphIds: string[]) => void;
  onAddCustomGlyph: (char: string, dataUrl: string, bbox: { width: number; height: number }) => void;
  onAutoSequence: (pattern: "A-Z_0-9" | "0-9_A-Z" | "a-z") => void;
  onAiAutoLabel: () => void;
  onProceedToMetrics: () => void;
  isAiLabeling: boolean;
}

export const GlyphGrid: React.FC<GlyphGridProps> = ({
  glyphs,
  onUpdateGlyphChar,
  onDeleteGlyph,
  onMergeGlyphs,
  onAddCustomGlyph,
  onAutoSequence,
  onAiAutoLabel,
  onProceedToMetrics,
  isAiLabeling,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "letters" | "numbers" | "symbols">("all");
  const [editingGlyphId, setEditingGlyphId] = useState<string | null>(null);
  const [customCharModalOpen, setCustomCharModalOpen] = useState(false);
  const [newCharInput, setNewCharInput] = useState("");

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

  // Filtered glyph list
  const filteredGlyphs = glyphs.filter((g) => {
    if (activeFilter === "letters") {
      return (g.char >= "A" && g.char <= "Z") || (g.char >= "a" && g.char <= "z");
    }
    if (activeFilter === "numbers") {
      return g.char >= "0" && g.char <= "9";
    }
    if (activeFilter === "symbols") {
      const isLetter = (g.char >= "A" && g.char <= "Z") || (g.char >= "a" && g.char <= "z");
      const isNum = g.char >= "0" && g.char <= "9";
      return !isLetter && !isNum;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top action & batch bar */}
      <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <span>Isolated Glyphs & Character Mapping</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                {glyphs.length} Total
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Verify the assigned character for each isolated drawing. Click any character tag to change it, or use AI auto-label.
            </p>
          </div>

          {/* AI Recognition & Sequence Buttons */}
          <div className="flex flex-wrap items-center gap-2">
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
              <span>{isAiLabeling ? "AI Scanning Handwriting..." : "AI Auto-Label with Gemini"}</span>
            </button>

            <div className="flex items-center bg-neutral-900 border border-neutral-700/80 rounded-xl p-0.5 text-xs">
              <button
                id="btn-auto-sequence-az"
                onClick={() => onAutoSequence("A-Z_0-9")}
                title="Map sequentially: A-Z then 0-9 & symbols"
                className="px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition font-medium"
              >
                Seq: A-Z, 0-9
              </button>
              <button
                id="btn-auto-sequence-09"
                onClick={() => onAutoSequence("0-9_A-Z")}
                title="Map sequentially: 0-9 then A-Z"
                className="px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition font-medium"
              >
                Seq: 0-9, A-Z
              </button>
            </div>
          </div>
        </div>

        {/* Secondary control strip: Filters & Batch operations */}
        <div className="pt-3 border-t border-neutral-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filters */}
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
              onClick={() => setActiveFilter("letters")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === "letters"
                  ? "bg-amber-500 text-neutral-950 font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Letters
            </button>
            <button
              onClick={() => setActiveFilter("numbers")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === "numbers"
                  ? "bg-amber-500 text-neutral-950 font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Numbers
            </button>
            <button
              onClick={() => setActiveFilter("symbols")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === "symbols"
                  ? "bg-amber-500 text-neutral-950 font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Symbols
            </button>
          </div>

          {/* Batch Merge / Delete */}
          <div className="flex items-center gap-2">
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

      {/* Glyphs Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filteredGlyphs.map((glyph) => {
          const isSelected = selectedIds.has(glyph.id);
          const isEditing = editingGlyphId === glyph.id;

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

              {/* Delete single button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGlyph(glyph.id);
                }}
                title="Remove glyph"
                className="absolute top-2 right-2 p-1 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition z-10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Glyph Image Cutout on subtle checkerboard */}
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center mb-3 mt-4 border border-neutral-750 overflow-hidden"
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
                {glyph.canvasDataUrl ? (
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
              </div>

              {/* Character Mapping Badge / Editable Input */}
              <div className="w-full">
                {isEditing ? (
                  <div className="flex items-center justify-center gap-1">
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
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingGlyphId(glyph.id)}
                    className="group/btn inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-amber-400/60 hover:bg-neutral-750 transition"
                    title="Click to edit character"
                  >
                    <span className="font-mono font-bold text-sm text-neutral-100 group-hover/btn:text-amber-300">
                      {glyph.char}
                    </span>
                    <Edit2 className="w-3 h-3 text-neutral-500 group-hover/btn:text-amber-400 opacity-60 group-hover/btn:opacity-100" />
                  </button>
                )}

                {/* Unicode and dimensions footer */}
                <div className="mt-2 text-[10px] text-neutral-500 font-mono">
                  U+{glyph.char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")} • {glyph.bbox.width}x{glyph.bbox.height}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA to next step */}
      <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-neutral-400 block">Step 2 Complete</span>
          <span className="text-sm font-semibold text-neutral-200">
            {glyphs.length} characters tagged. Next: configure font standards & missing lowercase.
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
    </div>
  );
};
