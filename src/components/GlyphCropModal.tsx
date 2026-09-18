import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Scissors,
  Split,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  ArrowUpDown,
  Move,
  Layers,
  Sliders,
  Maximize2,
} from "lucide-react";
import { BoundingBox, DetectedGlyph } from "../types";
import {
  createGlyphFromCrop,
  cropCanvasToDataUrl,
  getCharacterCasing,
  splitGlyphBbox,
  toggleCharacterCase,
} from "../utils/glyphUtils";

interface GlyphCropModalProps {
  isOpen: boolean;
  glyph: DetectedGlyph | null;
  glyphIndex: number;
  totalGlyphs: number;
  cleanedCanvas: HTMLCanvasElement | null;
  colorCanvas: HTMLCanvasElement | null;
  sourceCanvas: HTMLCanvasElement | HTMLImageElement | null;
  binaryMask: Uint8Array | null;
  maskWidth: number;
  maskHeight: number;
  smoothing: number;
  onSaveGlyph: (updated: DetectedGlyph) => void;
  onSplitGlyph: (originalId: string, leftGlyph: DetectedGlyph, rightGlyph: DetectedGlyph) => void;
  onNextGlyph?: () => void;
  onPrevGlyph?: () => void;
  onClose: () => void;
}

export const GlyphCropModal: React.FC<GlyphCropModalProps> = ({
  isOpen,
  glyph,
  glyphIndex,
  totalGlyphs,
  cleanedCanvas,
  colorCanvas,
  sourceCanvas,
  binaryMask,
  maskWidth,
  maskHeight,
  smoothing,
  onSaveGlyph,
  onSplitGlyph,
  onNextGlyph,
  onPrevGlyph,
  onClose,
}) => {
  // Working bounding box state
  const [currentBbox, setCurrentBbox] = useState<BoundingBox>({
    x: 0,
    y: 0,
    width: 50,
    height: 50,
  });
  const [charInput, setCharInput] = useState<string>("");

  // Mode: "crop" or "split"
  const [activeMode, setActiveMode] = useState<"crop" | "split">("crop");

  // Split tool state
  const [splitRatio, setSplitRatio] = useState<number>(0.5);
  const [leftCharInput, setLeftCharInput] = useState<string>("");
  const [rightCharInput, setRightCharInput] = useState<string>("");

  // Canvas Viewport references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<"move" | "left" | "right" | "top" | "bottom" | "draw" | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartBbox, setDragStartBbox] = useState<BoundingBox>({ x: 0, y: 0, width: 0, height: 0 });

  // AI Classification state
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  // Live preview data URLs
  const [previewMonoUrl, setPreviewMonoUrl] = useState<string>("");
  const [previewColorUrl, setPreviewColorUrl] = useState<string>("");

  // Initialize from glyph prop
  useEffect(() => {
    if (glyph) {
      setCurrentBbox({ ...glyph.bbox });
      setCharInput(glyph.char);
      setLeftCharInput(glyph.char);
      setRightCharInput(glyph.char.toLowerCase() !== glyph.char ? glyph.char.toLowerCase() : "");
      setSplitRatio(0.5);
      setAiRationale(null);
    }
  }, [glyph]);

  // Update live preview whenever currentBbox changes
  useEffect(() => {
    if (!cleanedCanvas || currentBbox.width <= 0 || currentBbox.height <= 0) return;
    const monoUrl = cropCanvasToDataUrl(cleanedCanvas, currentBbox, 4);
    setPreviewMonoUrl(monoUrl);

    if (colorCanvas) {
      const colUrl = cropCanvasToDataUrl(colorCanvas, currentBbox, 4);
      setPreviewColorUrl(colUrl);
    }
  }, [currentBbox, cleanedCanvas, colorCanvas]);

  // Context view calculation: show original image around the glyph with margin
  const contextMargin = 70;
  const viewX = Math.max(0, currentBbox.x - contextMargin);
  const viewY = Math.max(0, currentBbox.y - contextMargin);
  const viewW = Math.min(
    (maskWidth || 1200) - viewX,
    currentBbox.width + contextMargin * 2
  );
  const viewH = Math.min(
    (maskHeight || 800) - viewY,
    currentBbox.height + contextMargin * 2
  );

  // Render context canvas with bounding box overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceCanvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = Math.max(200, viewW);
    canvas.height = Math.max(200, viewH);

    // 1. Draw contextual slice of original sheet
    ctx.fillStyle = "#1e1e24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      sourceCanvas,
      viewX,
      viewY,
      viewW,
      viewH,
      0,
      0,
      viewW,
      viewH
    );

    // 2. Draw semi-transparent shroud outside current bounding box
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    // Top
    const localX = currentBbox.x - viewX;
    const localY = currentBbox.y - viewY;
    const localW = currentBbox.width;
    const localH = currentBbox.height;

    ctx.fillRect(0, 0, canvas.width, Math.max(0, localY));
    // Bottom
    ctx.fillRect(0, localY + localH, canvas.width, canvas.height - (localY + localH));
    // Left
    ctx.fillRect(0, localY, Math.max(0, localX), localH);
    // Right
    ctx.fillRect(localX + localW, localY, canvas.width - (localX + localW), localH);

    // 3. Draw Bounding Box outline
    ctx.lineWidth = 2;
    ctx.strokeStyle = activeMode === "split" ? "#38bdf8" : "#f59e0b"; // Sky blue in split mode, Amber in crop mode
    ctx.strokeRect(localX, localY, localW, localH);

    // 4. Draw Corner & Edge grab handles (in crop mode)
    if (activeMode === "crop") {
      ctx.fillStyle = "#f59e0b";
      const handleSize = 7;
      const hs = handleSize / 2;

      // Corners
      ctx.fillRect(localX - hs, localY - hs, handleSize, handleSize);
      ctx.fillRect(localX + localW - hs, localY - hs, handleSize, handleSize);
      ctx.fillRect(localX - hs, localY + localH - hs, handleSize, handleSize);
      ctx.fillRect(localX + localW - hs, localY + localH - hs, handleSize, handleSize);

      // Edge centers
      ctx.fillRect(localX + localW / 2 - hs, localY - hs, handleSize, handleSize);
      ctx.fillRect(localX + localW / 2 - hs, localY + localH - hs, handleSize, handleSize);
      ctx.fillRect(localX - hs, localY + localH / 2 - hs, handleSize, handleSize);
      ctx.fillRect(localX + localW - hs, localY + localH / 2 - hs, handleSize, handleSize);
    }

    // 5. Draw Split line in split mode
    if (activeMode === "split") {
      const splitPx = localX + localW * splitRatio;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ef4444"; // Red split line
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(splitPx, localY - 6);
      ctx.lineTo(splitPx, localY + localH + 6);
      ctx.stroke();
      ctx.setLineDash([]);

      // Split handle pills
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(splitPx, localY - 6, 6, 0, Math.PI * 2);
      ctx.arc(splitPx, localY + localH + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [sourceCanvas, currentBbox, viewX, viewY, viewW, viewH, activeMode, splitRatio]);

  // Nudge / Trim functions
  const nudge = (edge: "left" | "right" | "top" | "bottom", delta: number) => {
    setCurrentBbox((prev) => {
      let { x, y, width, height } = prev;
      if (edge === "left") {
        x += delta;
        width -= delta;
      } else if (edge === "right") {
        width += delta;
      } else if (edge === "top") {
        y += delta;
        height -= delta;
      } else if (edge === "bottom") {
        height += delta;
      }
      return {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(6, width),
        height: Math.max(6, height),
      };
    });
  };

  // Canvas Mouse Interactions for Dragging / Resizing / Drawing
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientCanvasX = (e.clientX - rect.left) * scaleX;
    const clientCanvasY = (e.clientY - rect.top) * scaleY;

    // Convert to full sheet coordinates
    const sheetX = clientCanvasX + viewX;
    const sheetY = clientCanvasY + viewY;

    setIsDragging(true);
    setDragStartPos({ x: sheetX, y: sheetY });
    setDragStartBbox({ ...currentBbox });

    if (activeMode === "split") {
      // In split mode, click places the split line
      const relX = (sheetX - currentBbox.x) / currentBbox.width;
      setSplitRatio(Math.max(0.1, Math.min(0.9, relX)));
      return;
    }

    // Determine if clicking on an edge handle
    const edgeThreshold = 10;
    const localX = currentBbox.x;
    const localY = currentBbox.y;
    const localR = currentBbox.x + currentBbox.width;
    const localB = currentBbox.y + currentBbox.height;

    const nearLeft = Math.abs(sheetX - localX) < edgeThreshold;
    const nearRight = Math.abs(sheetX - localR) < edgeThreshold;
    const nearTop = Math.abs(sheetY - localY) < edgeThreshold;
    const nearBottom = Math.abs(sheetY - localB) < edgeThreshold;

    if (nearLeft) setDragHandle("left");
    else if (nearRight) setDragHandle("right");
    else if (nearTop) setDragHandle("top");
    else if (nearBottom) setDragHandle("bottom");
    else if (
      sheetX > localX &&
      sheetX < localR &&
      sheetY > localY &&
      sheetY < localB
    ) {
      setDragHandle("move");
    } else {
      // Draw fresh box from this click point
      setDragHandle("draw");
      setCurrentBbox({
        x: Math.round(sheetX),
        y: Math.round(sheetY),
        width: 10,
        height: 10,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const sheetX = (e.clientX - rect.left) * scaleX + viewX;
    const sheetY = (e.clientY - rect.top) * scaleY + viewY;

    if (activeMode === "split") {
      const relX = (sheetX - currentBbox.x) / currentBbox.width;
      setSplitRatio(Math.max(0.08, Math.min(0.92, relX)));
      return;
    }

    const dx = Math.round(sheetX - dragStartPos.x);
    const dy = Math.round(sheetY - dragStartPos.y);

    if (dragHandle === "draw") {
      const x1 = Math.min(dragStartPos.x, sheetX);
      const y1 = Math.min(dragStartPos.y, sheetY);
      const x2 = Math.max(dragStartPos.x, sheetX);
      const y2 = Math.max(dragStartPos.y, sheetY);
      setCurrentBbox({
        x: Math.max(0, Math.round(x1)),
        y: Math.max(0, Math.round(y1)),
        width: Math.max(6, Math.round(x2 - x1)),
        height: Math.max(6, Math.round(y2 - y1)),
      });
    } else if (dragHandle === "move") {
      setCurrentBbox({
        ...dragStartBbox,
        x: Math.max(0, dragStartBbox.x + dx),
        y: Math.max(0, dragStartBbox.y + dy),
      });
    } else if (dragHandle === "left") {
      const newWidth = Math.max(6, dragStartBbox.width - dx);
      setCurrentBbox({
        ...dragStartBbox,
        x: dragStartBbox.x + dx,
        width: newWidth,
      });
    } else if (dragHandle === "right") {
      setCurrentBbox({
        ...dragStartBbox,
        width: Math.max(6, dragStartBbox.width + dx),
      });
    } else if (dragHandle === "top") {
      const newHeight = Math.max(6, dragStartBbox.height - dy);
      setCurrentBbox({
        ...dragStartBbox,
        y: dragStartBbox.y + dy,
        height: newHeight,
      });
    } else if (dragHandle === "bottom") {
      setCurrentBbox({
        ...dragStartBbox,
        height: Math.max(6, dragStartBbox.height + dy),
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  // AI Single Glyph Classifier Call
  const handleAiClassify = async () => {
    if (!previewMonoUrl) return;
    setIsClassifying(true);
    setAiRationale(null);
    try {
      const res = await fetch("/api/ai/classify-glyph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: previewMonoUrl,
          mimeType: "image/png",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI classification failed");
      if (data.char) {
        setCharInput(data.char);
        setAiRationale(
          `${data.casing ? `[${data.casing.toUpperCase()}]` : ""} "${data.char}" — ${data.rationale || "Identified visually"}`
        );
      }
    } catch (err: any) {
      setAiRationale(`Classification error: ${err.message}`);
    } finally {
      setIsClassifying(false);
    }
  };

  // Save current crop
  const handleSave = () => {
    if (!glyph || !cleanedCanvas || !binaryMask) return;

    const updated = createGlyphFromCrop(
      currentBbox,
      charInput || glyph.char,
      cleanedCanvas,
      colorCanvas,
      binaryMask,
      maskWidth,
      maskHeight,
      smoothing,
      glyph.id
    );

    onSaveGlyph(updated);
    onClose();
  };

  // Confirm Split into 2 Glyphs
  const handleConfirmSplit = () => {
    if (!glyph || !cleanedCanvas || !binaryMask) return;

    const { leftBbox, rightBbox } = splitGlyphBbox(currentBbox, splitRatio);

    const leftGlyph = createGlyphFromCrop(
      leftBbox,
      leftCharInput || glyph.char,
      cleanedCanvas,
      colorCanvas,
      binaryMask,
      maskWidth,
      maskHeight,
      smoothing
    );

    const rightGlyph = createGlyphFromCrop(
      rightBbox,
      rightCharInput || "?",
      cleanedCanvas,
      colorCanvas,
      binaryMask,
      maskWidth,
      maskHeight,
      smoothing
    );

    onSplitGlyph(glyph.id, leftGlyph, rightGlyph);
    onClose();
  };

  if (!isOpen || !glyph) return null;

  const currentCasing = getCharacterCasing(charInput || glyph.char);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-100">
                  Manual Cutout & Crop Editor
                </h3>
                <span className="text-xs font-mono text-neutral-400">
                  ({glyphIndex + 1} of {totalGlyphs})
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    currentCasing === "upper"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : currentCasing === "lower"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : currentCasing === "digit"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {currentCasing.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Trim edges to remove neighbor letters that slipped in, or split fused characters into two.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next glyph navigation */}
            {onPrevGlyph && (
              <button
                onClick={onPrevGlyph}
                disabled={glyphIndex <= 0}
                title="Previous Glyph (Left Arrow)"
                className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {onNextGlyph && (
              <button
                onClick={onNextGlyph}
                disabled={glyphIndex >= totalGlyphs - 1}
                title="Next Glyph (Right Arrow)"
                className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-neutral-800/80 bg-neutral-900/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode("crop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeMode === "crop"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "bg-neutral-800/70 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Adjust Crop & Trim Edges</span>
            </button>
            <button
              onClick={() => setActiveMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeMode === "split"
                  ? "bg-sky-500 text-neutral-950 shadow-sm"
                  : "bg-neutral-800/70 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split into 2 Glyphs (Fused Letters)</span>
            </button>
          </div>

          <div className="text-xs text-neutral-400 font-mono hidden sm:block">
            Bounds: {currentBbox.width}×{currentBbox.height}px @ ({currentBbox.x}, {currentBbox.y})
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive Canvas Viewport (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5 font-medium text-neutral-300">
                  <Move className="w-3.5 h-3.5 text-amber-400" />
                  {activeMode === "crop"
                    ? "Drag handles to trim edges, or drag inside to move"
                    : "Drag or click the red vertical line to set split point"}
                </span>
                <span className="font-mono text-neutral-500">
                  Context Slice
                </span>
              </div>

              <div className="p-3 flex items-center justify-center min-h-[260px] max-h-[360px] overflow-hidden select-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className="max-w-full max-h-[320px] object-contain cursor-crosshair rounded border border-neutral-800 shadow"
                />
              </div>
            </div>

            {/* Precision Edge Trimming Bar (Crop Mode) */}
            {activeMode === "crop" ? (
              <div className="bg-neutral-850 border border-neutral-800 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-300 font-semibold mb-1">
                  <span>Quick Edge Trimming (Remove Neighbor Bleed)</span>
                  <button
                    onClick={() => setCurrentBbox({ ...glyph.bbox })}
                    className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Box</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Left edge trim */}
                  <div className="bg-neutral-900/90 border border-neutral-800 p-2 rounded-xl text-center space-y-1">
                    <span className="text-[11px] text-neutral-400 font-medium block">Left Edge</span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => nudge("left", 5)}
                        title="Trim left edge inwards 5px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-mono text-[10px]"
                      >
                        +5px
                      </button>
                      <button
                        onClick={() => nudge("left", 1)}
                        title="Trim left edge inwards 1px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px]"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => nudge("left", -1)}
                        title="Expand left edge outward 1px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-[10px]"
                      >
                        -1
                      </button>
                    </div>
                  </div>

                  {/* Right edge trim */}
                  <div className="bg-neutral-900/90 border border-neutral-800 p-2 rounded-xl text-center space-y-1">
                    <span className="text-[11px] text-neutral-400 font-medium block">Right Edge</span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => nudge("right", -5)}
                        title="Trim right edge inwards 5px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-mono text-[10px]"
                      >
                        -5px
                      </button>
                      <button
                        onClick={() => nudge("right", -1)}
                        title="Trim right edge inwards 1px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px]"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => nudge("right", 1)}
                        title="Expand right edge outward 1px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-[10px]"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* Top edge trim */}
                  <div className="bg-neutral-900/90 border border-neutral-800 p-2 rounded-xl text-center space-y-1">
                    <span className="text-[11px] text-neutral-400 font-medium block">Top Edge</span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => nudge("top", 3)}
                        title="Trim top edge inwards 3px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px]"
                      >
                        +3px
                      </button>
                      <button
                        onClick={() => nudge("top", -3)}
                        title="Expand top outward 3px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-[10px]"
                      >
                        -3px
                      </button>
                    </div>
                  </div>

                  {/* Bottom edge trim */}
                  <div className="bg-neutral-900/90 border border-neutral-800 p-2 rounded-xl text-center space-y-1">
                    <span className="text-[11px] text-neutral-400 font-medium block">Bottom Edge</span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => nudge("bottom", -3)}
                        title="Trim bottom edge inwards 3px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px]"
                      >
                        -3px
                      </button>
                      <button
                        onClick={() => nudge("bottom", 3)}
                        title="Expand bottom outward 3px"
                        className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-[10px]"
                      >
                        +3px
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Split Mode Controls */
              <div className="bg-neutral-850 border border-sky-500/30 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between text-neutral-200 font-semibold">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <Split className="w-4 h-4" />
                    <span>Split Position Slider</span>
                  </span>
                  <span className="font-mono text-neutral-400">
                    {Math.round(splitRatio * 100)}% Left / {Math.round((1 - splitRatio) * 100)}% Right
                  </span>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.01"
                  value={splitRatio}
                  onChange={(e) => setSplitRatio(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 bg-neutral-700 rounded-lg h-2 cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 text-center">
                    <span className="text-[11px] text-neutral-400 block mb-1">Left Glyph Tag</span>
                    <input
                      type="text"
                      maxLength={1}
                      value={leftCharInput}
                      onChange={(e) => setLeftCharInput(e.target.value)}
                      placeholder="A"
                      className="w-12 h-9 text-center text-base font-bold bg-neutral-800 text-sky-300 rounded-lg border border-sky-500/40 outline-none focus:ring-2 focus:ring-sky-400 mx-auto"
                    />
                  </div>
                  <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 text-center">
                    <span className="text-[11px] text-neutral-400 block mb-1">Right Glyph Tag</span>
                    <input
                      type="text"
                      maxLength={1}
                      value={rightCharInput}
                      onChange={(e) => setRightCharInput(e.target.value)}
                      placeholder="B"
                      className="w-12 h-9 text-center text-base font-bold bg-neutral-800 text-sky-300 rounded-lg border border-sky-500/40 outline-none focus:ring-2 focus:ring-sky-400 mx-auto"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Character Identification, Casing & Previews (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Character & Casing Assignment */}
            <div className="bg-neutral-850 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Character & Casing
                </span>
                <button
                  type="button"
                  onClick={() => setCharInput(toggleCharacterCase(charInput))}
                  title="Toggle Upper/Lower Case"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 transition"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Toggle Case (a ⇄ A)</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    id="input-edit-glyph-char"
                    type="text"
                    maxLength={1}
                    value={charInput}
                    onChange={(e) => setCharInput(e.target.value)}
                    className="w-16 h-16 text-center text-2xl font-bold font-mono bg-neutral-900 text-amber-300 rounded-2xl border-2 border-amber-500/50 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 shadow-inner"
                  />
                </div>

                <div className="space-y-1 text-xs text-neutral-300">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>Casing:</span>
                    <span className="font-bold text-amber-400 capitalize">{currentCasing}</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Type a letter (e.g. <code className="text-amber-300 font-mono">a</code> or <code className="text-amber-300 font-mono">A</code>), digit (<code className="text-amber-300 font-mono">0-9</code>), or symbol.
                  </p>
                </div>
              </div>

              {/* AI Precision Character & Casing Scanner */}
              <div className="pt-3 border-t border-neutral-800 space-y-2">
                <button
                  onClick={handleAiClassify}
                  disabled={isClassifying}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 active:scale-95 transition disabled:opacity-50"
                >
                  {isClassifying ? (
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{isClassifying ? "Scanning Casing & Letter with AI..." : "AI Detect Character & Case"}</span>
                </button>

                {aiRationale && (
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-amber-500/30 text-xs text-amber-300 animate-in fade-in">
                    {aiRationale}
                  </div>
                )}
              </div>
            </div>

            {/* Live Cutout Previews: Cultural Color & Monochrome Vector */}
            <div className="bg-neutral-850 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                Resulting Cutout Preview
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* Cultural Color Cutout */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center space-y-2">
                  <span className="text-[11px] font-semibold text-neutral-400 block">
                    Cultural Color
                  </span>
                  <div
                    className="w-20 h-20 mx-auto rounded-lg flex items-center justify-center overflow-hidden border border-neutral-800"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #18181f 25%, transparent 25%),
                        linear-gradient(-45deg, #18181f 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #18181f 75%),
                        linear-gradient(-45deg, transparent 75%, #18181f 75%)
                      `,
                      backgroundSize: "8px 8px",
                      backgroundColor: "#0c0c10",
                    }}
                  >
                    {previewColorUrl ? (
                      <img
                        src={previewColorUrl}
                        alt="Color cutout preview"
                        className="max-h-16 max-w-16 object-contain"
                      />
                    ) : (
                      <span className="text-xs text-neutral-600">None</span>
                    )}
                  </div>
                </div>

                {/* Monochrome Vector Cutout */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center space-y-2">
                  <span className="text-[11px] font-semibold text-neutral-400 block">
                    Monochrome TTF
                  </span>
                  <div
                    className="w-20 h-20 mx-auto rounded-lg flex items-center justify-center overflow-hidden border border-neutral-800"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #18181f 25%, transparent 25%),
                        linear-gradient(-45deg, #18181f 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #18181f 75%),
                        linear-gradient(-45deg, transparent 75%, #18181f 75%)
                      `,
                      backgroundSize: "8px 8px",
                      backgroundColor: "#0c0c10",
                    }}
                  >
                    {previewMonoUrl ? (
                      <img
                        src={previewMonoUrl}
                        alt="Monochrome preview"
                        className="max-h-16 max-w-16 object-contain filter invert contrast-125"
                      />
                    ) : (
                      <span className="text-xs text-neutral-600">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeMode === "split" ? (
              <button
                id="btn-confirm-split-glyph"
                onClick={handleConfirmSplit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-neutral-950 active:scale-95 shadow-md shadow-sky-500/20 transition"
              >
                <Split className="w-4 h-4" />
                <span>Split into 2 Glyphs</span>
              </button>
            ) : (
              <button
                id="btn-save-glyph-crop"
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 active:scale-95 shadow-md shadow-amber-500/20 transition"
              >
                <Check className="w-4 h-4" />
                <span>Save Crop & Update Glyph</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
