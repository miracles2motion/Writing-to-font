import React from "react";
import {
  Download,
  Layers,
  Sparkles,
  Type,
  Sliders,
  Play,
  Key,
} from "lucide-react";
import { StudioTab } from "../types";
import { AppLogo } from "./AppLogo";

interface HeaderProps {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  fontName: string;
  glyphCount: number;
  hasCompiledFont: boolean;
  onDownloadFont: () => void;
  onDownloadColorPack?: () => void;
  onGenerateFont: () => void;
  onOpenApiKeyModal?: () => void;
  hasCustomApiKey?: boolean;
  activeModel?: string;
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
  onOpenApiKeyModal,
  hasCustomApiKey,
  activeModel = "gemini-2.5-flash",
  isGenerating,
}) => {
  const tabs: { id: StudioTab; stepNum: string; label: string; shortLabel: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: "upload",
      stepNum: "1",
      label: "1. Upload & Cutout",
      shortLabel: "Upload",
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: "glyphs",
      stepNum: "2",
      label: "2. Glyphs & Labels",
      shortLabel: "Glyphs",
      icon: <Type className="w-4 h-4" />,
      badge: glyphCount > 0 ? glyphCount : undefined,
    },
    {
      id: "metrics",
      stepNum: "3",
      label: "3. Font Standards",
      shortLabel: "Standards",
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: "test",
      stepNum: "4",
      label: "4. Live Tester",
      shortLabel: "Test",
      icon: <Play className="w-4 h-4" />,
    },
    {
      id: "export",
      stepNum: "5",
      label: "5. Export .TTF",
      shortLabel: "Export",
      icon: <Download className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 text-neutral-100 shadow-lg shadow-black/20">
      {/* Top Primary Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <AppLogo size={38} className="shrink-0 drop-shadow" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base tracking-tight truncate text-neutral-100">
                Image to Font Studio
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                TrueType &amp; Color
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-400 truncate">
              {fontName || "CustomFont"} • {glyphCount} Glyphs
            </p>
          </div>
        </div>

        {/* Desktop Workflow Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-neutral-950/80 p-1.5 rounded-2xl border border-neutral-800">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
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

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenApiKeyModal && (
            <button
              id="btn-open-api-key-modal"
              type="button"
              onClick={onOpenApiKeyModal}
              title={`Gemini Engine: ${activeModel}. Click to configure API Key or switch models.`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition active:scale-95 min-h-[40px] ${
                hasCustomApiKey
                  ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40"
                  : "bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border-neutral-700/80"
              }`}
            >
              <Key className={`w-3.5 h-3.5 ${hasCustomApiKey ? "text-amber-400" : "text-neutral-400"}`} />
              <span className="hidden sm:inline">{hasCustomApiKey ? "AI Engine" : "AI Settings"}</span>
              <span className="hidden xl:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-750 text-neutral-400">
                {activeModel.replace("gemini-", "").replace("-preview", "")}
              </span>
              {hasCustomApiKey && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>
          )}

          {onDownloadColorPack && (
            <button
              id="btn-quick-download-color-pack"
              onClick={onDownloadColorPack}
              disabled={glyphCount === 0}
              title="Download Cultural Color Asset Pack (ZIP)"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-850 hover:bg-neutral-800 active:scale-95 text-amber-300 border border-amber-500/30 transition disabled:opacity-40 min-h-[40px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cultural ZIP</span>
            </button>
          )}

          <button
            id="btn-quick-generate-font"
            onClick={onGenerateFont}
            disabled={isGenerating || glyphCount === 0}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-neutral-200 border border-neutral-700 transition min-h-[40px]"
          >
            {isGenerating ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{isGenerating ? "Building..." : "Build Font"}</span>
          </button>

          <button
            id="btn-quick-download-ttf"
            onClick={onDownloadFont}
            disabled={!hasCompiledFont}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download .TTF</span>
            <span className="sm:hidden">.TTF</span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Responsive Tab Bar (always visible on screens below lg) */}
      <div className="lg:hidden border-t border-neutral-800 bg-neutral-950/90 px-2 sm:px-4 py-1.5 overflow-x-auto scrollbar-none flex items-center justify-between sm:justify-start gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all min-h-[44px] ${
                isActive
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850"
              }`}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.stepNum}. {tab.shortLabel}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-neutral-950/20 text-neutral-950" : "bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
