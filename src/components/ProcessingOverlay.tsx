import React from "react";
import { Sparkles, CheckCircle2, Layers, Cpu, Compass, FileText } from "lucide-react";
import { AppLogo } from "./AppLogo";

export interface ProcessingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: ProcessingStep[] = [
  {
    id: "read",
    label: "Reading Image File",
    description: "Loading high-resolution pixels into browser memory...",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: "background",
    label: "Background Removal & Ink Isolation",
    description: "Filtering background noise, shadows, and binarizing ink strokes...",
    icon: <Layers className="w-4 h-4" />,
  },
  {
    id: "segment",
    label: "Glyph Discovery & Clustering",
    description: "Discovering characters and unifying multi-part accents...",
    icon: <Compass className="w-4 h-4" />,
  },
  {
    id: "vectorize",
    label: "Vector Contour Tracing",
    description: "Converting pixel silhouettes into scalable cubic Bézier curves...",
    icon: <Cpu className="w-4 h-4" />,
  },
  {
    id: "compile",
    label: "Font Compilation & Standards",
    description: "Generating TrueType OpenType tables and preparing previews...",
    icon: <Sparkles className="w-4 h-4" />,
  },
];

interface ProcessingOverlayProps {
  isOpen: boolean;
  stage: string;
  progress: number;
  fileName?: string;
  currentStepIndex: number;
  detectedCount?: number;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isOpen,
  stage,
  progress,
  fileName,
  currentStepIndex,
  detectedCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-750 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header with App Logo & Pulsing Glow */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <AppLogo size={52} className="relative z-10" />
            <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-lg animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-lg text-neutral-100 truncate">
                Processing Character Sheet
              </h3>
              <span className="font-mono text-sm font-bold text-amber-400 shrink-0">
                {Math.round(progress)}%
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {fileName ? `File: ${fileName}` : "Analyzing image typography..."}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-750">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-amber-500/50"
              style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-neutral-400 font-medium">
            <span className="text-amber-300 font-semibold">{stage}</span>
            {detectedCount !== undefined && detectedCount > 0 && (
              <span className="text-neutral-300 font-mono">
                {detectedCount} characters found
              </span>
            )}
          </div>
        </div>

        {/* Workflow Steps Checklist */}
        <div className="space-y-2.5 pt-2 border-t border-neutral-800/80">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-2.5 rounded-2xl transition-all ${
                  isCurrent
                    ? "bg-amber-500/10 border border-amber-500/30"
                    : isCompleted
                    ? "bg-neutral-850/50 border border-transparent opacity-80"
                    : "opacity-40 border border-transparent"
                }`}
              >
                <div
                  className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : isCurrent
                      ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/30 animate-pulse"
                      : "bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "text-amber-300"
                          : isCompleted
                          ? "text-neutral-200"
                          : "text-neutral-400"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                        In Progress
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="text-center pt-1 text-[11px] text-neutral-500">
          Processing runs entirely in your browser using local web workers and HTML5 canvas.
        </div>
      </div>
    </div>
  );
};
