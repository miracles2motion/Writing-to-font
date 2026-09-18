import React, { useState } from "react";
import {
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sun,
  Moon,
  ArrowRight,
  Download,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { FontSettings, DetectedGlyph } from "../types";

interface TypeTesterProps {
  fontFamily: string;
  settings: FontSettings;
  glyphs: DetectedGlyph[];
  onDownloadTtf: () => void;
  onProceedToExport: () => void;
}

export const TypeTester: React.FC<TypeTesterProps> = ({
  fontFamily,
  settings,
  glyphs,
  onDownloadTtf,
  onProceedToExport,
}) => {
  const [testText, setTestText] = useState(
    "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG\n0123456789 - HELLO WORLD!"
  );
  const [fontSize, setFontSize] = useState(42);
  const [lineHeight, setLineHeight] = useState(1.4);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [isLightMode, setIsLightMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"playground" | "waterfall" | "charmap">("playground");
  const [copied, setCopied] = useState(false);

  const samplePangrams = [
    { label: "Classic", text: "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG" },
    { label: "Liquor Jugs", text: "PACK MY BOX WITH FIVE DOZEN LIQUOR JUGS." },
    { label: "Quartz", text: "SPHINX OF BLACK QUARTZ, JUDGE MY VOW!" },
    { label: "Digits & Math", text: "0 1 2 3 4 5 6 7 8 9 + - = % $ # @ ! ?" },
    { label: "Mixed Case", text: "The Quick Brown Fox Jumps Over The Lazy Dog 123" },
  ];

  const waterfallSizes = [16, 22, 30, 42, 56, 72];

  const handleCopyText = () => {
    navigator.clipboard.writeText(testText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner with Quick Download */}
      <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Compiled Font
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Family: {fontFamily}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-100 mt-1">
            Live Font Testing Playground
          </h2>
          <p className="text-xs text-neutral-300">
            Type anything below to test your newly generated font in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-download-ttf-tester"
            onClick={onDownloadTtf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-md shadow-amber-500/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download .TTF</span>
          </button>
          <button
            id="btn-goto-export"
            onClick={onProceedToExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
          >
            <span>Export Options</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Tabs: Playground vs Waterfall vs Character Map */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          id="tab-btn-playground"
          onClick={() => setActiveTab("playground")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "playground"
              ? "bg-amber-500 text-neutral-950 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          Interactive Playground
        </button>
        <button
          id="tab-btn-waterfall"
          onClick={() => setActiveTab("waterfall")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "waterfall"
              ? "bg-amber-500 text-neutral-950 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          Specimen Waterfall
        </button>
        <button
          id="tab-btn-charmap"
          onClick={() => setActiveTab("charmap")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "charmap"
              ? "bg-amber-500 text-neutral-950 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          Character Glyphs Map ({glyphs.length})
        </button>
      </div>

      {activeTab === "playground" && (
        <div className="space-y-6">
          {/* Preset Buttons & Controls Strip */}
          <div className="bg-neutral-800/40 border border-neutral-700/60 rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Pangram Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-neutral-400 font-medium mr-1">Presets:</span>
                {samplePangrams.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTestText(p.text)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-750 text-neutral-300 hover:text-amber-300 hover:border-amber-500/50 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Theme & Copy */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLightMode(!isLightMode)}
                  className="p-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-neutral-100 transition"
                  title="Toggle Light / Dark preview"
                >
                  {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-xs font-medium text-neutral-300 hover:text-neutral-100 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Sliders: Size, Line Height, Letter Spacing, Alignment */}
            <div className="pt-3 border-t border-neutral-700/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Font Size</span>
                  <span className="font-mono text-amber-400">{fontSize}px</span>
                </div>
                <input
                  id="slider-font-size"
                  type="range"
                  min="14"
                  max="120"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Line Height</span>
                  <span className="font-mono text-amber-400">{lineHeight.toFixed(1)}</span>
                </div>
                <input
                  id="slider-line-height"
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Letter Spacing</span>
                  <span className="font-mono text-amber-400">{letterSpacing}px</span>
                </div>
                <input
                  id="slider-custom-letter-spacing"
                  type="range"
                  min="-5"
                  max="20"
                  step="1"
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* Alignment */}
              <div className="flex items-center gap-1 justify-end">
                <button
                  onClick={() => setTextAlign("left")}
                  className={`p-2 rounded-lg border transition ${
                    textAlign === "left"
                      ? "bg-amber-500 text-neutral-950 border-amber-500"
                      : "bg-neutral-900 border-neutral-700 text-neutral-400"
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTextAlign("center")}
                  className={`p-2 rounded-lg border transition ${
                    textAlign === "center"
                      ? "bg-amber-500 text-neutral-950 border-amber-500"
                      : "bg-neutral-900 border-neutral-700 text-neutral-400"
                  }`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTextAlign("right")}
                  className={`p-2 rounded-lg border transition ${
                    textAlign === "right"
                      ? "bg-amber-500 text-neutral-950 border-amber-500"
                      : "bg-neutral-900 border-neutral-700 text-neutral-400"
                  }`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Real Font Canvas Area */}
          <div
            className={`rounded-2xl border transition-all duration-200 p-6 sm:p-10 shadow-2xl min-h-[380px] flex flex-col justify-start relative ${
              isLightMode
                ? "bg-white text-neutral-900 border-neutral-300"
                : "bg-neutral-950 text-neutral-100 border-neutral-800"
            }`}
          >
            <textarea
              id="live-font-textarea"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              spellCheck={false}
              className="w-full bg-transparent outline-none resize-none overflow-hidden"
              style={{
                fontFamily: `"${fontFamily}", sans-serif`,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
                textAlign,
                minHeight: "300px",
              }}
              placeholder="Start typing in your custom hand-drawn font..."
            />

            <div className="absolute bottom-3 right-4 text-[11px] text-neutral-500 font-mono">
              Rendered via dynamic OpenType @font-face
            </div>
          </div>
        </div>
      )}

      {activeTab === "waterfall" && (
        <div className="bg-neutral-950 rounded-2xl border border-neutral-800 p-8 space-y-8">
          <div className="border-b border-neutral-800 pb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Specimen Scale Waterfall (16px to 72px)
            </h3>
          </div>

          <div className="space-y-6">
            {waterfallSizes.map((size) => (
              <div key={size} className="space-y-1">
                <div className="text-[11px] font-mono text-neutral-500">{size}px</div>
                <div
                  style={{
                    fontFamily: `"${fontFamily}", sans-serif`,
                    fontSize: `${size}px`,
                    lineHeight: 1.3,
                  }}
                  className="text-neutral-100 break-words"
                >
                  Pack my box with five dozen liquor jugs. 0123456789
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "charmap" && (
        <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-semibold text-neutral-200">
              Compiled Font Characters ({glyphs.length} registered)
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              TrueType Non-Zero Winding
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {glyphs.map((g) => (
              <div
                key={g.id}
                className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex flex-col items-center justify-center text-center hover:border-amber-500/50 transition"
              >
                <span
                  style={{ fontFamily: `"${fontFamily}", sans-serif` }}
                  className="text-3xl text-amber-300 my-2"
                >
                  {g.char}
                </span>
                <span className="text-xs font-mono font-bold text-neutral-200">
                  {g.char}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 mt-0.5">
                  U+{g.char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
