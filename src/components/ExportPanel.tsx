import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  Code,
  Laptop,
  Sparkles,
  FileCheck,
  Palette,
  FolderArchive,
  Image as ImageIcon,
} from "lucide-react";
import { FontSettings } from "../types";

interface ExportPanelProps {
  fontSettings: FontSettings;
  glyphCount: number;
  synthesizedCount: number;
  onDownloadTtf: () => void;
  onDownloadColorPack?: () => void;
  hasCompiledFont: boolean;
  isGeneratingColorPack?: boolean;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  fontSettings,
  glyphCount,
  synthesizedCount,
  onDownloadTtf,
  onDownloadColorPack,
  hasCompiledFont,
  isGeneratingColorPack = false,
}) => {
  const [copiedCss, setCopiedCss] = useState(false);
  const fontFileName = `${fontSettings.name.replace(/\s+/g, "_") || "CustomFont"}.ttf`;
  const safeName = (fontSettings.name || "CulturalFont").replace(/\s+/g, "_");

  const webfontCssSnippet = `/* 1. Place ${fontFileName} in your project's fonts folder */
@font-face {
  font-family: '${fontSettings.family || fontSettings.name || "CustomFont"}';
  src: url('./fonts/${fontFileName}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* 2. Apply to elements */
.custom-typography {
  font-family: '${fontSettings.family || fontSettings.name || "CustomFont"}', sans-serif;
  letter-spacing: ${fontSettings.letterSpacing * 0.05}px;
}`;

  const handleCopyCss = () => {
    navigator.clipboard.writeText(webfontCssSnippet);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Two Complementary Download Editions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Edition 1: Authentic Cultural Color Asset Pack (ZIP) */}
        <div className="bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-950 border-2 border-amber-500/50 rounded-3xl p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cultural Surface Colors Preserved</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
              Full-Color Cultural Art Pack (.ZIP)
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Downloads every letter, number, and character reflecting its <strong>authentic cultural background color and surface pattern</strong> as designed in your image, with the white background completely removed.
            </p>

            <div className="bg-neutral-900/90 border border-neutral-750 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-neutral-200 font-semibold">
                <FolderArchive className="w-4 h-4 text-amber-400 shrink-0" />
                <span>What's inside {safeName}_Cultural_Color_Pack.zip:</span>
              </div>
              <ul className="space-y-1 text-neutral-400 text-[11px] pl-6 list-disc">
                <li>Individual high-resolution transparent PNGs (<code className="text-amber-300">A.png</code>, <code className="text-amber-300">B.png</code>, <code className="text-amber-300">1.png</code>...)</li>
                <li>Individual SVG vectors with embedded cultural textures</li>
                <li>Full transparent character sheet (<code className="text-amber-300">all_transparent.png</code>)</li>
                <li>Metadata <code className="text-amber-300">manifest.json</code> with character mapping & dimensions</li>
                <li>Standalone interactive <code className="text-amber-300">index.html</code> web preview</li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            <button
              id="btn-download-color-pack"
              onClick={onDownloadColorPack}
              disabled={isGeneratingColorPack || glyphCount === 0}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-neutral-950 shadow-xl shadow-amber-500/20 transition disabled:opacity-40"
            >
              {isGeneratingColorPack ? (
                <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>
                {isGeneratingColorPack
                  ? "Packaging Cultural Asset Pack..."
                  : `Download Cultural Color Pack (.ZIP)`}
              </span>
            </button>
          </div>
        </div>

        {/* Edition 2: Standard TrueType Vector Font (.ttf) */}
        <div className="bg-gradient-to-br from-neutral-850 via-neutral-900 to-neutral-950 border border-neutral-700/80 rounded-3xl p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Standard Desktop & Web Vector Font</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
              TrueType Font (.TTF)
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Standard vector font file for typing anywhere in Word, Photoshop, Figma, or CSS. Single-color font that can be dynamically recolored to any text color in software.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">FORMAT</span>
                <span className="text-neutral-200 font-bold">TrueType (.ttf)</span>
              </div>
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">TOTAL GLYPHS</span>
                <span className="text-neutral-200 font-bold">{glyphCount} Glyphs</span>
              </div>
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">AUTO-SYNTHESIZED</span>
                <span className="text-amber-400 font-bold">{synthesizedCount} Missing</span>
              </div>
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">UNITS PER EM</span>
                <span className="text-neutral-200 font-bold">{fontSettings.unitsPerEm}</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              id="btn-download-ttf-main"
              onClick={onDownloadTtf}
              disabled={!hasCompiledFont}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold bg-neutral-750 hover:bg-neutral-700 hover:text-white border border-neutral-600 active:scale-95 text-neutral-200 shadow-xl transition disabled:opacity-40"
            >
              <Download className="w-5 h-5 text-amber-400" />
              <span>Download {fontFileName}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: WebFont Integration CSS (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-neutral-850 border border-neutral-750 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
                  WebFont CSS Integration
                </h3>
              </div>
              <button
                id="btn-copy-css"
                onClick={handleCopyCss}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-xs font-medium text-neutral-300 hover:text-neutral-100 transition"
              >
                {copiedCss ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCss ? "Copied CSS!" : "Copy CSS"}</span>
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Embed your font on any website or web application using standard CSS <code className="text-amber-300">@font-face</code>:
            </p>

            <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {webfontCssSnippet}
            </pre>
          </div>
        </div>

        {/* Right Column: Desktop Installation Guide (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-neutral-850 border border-neutral-750 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
                Desktop Installation Guide
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 font-bold font-mono">
                  WIN
                </div>
                <div>
                  <span className="font-semibold text-neutral-200 block">Windows 10 / 11</span>
                  <p className="text-neutral-400 mt-0.5">
                    Double-click the downloaded <code className="text-neutral-200">.ttf</code> file and click <strong>"Install"</strong> at the top left of the preview window.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="p-2 rounded-lg bg-neutral-500/10 text-neutral-300 shrink-0 font-bold font-mono">
                  MAC
                </div>
                <div>
                  <span className="font-semibold text-neutral-200 block">macOS (Apple Font Book)</span>
                  <p className="text-neutral-400 mt-0.5">
                    Double-click the downloaded <code className="text-neutral-200">.ttf</code> file. Font Book will open; click <strong>"Install Font"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 font-bold font-mono">
                  APPS
                </div>
                <div>
                  <span className="font-semibold text-neutral-200 block">Figma, Photoshop, Illustrator, Word</span>
                  <p className="text-neutral-400 mt-0.5">
                    After installing to your operating system, restart your design app or browser. Your font will appear in the font family picker under <strong>"{fontSettings.name || fontSettings.family || "CustomFont"}"</strong>!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
