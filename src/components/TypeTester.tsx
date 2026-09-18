import React, { useState, useEffect, useRef } from "react";
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
  Sparkles,
  Palette,
  Image as ImageIcon,
} from "lucide-react";
import { FontSettings, DetectedGlyph } from "../types";
import {
  typesetCulturalArtwork,
  downloadCanvasPng,
} from "../utils/colorAssetExporter";

interface TypeTesterProps {
  fontFamily: string;
  settings: FontSettings;
  glyphs: DetectedGlyph[];
  onDownloadTtf: () => void;
  onDownloadColorPack?: () => void;
  onProceedToExport: () => void;
}

export const TypeTester: React.FC<TypeTesterProps> = ({
  fontFamily,
  settings,
  glyphs,
  onDownloadTtf,
  onDownloadColorPack,
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
  const [activeTab, setActiveTab] = useState<
    "playground" | "cultural-art" | "waterfall" | "charmap"
  >("cultural-art");
  const [copied, setCopied] = useState(false);

  // Cultural Color Art Typesetter states
  const [culturalText, setCulturalText] = useState("AFRICA 2026\nAUTHENTIC CULTURE");
  const [culturalCharHeight, setCulturalCharHeight] = useState(80);
  const [culturalSpacing, setCulturalSpacing] = useState(10);
  const [culturalLineHeight, setCulturalLineHeight] = useState(1.3);
  const [culturalBg, setCulturalBg] = useState<"transparent" | "dark" | "white" | "ochre">("transparent");
  const [isTypesetting, setIsTypesetting] = useState(false);
  const culturalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [culturalCanvasDataUrl, setCulturalCanvasDataUrl] = useState<string | null>(null);

  // Re-render cultural artwork whenever input or options change
  useEffect(() => {
    let isMounted = true;
    setIsTypesetting(true);

    const bgMap: Record<string, string | null> = {
      transparent: null,
      dark: "#0f172a",
      white: "#ffffff",
      ochre: "#92400e",
    };

    typesetCulturalArtwork(glyphs, culturalText, {
      targetHeight: culturalCharHeight,
      letterSpacing: culturalSpacing,
      lineHeightMultiplier: culturalLineHeight,
      backgroundColor: bgMap[culturalBg],
    }).then((canvas) => {
      if (isMounted) {
        culturalCanvasRef.current = canvas;
        setCulturalCanvasDataUrl(canvas.toDataURL("image/png"));
        setIsTypesetting(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [glyphs, culturalText, culturalCharHeight, culturalSpacing, culturalLineHeight, culturalBg]);

  const handleDownloadTypesetArtwork = () => {
    if (culturalCanvasRef.current) {
      const safeTitle = culturalText
        .split("\n")[0]
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 20) || "Typeset_Artwork";
      downloadCanvasPng(culturalCanvasRef.current, `${safeTitle}_Cultural_Color_Artwork.png`);
    }
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
      {/* Top Banner with Quick Download */}
      <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Preview
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Family: {fontFamily}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-100 mt-1">
            Live Font Testing & Cultural Typesetter
          </h2>
          <p className="text-xs text-neutral-300">
            Type anything below to preview either in real authentic cultural colors or standard monochrome font.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onDownloadColorPack && (
            <button
              id="btn-download-color-pack-top"
              onClick={onDownloadColorPack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-neutral-950 shadow-md shadow-amber-500/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Download Cultural ZIP</span>
            </button>
          )}
          <button
            id="btn-download-ttf-tester"
            onClick={onDownloadTtf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download .TTF</span>
          </button>
          <button
            id="btn-goto-export"
            onClick={onProceedToExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
          >
            <span>All Exports</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Tabs: Cultural Color Art Typesetter vs Playground vs Waterfall vs Character Map */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          id="tab-btn-cultural-art"
          onClick={() => setActiveTab("cultural-art")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "cultural-art"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cultural Color Typesetter</span>
        </button>
        <button
          id="tab-btn-playground"
          onClick={() => setActiveTab("playground")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "playground"
              ? "bg-amber-500 text-neutral-950 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          Monochrome TTF Playground
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

      {/* TAB 1: Cultural Color Artwork Typesetter (NEW) */}
      {activeTab === "cultural-art" && (
        <div className="space-y-6">
          <div className="bg-neutral-850 border border-neutral-750 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-750 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <span>Type with Authentic Cultural Surface & Colors</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Real Artwork
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Type any title, phrase, or sentence to render it instantly using your characters' authentic cultural colors and textures.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-download-typeset-art"
                  onClick={handleDownloadTypesetArtwork}
                  disabled={!culturalCanvasDataUrl || isTypesetting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-md shadow-amber-500/20 transition disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Typeset Artwork (PNG)</span>
                </button>
              </div>
            </div>

            {/* Controls Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs items-center">
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Character Height</span>
                  <span className="font-mono text-amber-400">{culturalCharHeight}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="140"
                  value={culturalCharHeight}
                  onChange={(e) => setCulturalCharHeight(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Character Spacing</span>
                  <span className="font-mono text-amber-400">{culturalSpacing}px</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="35"
                  value={culturalSpacing}
                  onChange={(e) => setCulturalSpacing(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Line Spacing</span>
                  <span className="font-mono text-amber-400">{culturalLineHeight.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.2"
                  step="0.05"
                  value={culturalLineHeight}
                  onChange={(e) => setCulturalLineHeight(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* Background selector */}
              <div className="space-y-1">
                <span className="text-neutral-300 block">Artwork Canvas Background</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCulturalBg("transparent")}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                      culturalBg === "transparent"
                        ? "bg-amber-500 text-neutral-950 border-amber-500 font-bold"
                        : "bg-neutral-900 border-neutral-700 text-neutral-400"
                    }`}
                  >
                    Alpha (None)
                  </button>
                  <button
                    onClick={() => setCulturalBg("dark")}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                      culturalBg === "dark"
                        ? "bg-amber-500 text-neutral-950 border-amber-500 font-bold"
                        : "bg-neutral-900 border-neutral-700 text-neutral-400"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setCulturalBg("white")}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                      culturalBg === "white"
                        ? "bg-amber-500 text-neutral-950 border-amber-500 font-bold"
                        : "bg-neutral-900 border-neutral-700 text-neutral-400"
                    }`}
                  >
                    White
                  </button>
                  <button
                    onClick={() => setCulturalBg("ochre")}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                      culturalBg === "ochre"
                        ? "bg-amber-500 text-neutral-950 border-amber-500 font-bold"
                        : "bg-neutral-900 border-neutral-700 text-neutral-400"
                    }`}
                  >
                    Ochre
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Input */}
            <div className="pt-2">
              <label className="text-xs text-neutral-400 block mb-1">
                Enter your text (multi-line supported):
              </label>
              <textarea
                value={culturalText}
                onChange={(e) => setCulturalText(e.target.value.toUpperCase())}
                rows={2}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm font-bold text-neutral-100 focus:border-amber-500 focus:outline-none transition tracking-wide"
                placeholder="Type your phrase here..."
              />
            </div>
          </div>

          {/* Rendered Artwork Visual Stage */}
          <div className="rounded-2xl border border-neutral-750 shadow-2xl overflow-hidden bg-neutral-950 flex flex-col items-center justify-center p-6 sm:p-10 min-h-[350px]">
            {isTypesetting ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-neutral-400">Assembling cultural artwork...</p>
              </div>
            ) : culturalCanvasDataUrl ? (
              <div
                className="p-6 rounded-xl border border-neutral-800 max-w-full overflow-x-auto shadow-inner flex items-center justify-center"
                style={{
                  backgroundImage:
                    culturalBg === "transparent"
                      ? `
                        linear-gradient(45deg, #1c1c24 25%, transparent 25%),
                        linear-gradient(-45deg, #1c1c24 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #1c1c24 75%),
                        linear-gradient(-45deg, transparent 75%, #1c1c24 75%)
                      `
                      : "none",
                  backgroundSize: "20px 20px",
                  backgroundColor:
                    culturalBg === "dark"
                      ? "#0f172a"
                      : culturalBg === "white"
                      ? "#ffffff"
                      : culturalBg === "ochre"
                      ? "#92400e"
                      : "#121217",
                }}
              >
                <img
                  src={culturalCanvasDataUrl}
                  alt="Custom Typeset Cultural Artwork"
                  className="max-h-[500px] w-auto object-contain drop-shadow-lg"
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

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
