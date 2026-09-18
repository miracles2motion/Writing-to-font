import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { DetectedGlyph } from "../types";
import {
  STANDARD_UPPERCASE,
  STANDARD_LOWERCASE,
  STANDARD_DIGITS,
  STANDARD_PUNCTUATION,
  analyzeGlyphStyleMetrics,
  createGlyphFromSvgPath,
  getAlgorithmicSvgForChar,
} from "../utils/glyphExpander";
import { getAiRequestHeaders } from "../utils/aiClient";

interface CharacterExpanderModalProps {
  isOpen: boolean;
  onClose: () => void;
  glyphs: DetectedGlyph[];
  onAddExpandedGlyphs: (newGlyphs: DetectedGlyph[]) => void;
  sourceImageUrl: string | null;
  colorCanvasDataUrl: string | null;
  fontStyle?: string;
  showToast?: (msg: string) => void;
}

export const CharacterExpanderModal: React.FC<CharacterExpanderModalProps> = ({
  isOpen,
  onClose,
  glyphs,
  onAddExpandedGlyphs,
  sourceImageUrl,
  colorCanvasDataUrl,
  fontStyle = "custom artistic typography",
  showToast,
}) => {
  const [engine, setEngine] = useState<"ai" | "algorithmic">("ai");
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeDigits, setIncludeDigits] = useState(true);
  const [includePunctuation, setIncludePunctuation] = useState(true);
  const [isExpanding, setIsExpanding] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);

  if (!isOpen) return null;

  // Compute existing characters
  const existingChars = new Set(glyphs.map((g) => g.char));

  const missingLowercase = STANDARD_LOWERCASE.filter((c) => !existingChars.has(c));
  const missingDigits = STANDARD_DIGITS.filter((c) => !existingChars.has(c));
  const missingPunctuation = STANDARD_PUNCTUATION.filter((c) => !existingChars.has(c));

  // Determine what will be generated
  const targetsToGenerate: string[] = [];
  if (includeLowercase) targetsToGenerate.push(...missingLowercase);
  if (includeDigits) targetsToGenerate.push(...missingDigits);
  if (includePunctuation) targetsToGenerate.push(...missingPunctuation);

  const totalStandard = 26 + 26 + 10 + STANDARD_PUNCTUATION.length;
  const currentTotal = glyphs.length;
  const coveragePercent = Math.min(100, Math.round((currentTotal / totalStandard) * 100));

  const handleStartExpansion = async () => {
    if (targetsToGenerate.length === 0) {
      showToast?.("No missing characters selected to generate.");
      return;
    }

    setIsExpanding(true);
    setProgressPercent(10);
    setProgressMsg("Analyzing source typographic DNA and stroke proportions...");

    try {
      // 1. Compute style metrics & color palette
      let colorCanvas: HTMLCanvasElement | null = null;
      if (colorCanvasDataUrl) {
        const img = new Image();
        img.src = colorCanvasDataUrl;
        await new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });
        colorCanvas = document.createElement("canvas");
        colorCanvas.width = img.width || 400;
        colorCanvas.height = img.height || 400;
        const ctx = colorCanvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
      }

      const styleMetrics = analyzeGlyphStyleMetrics(glyphs, colorCanvas);

      const generatedGlyphs: DetectedGlyph[] = [];

      if (engine === "ai") {
        setProgressMsg("Sending style reference to Gemini typography engine...");
        setProgressPercent(30);

        // Process in batches of 24 to maintain pristine output quality
        const batchSize = 24;
        const batches: string[][] = [];
        for (let i = 0; i < targetsToGenerate.length; i += batchSize) {
          batches.push(targetsToGenerate.slice(i, i + batchSize));
        }

        for (let bIndex = 0; bIndex < batches.length; bIndex++) {
          const batch = batches[bIndex];
          setProgressMsg(
            `Gemini extrapolating characters ${bIndex * batchSize + 1} to ${Math.min(
              (bIndex + 1) * batchSize,
              targetsToGenerate.length
            )} (${batch.join(" ")})`
          );
          setProgressPercent(35 + Math.round(((bIndex + 0.5) / batches.length) * 50));

          try {
            const resp = await fetch("/api/ai/expand-glyphs", {
              method: "POST",
              headers: getAiRequestHeaders(),
              body: JSON.stringify({
                referenceImageBase64: sourceImageUrl,
                existingCharacters: Array.from(existingChars),
                targetCharacters: batch,
                fontStyle,
              }),
            });

            if (!resp.ok) {
              const errData = await resp.json().catch(() => ({}));
              throw new Error(errData.error || `Server returned ${resp.status}`);
            }

            const data = await resp.json();
            const aiGlyphs = data.synthesizedGlyphs || [];

            for (const item of aiGlyphs) {
              if (item.char && item.svgPath) {
                const glyph = createGlyphFromSvgPath(
                  item.char,
                  item.svgPath,
                  styleMetrics,
                  styleMetrics.averageWidth,
                  styleMetrics.averageHeight
                );
                generatedGlyphs.push(glyph);
              }
            }
          } catch (aiErr: any) {
            console.warn(
              "AI expansion failed for batch, falling back to algorithmic synthesis:",
              aiErr
            );
            // Graceful algorithmic fallback for any failing batch
            for (const char of batch) {
              const svg = getAlgorithmicSvgForChar(char, styleMetrics);
              const glyph = createGlyphFromSvgPath(
                char,
                svg,
                styleMetrics,
                styleMetrics.averageWidth,
                styleMetrics.averageHeight
              );
              generatedGlyphs.push(glyph);
            }
          }
        }
      } else {
        // Algorithmic instant expansion
        setProgressMsg("Synthesizing vector contours with geometric stroke matching...");
        setProgressPercent(50);
        await new Promise((r) => setTimeout(r, 120)); // Brief pause for UI render

        for (let i = 0; i < targetsToGenerate.length; i++) {
          const char = targetsToGenerate[i];
          const svg = getAlgorithmicSvgForChar(char, styleMetrics);
          const glyph = createGlyphFromSvgPath(
            char,
            svg,
            styleMetrics,
            styleMetrics.averageWidth,
            styleMetrics.averageHeight
          );
          generatedGlyphs.push(glyph);
          setProgressPercent(50 + Math.round(((i + 1) / targetsToGenerate.length) * 45));
        }
      }

      setProgressPercent(100);
      setProgressMsg("Finalizing glyph vectors and baseline metrics...");
      await new Promise((r) => setTimeout(r, 200));

      onAddExpandedGlyphs(generatedGlyphs);
      showToast?.(`Added ${generatedGlyphs.length} harmonized characters to your font!`);
      onClose();
    } catch (err: any) {
      console.error("Expansion error:", err);
      showToast?.(`Expansion failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsExpanding(false);
      setProgressPercent(0);
      setProgressMsg("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-start justify-between bg-neutral-900/90">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-neutral-100">
                Expand to Full Character Set
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Study the visual look and feel of your drawn glyphs to extrapolate missing lowercase,
              numerals, and punctuation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExpanding}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-neutral-200 text-xs">
          {/* Current Character Coverage Bar */}
          <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-300">
                Current Font Completeness
              </span>
              <span className="font-bold text-amber-400">
                {currentTotal} / {totalStandard} characters ({coveragePercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-neutral-700 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-neutral-400 text-center">
              <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                <div className="font-bold text-neutral-200">
                  {missingLowercase.length === 0 ? "26/26" : `${26 - missingLowercase.length}/26`}
                </div>
                <div>Lowercase a-z</div>
              </div>
              <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                <div className="font-bold text-neutral-200">
                  {missingDigits.length === 0 ? "10/10" : `${10 - missingDigits.length}/10`}
                </div>
                <div>Digits 0-9</div>
              </div>
              <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                <div className="font-bold text-neutral-200">
                  {STANDARD_PUNCTUATION.length - missingPunctuation.length}/
                  {STANDARD_PUNCTUATION.length}
                </div>
                <div>Punctuation</div>
              </div>
            </div>
          </div>

          {/* Engine Choice: AI vs Algorithmic */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 block">
              Expansion Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEngine("ai")}
                disabled={isExpanding}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
                  engine === "ai"
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "bg-neutral-800/40 border-neutral-700/60 hover:bg-neutral-800/80"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 font-bold text-sm text-neutral-100">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>AI Stylistic Extrapolation</span>
                  </div>
                  {engine === "ai" && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Gemini analyzes your uploaded sheet's stroke contrast, serifs, terminals, and
                  artistic personality to craft original, matching characters.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEngine("algorithmic")}
                disabled={isExpanding}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
                  engine === "algorithmic"
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "bg-neutral-800/40 border-neutral-700/60 hover:bg-neutral-800/80"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 font-bold text-sm text-neutral-100">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Fast Algorithmic Synthesis</span>
                  </div>
                  {engine === "algorithmic" && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Instant mathematical synthesis on device. Scales stems, establishes x-height, and
                  derives numerals and punctuation using measured pen metrics.
                </p>
              </button>
            </div>
          </div>

          {/* Character Sets to Generate */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-neutral-300 block">
              Select Character Groups to Synthesize
            </label>

            {/* Lowercase Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                includeLowercase
                  ? "bg-neutral-800/60 border-neutral-600"
                  : "bg-neutral-800/20 border-neutral-800 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={includeLowercase}
                onChange={(e) => setIncludeLowercase(e.target.checked)}
                disabled={isExpanding || missingLowercase.length === 0}
                className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-200">
                    Lowercase Alphabet (a-z)
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {missingLowercase.length} missing
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono tracking-wider truncate">
                  {missingLowercase.length > 0 ? missingLowercase.join(" ") : "All present"}
                </div>
              </div>
            </label>

            {/* Digits Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                includeDigits
                  ? "bg-neutral-800/60 border-neutral-600"
                  : "bg-neutral-800/20 border-neutral-800 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={includeDigits}
                onChange={(e) => setIncludeDigits(e.target.checked)}
                disabled={isExpanding || missingDigits.length === 0}
                className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-200">Numerals (0-9)</span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {missingDigits.length} missing
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono tracking-wider truncate">
                  {missingDigits.length > 0 ? missingDigits.join(" ") : "All present"}
                </div>
              </div>
            </label>

            {/* Punctuation Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                includePunctuation
                  ? "bg-neutral-800/60 border-neutral-600"
                  : "bg-neutral-800/20 border-neutral-800 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={includePunctuation}
                onChange={(e) => setIncludePunctuation(e.target.checked)}
                disabled={isExpanding || missingPunctuation.length === 0}
                className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-200">
                    Punctuation & Math Symbols
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {missingPunctuation.length} missing
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono tracking-wider truncate">
                  {missingPunctuation.length > 0 ? missingPunctuation.join(" ") : "All present"}
                </div>
              </div>
            </label>
          </div>

          {/* Color Pack Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Cultural Color Harmonization:</strong> Synthesized glyphs automatically sample
              and inherit the color gradient and textures of your uploaded character sheet for both
              TTF and the Color Pack.
            </span>
          </div>

          {/* Active Generation Progress Bar */}
          {isExpanding && (
            <div className="p-4 rounded-xl bg-neutral-800/90 border border-amber-500/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="font-semibold text-neutral-200">Synthesizing Letterforms...</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-700 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-400 truncate">{progressMsg}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between gap-3">
          <div className="text-[11px] text-neutral-400">
            {targetsToGenerate.length > 0 ? (
              <span>
                Will create <strong>{targetsToGenerate.length}</strong> new characters
              </span>
            ) : (
              <span className="text-neutral-500">No characters selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExpanding}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartExpansion}
              disabled={isExpanding || targetsToGenerate.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 disabled:pointer-events-none"
            >
              {isExpanding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Expand Font Set (+{targetsToGenerate.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
