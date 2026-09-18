import React, { useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Eye,
  Layers,
  ArrowRight,
  AlertTriangle,
  Info,
  Download,
  FileText,
  Bot,
  PenTool,
  Copy,
  Check,
} from "lucide-react";
import { ImageProcessingSettings, SheetQualityAssessment } from "../types";
import { SAMPLE_PRESETS, generatePrintableTemplateSheet } from "../utils/sampleSheets";

interface UploadAndCutoutProps {
  sourceImageUrl: string | null;
  cleanedCanvasDataUrl: string | null;
  colorCanvasDataUrl?: string | null;
  detectedCount: number;
  qualityAssessment?: SheetQualityAssessment | null;
  settings: ImageProcessingSettings;
  onUpdateSettings: (settings: Partial<ImageProcessingSettings>) => void;
  onUploadImage: (file: File) => void;
  onSelectSamplePreset: (presetId: string) => void;
  onProceedToGlyphs: () => void;
  onClearImage?: () => void;
  isProcessing: boolean;
  processingProgress?: number;
  processingStage?: string;
}

export const UploadAndCutout: React.FC<UploadAndCutoutProps> = ({
  sourceImageUrl,
  cleanedCanvasDataUrl,
  colorCanvasDataUrl,
  detectedCount,
  qualityAssessment,
  settings,
  onUpdateSettings,
  onUploadImage,
  onSelectSamplePreset,
  onProceedToGlyphs,
  onClearImage,
  isProcessing,
  processingProgress,
  processingStage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"cultural-color" | "cutout" | "original">("cultural-color");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleDownloadTemplate = () => {
    const dataUrl = generatePrintableTemplateSheet();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "handwriting-alphabet-template-sheet.png";
    link.click();
  };

  const handleCopyAiPrompt = () => {
    const prompt =
      "A clean typography character sheet of alphabet A to Z uppercase, lowercase a to z, and numbers 0 to 9, neatly arranged in spaced grid rows on a pure solid white background, crisp solid dark black ink, zero noise, high resolution";
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
      {/* Introduction banner explaining the exact capability */}
      <div className="bg-gradient-to-r from-neutral-800/80 via-neutral-800/50 to-neutral-900 border border-neutral-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% In-Browser & Offline-Ready Glyph Extraction</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
            Turn your drawn letters & numbers into a real TrueType font
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Upload an image containing your A-Z alphabet, 0-9 digits, or symbols on a white background.
            Our engine runs entirely in your browser to automatically strip the background, isolate every glyph contour, map them to standard font unicode, and export an installable <code className="text-amber-300 font-mono">.ttf</code> font file.
          </p>
        </div>
      </div>

      {/* Recommended Input Formats & Template Sheet Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Handwritten Grid / Printable Template */}
        <div className="bg-neutral-850/80 border border-neutral-700/70 rounded-2xl p-5 space-y-3 shadow-md flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <PenTool className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Option 1: Clean Handwritten Sheet</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Fastest Local Extraction
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Write <strong>A-Z capitals</strong>, <strong>a-z lowercase</strong>, and <strong>0-9 digits</strong> separated with clean spacing on plain unlined white paper.
              Avoiding full essay paragraphs or overlapping sentences allows instant 1-click contour extraction.
            </p>
          </div>
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-400">
              Need a grid? Print our ready-to-fill template:
            </span>
            <button
              type="button"
              id="btn-download-printable-template"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition active:scale-95 shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Printable Sheet</span>
            </button>
          </div>
        </div>

        {/* Card 2: AI-Generated Character Sheet */}
        <div className="bg-neutral-850/80 border border-neutral-700/70 rounded-2xl p-5 space-y-3 shadow-md flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <Bot className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Option 2: AI Image Generator Sheet</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Any Visual Style
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Generate an alphabet sheet with Midjourney, DALL-E, Ideogram, or Imagen in your favorite visual style and drop the result image here.
            </p>
          </div>
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-400 truncate">
              Copy optimal image prompt for AI generators:
            </span>
            <button
              type="button"
              id="btn-copy-ai-image-prompt"
              onClick={handleCopyAiPrompt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 transition active:scale-95 shrink-0"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Prompt Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copy AI Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quality Check / Image Suitability Warning Banner */}
      {sourceImageUrl && qualityAssessment && qualityAssessment.isLikelyPhoto && (
        <div
          id="banner-photo-detected-warning"
          className="rounded-2xl border border-red-500/40 bg-red-950/40 p-5 shadow-xl text-neutral-100 space-y-3 animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-red-300">
                  Non-Character Image or Complex Photo Detected
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                  {Math.round(qualityAssessment.inkCoverageRatio * 100)}% Foreground Density
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {qualityAssessment.recommendation}
              </p>
              {qualityAssessment.warnings.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-red-200/90 space-y-0.5 pt-1">
                  {qualityAssessment.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
            {onClearImage && (
              <button
                type="button"
                onClick={onClearImage}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition shrink-0"
              >
                Clear & Re-upload
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notice for successful clean sheet */}
      {sourceImageUrl && qualityAssessment && !qualityAssessment.isLikelyPhoto && qualityAssessment.warnings.length === 0 && (
        <div
          id="banner-clean-sheet-detected"
          className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2.5 shadow-sm text-neutral-200 flex items-center justify-between gap-3 text-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-300">Proper character sheet verified:</span>
            <span className="text-neutral-300">
              Clean background ({Math.round((1 - qualityAssessment.inkCoverageRatio) * 100)}% white paper) and well-spaced glyph boundaries.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Parameters Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active image status badge with clear button */}
          {sourceImageUrl && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-neutral-200 font-semibold truncate">
                  Character Sheet Loaded ({detectedCount} glyphs)
                </span>
              </div>
              {onClearImage && (
                <button
                  type="button"
                  onClick={onClearImage}
                  className="text-[11px] font-semibold text-neutral-400 hover:text-red-400 underline shrink-0 transition ml-2"
                >
                  Clear Sheet
                </button>
              )}
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            id="dropzone-image-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isProcessing) fileInputRef.current?.click();
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 relative overflow-hidden ${
              isDragging
                ? "border-amber-500 bg-amber-500/10 scale-[1.01] cursor-pointer"
                : "border-neutral-700 hover:border-neutral-500 bg-neutral-800/40 hover:bg-neutral-800/70 cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              disabled={isProcessing}
              onChange={handleFileChange}
            />
            {isProcessing && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Processing...</span>
              </div>
            )}
            <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-700/60 flex items-center justify-center text-neutral-200 mb-3 shadow-inner">
              <Upload className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-200">
              Click to browse or drop character sheet
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Supports PNG, JPG, or WEBP (plain white or light background)
            </p>
          </div>

          {/* Preset Sample Sheets */}
          <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Or try a built-in sample sheet
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  id={`btn-sample-preset-${preset.id}`}
                  onClick={() => onSelectSamplePreset(preset.id)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-neutral-700/80 bg-neutral-900/60 hover:bg-neutral-750 hover:border-amber-500/50 transition group flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-neutral-200 group-hover:text-amber-300 truncate">
                      {preset.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {preset.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded">
                    Load
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Removal & Extraction Controls */}
          <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Background Removal Controls
                </h3>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({
                    whiteThreshold: 235,
                    contrast: 1.3,
                    invert: false,
                    minGlyphArea: 50,
                    mergeDistance: 14,
                    smoothing: 1.6,
                  })
                }
                title="Reset to defaults"
                className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-medium">White Cutoff Threshold</span>
                <span className="font-mono text-amber-400">{settings.whiteThreshold}</span>
              </div>
              <input
                id="slider-white-threshold"
                type="range"
                min="100"
                max="254"
                step="1"
                value={settings.whiteThreshold}
                onChange={(e) =>
                  onUpdateSettings({ whiteThreshold: parseInt(e.target.value, 10) })
                }
                className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400">
                Lower value removes darker cream/off-white background paper tones.
              </p>
            </div>

            {/* Contrast Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-medium">Ink Contrast Boost</span>
                <span className="font-mono text-amber-400">{settings.contrast.toFixed(1)}x</span>
              </div>
              <input
                id="slider-contrast-boost"
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                value={settings.contrast}
                onChange={(e) =>
                  onUpdateSettings({ contrast: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
              />
            </div>

            {/* Noise Speckle Filter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-medium">Speckle / Noise Filter</span>
                <span className="font-mono text-amber-400">{settings.minGlyphArea} px²</span>
              </div>
              <input
                id="slider-min-glyph-area"
                type="range"
                min="20"
                max="300"
                step="10"
                value={settings.minGlyphArea}
                onChange={(e) =>
                  onUpdateSettings({ minGlyphArea: parseInt(e.target.value, 10) })
                }
                className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400">
                Ignores pencil specks or paper dust smaller than this area.
              </p>
            </div>

            {/* Multi-part Character Merge Distance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-medium">Multi-part Merge Gap</span>
                <span className="font-mono text-amber-400">{settings.mergeDistance} px</span>
              </div>
              <input
                id="slider-merge-distance"
                type="range"
                min="4"
                max="40"
                step="1"
                value={settings.mergeDistance}
                onChange={(e) =>
                  onUpdateSettings({ mergeDistance: parseInt(e.target.value, 10) })
                }
                className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400">
                Combines vertical dots (e.g. i, j, :, !, ?) without merging adjacent horizontal characters.
              </p>
            </div>

            {/* Vector Contour Smoothing */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-medium">Vector Curve Smoothing</span>
                <span className="font-mono text-amber-400">{settings.smoothing.toFixed(1)}</span>
              </div>
              <input
                id="slider-vector-smoothing"
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={settings.smoothing}
                onChange={(e) =>
                  onUpdateSettings({ smoothing: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
              />
            </div>

            {/* Invert Dark/Light Toggle */}
            <div className="pt-2 border-t border-neutral-700/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-neutral-200 block">Invert Colors</span>
                <span className="text-[11px] text-neutral-400">
                  Enable if handwriting is white on black
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="toggle-invert-colors"
                  type="checkbox"
                  checked={settings.invert}
                  onChange={(e) => onUpdateSettings({ invert: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Visual Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl overflow-hidden shadow-xl">
            {/* Canvas Header Toolbar */}
            <div className="px-5 py-3 border-b border-neutral-700/60 flex flex-wrap items-center justify-between gap-3 bg-neutral-850">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    Visual Preview
                  </span>
                </div>
                {detectedCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{detectedCount} Glyphs Isolated</span>
                  </span>
                )}
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-neutral-900/80 p-1 rounded-xl border border-neutral-700/70 text-xs gap-1">
                <button
                  id="btn-view-cultural-color"
                  onClick={() => setViewMode("cultural-color")}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    viewMode === "cultural-color"
                      ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Cultural Surface (Real Color)
                </button>
                <button
                  id="btn-view-cutout"
                  onClick={() => setViewMode("cutout")}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    viewMode === "cutout"
                      ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Monochrome Cutout
                </button>
                <button
                  id="btn-view-original"
                  onClick={() => setViewMode("original")}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    viewMode === "original"
                      ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Original Input
                </button>
              </div>
            </div>

            {/* Canvas Display Body */}
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[440px] bg-neutral-950/50 contain-paint">
              {isProcessing ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-medium text-neutral-300">
                    Extracting contours & removing background...
                  </p>
                </div>
              ) : sourceImageUrl ? (
                <div className="w-full flex flex-col items-center justify-center">
                  <div
                    className="relative max-w-full rounded-xl overflow-hidden border border-neutral-700/80 shadow-xl bg-neutral-900"
                    style={{ transform: "translateZ(0)" }}
                  >
                    {viewMode === "cultural-color" ? (
                      /* Checkerboard transparency background with real cultural colors */
                      <div
                        className="p-4 flex items-center justify-center bg-[#121217]"
                        style={{
                          backgroundImage: `
                            linear-gradient(45deg, #1c1c24 25%, transparent 25%),
                            linear-gradient(-45deg, #1c1c24 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #1c1c24 75%),
                            linear-gradient(-45deg, transparent 75%, #1c1c24 75%)
                          `,
                          backgroundSize: "20px 20px",
                        }}
                      >
                        {(colorCanvasDataUrl || cleanedCanvasDataUrl) ? (
                          <img
                            src={colorCanvasDataUrl || cleanedCanvasDataUrl || ""}
                            alt="Authentic Cultural Colors with Background Removed"
                            decoding="async"
                            loading="eager"
                            className="max-h-[500px] w-auto object-contain rounded select-none pointer-events-none"
                            style={{ transform: "translateZ(0)" }}
                          />
                        ) : null}
                      </div>
                    ) : viewMode === "cutout" ? (
                      /* Checkerboard transparency background with monochrome ink */
                      <div
                        className="p-4 flex items-center justify-center bg-[#121217]"
                        style={{
                          backgroundImage: `
                            linear-gradient(45deg, #1c1c24 25%, transparent 25%),
                            linear-gradient(-45deg, #1c1c24 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #1c1c24 75%),
                            linear-gradient(-45deg, transparent 75%, #1c1c24 75%)
                          `,
                          backgroundSize: "20px 20px",
                        }}
                      >
                        {cleanedCanvasDataUrl ? (
                          <img
                            src={cleanedCanvasDataUrl}
                            alt="Cleaned Isolated Glyphs with White Background Removed"
                            decoding="async"
                            loading="eager"
                            className="max-h-[500px] w-auto object-contain rounded select-none pointer-events-none"
                            style={{ transform: "translateZ(0)" }}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div className="bg-white p-4 flex items-center justify-center">
                        <img
                          src={sourceImageUrl}
                          alt="Original Character Sheet"
                          decoding="async"
                          loading="eager"
                          className="max-h-[500px] w-auto object-contain rounded select-none pointer-events-none"
                          style={{ transform: "translateZ(0)" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="mt-3 text-center text-xs text-neutral-400 flex items-center gap-2">
                    <span>
                      {viewMode === "cutout"
                        ? "Checkerboard indicates transparent background (white pixels stripped completely)."
                        : "Original user uploaded drawing/character sheet."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 px-6 space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-neutral-400 shadow-inner">
                    <Upload className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-neutral-200">
                      No Character Sheet Loaded
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Upload an image file containing your drawn alphabet/numbers on the left, or test the studio by choosing a built-in sample sheet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-md shadow-amber-500/20 transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Browse Character Sheet File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Proceed Action Bar */}
            {detectedCount > 0 && (
              <div className="px-6 py-4 bg-neutral-850 border-t border-neutral-700/60 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-neutral-400 block">Step 1 Complete</span>
                  <span className="text-sm font-semibold text-neutral-100">
                    {detectedCount} character contours isolated & ready for mapping
                  </span>
                </div>
                <button
                  id="btn-proceed-to-glyphs"
                  onClick={onProceedToGlyphs}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-lg shadow-amber-500/20 transition"
                >
                  <span>Review & Map Characters</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
