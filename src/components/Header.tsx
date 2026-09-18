import React from "react";
import {
  Download,
  Layers,
  Sparkles,
  Type,
  Sliders,
  Play,
  FileCheck,
} from "lucide-react";
import { StudioTab } from "../types";

interface HeaderProps {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  fontName: string;
  glyphCount: number;
  hasCompiledFont: boolean;
  onDownloadFont: () => void;
  onDownloadColorPack?: () => void;
  onGenerateFont: () => void;
  isGenerating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  fontName,
  glyphCount,
  hasCompiledFont,
  onDownloadFont,
  onDownloadColorPack,
  onGenerateFont,
  isGenerating,
}) => {
  const tabs: { id: StudioTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: "upload",
      label: "1. Upload & Cutout",
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: "glyphs",
      label: "2. Glyphs & Labels",
      icon: <Type className="w-4 h-4" />,
      badge: glyphCount > 0 ? glyphCount : undefined,
    },
    {
      id: "metrics",
      label: "3. Font Standards",
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: "test",
      label: "4. Live Tester",
      icon: <Play className="w-4 h-4" />,
    },
    {
      id: "export",
      label: "5. Export .TTF",
      icon: <Download className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 font-bold text-lg tracking-wider">
            F
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight truncate text-neutral-100">
                Image to Font Studio
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                TTF Generator
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate">
              {fontName || "CustomFont"} • {glyphCount} Glyphs
            </p>
          </div>
        </div>

        {/* Workflow Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-950/70 p-1 rounded-xl border border-neutral-800">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      isActive
                        ? "bg-neutral-950/20 text-neutral-950"
                        : "bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onDownloadColorPack && (
            <button
              id="btn-quick-download-color-pack"
              onClick={onDownloadColorPack}
              disabled={glyphCount === 0}
              title="Download Real Cultural Color Pack (ZIP)"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-300 border border-amber-500/30 transition disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cultural ZIP</span>
            </button>
          )}

          <button
            id="btn-quick-generate-font"
            onClick={onGenerateFont}
            disabled={isGenerating || glyphCount === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-neutral-200 border border-neutral-700 transition"
          >
            {isGenerating ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{isGenerating ? "Building Font..." : "Build Font"}</span>
          </button>

          <button
            id="btn-quick-download-ttf"
            onClick={onDownloadFont}
            disabled={!hasCompiledFont}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download .TTF</span>
            <span className="sm:hidden">.TTF</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab bar */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 gap-1 border-t border-neutral-800/80 bg-neutral-950/60 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition ${
                isActive
                  ? "bg-amber-500 text-neutral-950 font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] opacity-80">({tab.badge})</span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
