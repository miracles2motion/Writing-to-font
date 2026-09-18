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
} from "lucide-react";
import { ImageProcessingSettings } from "../types";
import { SAMPLE_PRESETS } from "../utils/sampleSheets";

interface UploadAndCutoutProps {
  sourceImageUrl: string | null;
  cleanedCanvasDataUrl: string | null;
  colorCanvasDataUrl?: string | null;
  detectedCount: number;
  settings: ImageProcessingSettings;
  onUpdateSettings: (settings: Partial<ImageProcessingSettings>) => void;
  onUploadImage: (file: File) => void;
  onSelectSamplePreset: (presetId: string) => void;
  onProceedToGlyphs: () => void;
  isProcessing: boolean;
}

export const UploadAndCutout: React.FC<UploadAndCutoutProps> = ({
  sourceImageUrl,
  cleanedCanvasDataUrl,
  colorCanvasDataUrl,
  detectedCount,
  settings,
  onUpdateSettings,
  onUploadImage,
  onSelectSamplePreset,
  onProceedToGlyphs,
  isProcessing,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Introduction banner explaining the exact capability */}
      <div className="bg-gradient-to-r from-neutral-800/80 via-neutral-800/50 to-neutral-900 border border-neutral-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automatic White Background Removal & Glyph Extraction</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
            Turn your drawn letters & numbers into a real TrueType font
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Upload an image containing your A-Z alphabet, 0-9 digits, or symbols on a white background.
            Our engine automatically strips the background, isolates every glyph contour, maps them to standard font unicode, and exports an installable <code className="text-amber-300 font-mono">.ttf</code> font file.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Parameters Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upload Dropzone */}
          <div
            id="dropzone-image-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
                : "border-neutral-700 hover:border-neutral-500 bg-neutral-800/40 hover:bg-neutral-800/70"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-700/60 flex items-center justify-center text-neutral-200 mb-3 shadow-inner">
              <Upload className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-200">
              Click to browse or drop character sheet
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Supports PNG, JPG, or WEBP (white background recommended)
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
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[440px] bg-neutral-950/50">
              {isProcessing ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-medium text-neutral-300">
                    Extracting contours & removing background...
                  </p>
                </div>
              ) : sourceImageUrl ? (
                <div className="w-full flex flex-col items-center justify-center">
                  <div className="relative max-w-full rounded-xl overflow-hidden border border-neutral-700/80 shadow-2xl">
                    {viewMode === "cultural-color" ? (
                      /* Checkerboard transparency background with real cultural colors */
                      <div
                        className="p-4 flex items-center justify-center"
                        style={{
                          backgroundImage: `
                            linear-gradient(45deg, #1c1c24 25%, transparent 25%),
                            linear-gradient(-45deg, #1c1c24 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #1c1c24 75%),
                            linear-gradient(-45deg, transparent 75%, #1c1c24 75%)
                          `,
                          backgroundSize: "20px 20px",
                          backgroundColor: "#121217",
                        }}
                      >
                        {(colorCanvasDataUrl || cleanedCanvasDataUrl) ? (
                          <img
                            src={colorCanvasDataUrl || cleanedCanvasDataUrl || ""}
                            alt="Authentic Cultural Colors with Background Removed"
                            className="max-h-[500px] w-auto object-contain rounded drop-shadow"
                          />
                        ) : null}
                      </div>
                    ) : viewMode === "cutout" ? (
                      /* Checkerboard transparency background with monochrome ink */
                      <div
                        className="p-4 flex items-center justify-center"
                        style={{
                          backgroundImage: `
                            linear-gradient(45deg, #1c1c24 25%, transparent 25%),
                            linear-gradient(-45deg, #1c1c24 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #1c1c24 75%),
                            linear-gradient(-45deg, transparent 75%, #1c1c24 75%)
                          `,
                          backgroundSize: "20px 20px",
                          backgroundColor: "#121217",
                        }}
                      >
                        {cleanedCanvasDataUrl ? (
                          <img
                            src={cleanedCanvasDataUrl}
                            alt="Cleaned Isolated Glyphs with White Background Removed"
                            className="max-h-[500px] w-auto object-contain rounded drop-shadow"
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div className="bg-white p-4 flex items-center justify-center">
                        <img
                          src={sourceImageUrl}
                          alt="Original Character Sheet"
                          className="max-h-[500px] w-auto object-contain rounded"
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
                <div className="text-center py-16 space-y-3">
                  <ImageIcon className="w-12 h-12 text-neutral-600 mx-auto" />
                  <p className="text-sm font-medium text-neutral-400">
                    No image uploaded yet. Drop a character sheet or pick a sample preset!
                  </p>
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
