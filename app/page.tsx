"use client";

import dynamic from "next/dynamic";
import React from "react";

// Client-side only dynamic import for canvas, font rendering and Web APIs
const StudioApp = dynamic(() => import("../src/App"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
        <span className="text-2xl font-bold font-serif">A</span>
      </div>
      <h2 className="text-lg font-bold text-neutral-200 mb-1">Image to Font Studio</h2>
      <p className="text-xs text-neutral-400">Loading typography engine &amp; canvas workspace...</p>
    </div>
  ),
});

export default function Page() {
  return <StudioApp />;
}
