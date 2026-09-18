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
  Eraser,
  PenTool,
  Wand2,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Scan,
  ShieldCheck,
  CircleDot,
  MousePointer,
  Crop,
  AlertCircle,
  Zap,
} from "lucide-react";
import { BoundingBox, DetectedGlyph, Point } from "../types";
import {
  createGlyphFromCrop,
  cropCanvasToDataUrl,
  getCharacterCasing,
  splitGlyphBbox,
  toggleCharacterCase,
} from "../utils/glyphUtils";
import { extractGlyphContoursFromLocalMask, contoursToSvgPath } from "../utils/vectorizer";
import { getAiRequestHeaders } from "../utils/aiClient";

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

type EditorTool = "select-crop" | "eraser" | "pen" | "magic-island" | "lasso-cutout" | "lasso-keep";
type DragHandleType =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "move"
  | "draw"
  | "pan"
  | null;

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
  // Main Tab Mode: "crop" (8-handle resizer) | "cutout" (Eraser, Lasso, Magic Island) | "split"
  const [activeTab, setActiveTab] = useState<"crop" | "cutout" | "split">("crop");
  const [currentTool, setCurrentTool] = useState<EditorTool>("select-crop");

  // Working Bounding Box
  const [currentBbox, setCurrentBbox] = useState<BoundingBox>({
    x: 0,
    y: 0,
    width: 50,
    height: 50,
  });
  const [charInput, setCharInput] = useState<string>("");

  // Local Editable Binary Mask and Rendered Canvases for the isolated glyph
  const [localMask, setLocalMask] = useState<Uint8Array | null>(null);
  const [localMaskDims, setLocalMaskDims] = useState<{ width: number; height: number }>({
    width: 50,
    height: 50,
  });

  // History stack for Undo / Redo
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Brush settings for Eraser / Pen
  const [brushRadius, setBrushRadius] = useState<number>(4);

  // Lasso points
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState<boolean>(false);

  // Canvas Viewport Zoom and Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1.5);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Split tool state
  const [splitRatio, setSplitRatio] = useState<number>(0.5);
  const [leftCharInput, setLeftCharInput] = useState<string>("");
  const [rightCharInput, setRightCharInput] = useState<string>("");

  // Canvas references and mouse dragging state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandleType>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartBbox, setDragStartBbox] = useState<BoundingBox>({ x: 0, y: 0, width: 0, height: 0 });
  const [mouseCursor, setMouseCursor] = useState<string>("default");

  // AI Classification state
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  // Status message for automatic actions (e.g. "Isolated main stroke, removed 2 neighbor fragments")
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Vector Contours & Live Previews
  const [currentContours, setCurrentContours] = useState<Point[][]>([]);
  const [previewMonoUrl, setPreviewMonoUrl] = useState<string>("");
  const [previewColorUrl, setPreviewColorUrl] = useState<string>("");
  const [showContoursOverlay, setShowContoursOverlay] = useState<boolean>(true);

  // Helper: Extract local mask slice from global binaryMask
  const extractLocalMaskFromGlobal = useCallback(
    (bbox: BoundingBox): Uint8Array => {
      const w = Math.max(1, Math.round(bbox.width));
      const h = Math.max(1, Math.round(bbox.height));
      const mask = new Uint8Array(w * h);

      if (binaryMask && maskWidth > 0 && maskHeight > 0) {
        for (let ly = 0; ly < h; ly++) {
          const gy = Math.round(bbox.y + ly);
          if (gy < 0 || gy >= maskHeight) continue;
          for (let lx = 0; lx < w; lx++) {
            const gx = Math.round(bbox.x + lx);
            if (gx < 0 || gx >= maskWidth) continue;
            mask[ly * w + lx] = binaryMask[gy * maskWidth + gx];
          }
        }
      }
      return mask;
    },
    [binaryMask, maskWidth, maskHeight]
  );

  // Helper to push history state
  const pushHistoryState = (newMask: Uint8Array) => {
    const copy = new Uint8Array(newMask);
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(copy);
      if (next.length > 25) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(24, prev + 1));
  };

  // Initialize from glyph prop
  useEffect(() => {
    if (glyph) {
      setCurrentBbox({ ...glyph.bbox });
      setCharInput(glyph.char);
      setLeftCharInput(glyph.char);
      setRightCharInput(glyph.char.toLowerCase() !== glyph.char ? glyph.char.toLowerCase() : "");
      setSplitRatio(0.5);
      setAiRationale(null);
      setActionFeedback(null);
      setLassoPoints([]);
      setZoomLevel(1.5);
      setPanOffset({ x: 0, y: 0 });

      const initialMask = extractLocalMaskFromGlobal(glyph.bbox);
      setLocalMask(initialMask);
      setLocalMaskDims({ width: glyph.bbox.width, height: glyph.bbox.height });
      setHistory([new Uint8Array(initialMask)]);
      setHistoryIndex(0);
    }
  }, [glyph, extractLocalMaskFromGlobal]);

  // When currentBbox changes in crop mode, re-extract local mask if dimensions changed
  const updateBboxAndMask = (newBbox: BoundingBox) => {
    setCurrentBbox(newBbox);
    const newMask = extractLocalMaskFromGlobal(newBbox);
    setLocalMask(newMask);
    setLocalMaskDims({ width: newBbox.width, height: newBbox.height });
    pushHistoryState(newMask);
  };

  // Update Vector Contours & Previews whenever localMask or currentBbox changes
  useEffect(() => {
    if (!localMask || localMaskDims.width <= 0 || localMaskDims.height <= 0) return;

    // 1. Calculate Vector Contours
    const contours = extractGlyphContoursFromLocalMask(
      localMask,
      localMaskDims.width,
      localMaskDims.height,
      smoothing
    );
    setCurrentContours(contours);

    // 2. Generate Monochrome Cutout Canvas
    const pad = 4;
    const cw = localMaskDims.width + pad * 2;
    const ch = localMaskDims.height + pad * 2;
    const monoCanvas = document.createElement("canvas");
    monoCanvas.width = cw;
    monoCanvas.height = ch;
    const mCtx = monoCanvas.getContext("2d");
    if (mCtx) {
      mCtx.fillStyle = "#ffffff";
      mCtx.fillRect(0, 0, cw, ch);
      mCtx.fillStyle = "#000000";

      const imgData = mCtx.createImageData(cw, ch);
      // fill with white
      for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = 255;
        imgData.data[i + 1] = 255;
        imgData.data[i + 2] = 255;
        imgData.data[i + 3] = 255;
      }
      // set black pixels where mask is 1
      for (let y = 0; y < localMaskDims.height; y++) {
        for (let x = 0; x < localMaskDims.width; x++) {
          if (localMask[y * localMaskDims.width + x] === 1) {
            const idx = ((y + pad) * cw + (x + pad)) * 4;
            imgData.data[idx] = 0;
            imgData.data[idx + 1] = 0;
            imgData.data[idx + 2] = 0;
            imgData.data[idx + 3] = 255;
          }
        }
      }
      mCtx.putImageData(imgData, 0, 0);
      setPreviewMonoUrl(monoCanvas.toDataURL("image/png"));
    }

    // 3. Generate Color Cutout Canvas (mask applied onto colorCanvas)
    if (colorCanvas) {
      const colCanvas = document.createElement("canvas");
      colCanvas.width = cw;
      colCanvas.height = ch;
      const cCtx = colCanvas.getContext("2d");
      if (cCtx) {
        // Draw underlying color crop
        const sx = Math.max(0, Math.min(colorCanvas.width - 1, currentBbox.x));
        const sy = Math.max(0, Math.min(colorCanvas.height - 1, currentBbox.y));
        const sw = Math.min(colorCanvas.width - sx, localMaskDims.width);
        const sh = Math.min(colorCanvas.height - sy, localMaskDims.height);
        cCtx.drawImage(colorCanvas, sx, sy, sw, sh, pad, pad, sw, sh);

        // Apply binary mask as alpha mask
        const imgData = cCtx.getImageData(0, 0, cw, ch);
        for (let y = 0; y < localMaskDims.height; y++) {
          for (let x = 0; x < localMaskDims.width; x++) {
            const idx = ((y + pad) * cw + (x + pad)) * 4;
            if (localMask[y * localMaskDims.width + x] === 0) {
              // mask is 0 -> make transparent
              imgData.data[idx + 3] = 0;
            }
          }
        }
        cCtx.putImageData(imgData, 0, 0);
        setPreviewColorUrl(colCanvas.toDataURL("image/png"));
      }
    }
  }, [localMask, localMaskDims, currentBbox, smoothing, colorCanvas]);

  // Undo / Redo Handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetMask = new Uint8Array(history[targetIndex]);
      setLocalMask(targetMask);
      setHistoryIndex(targetIndex);
      setActionFeedback("Action undone");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetMask = new Uint8Array(history[targetIndex]);
      setLocalMask(targetMask);
      setHistoryIndex(targetIndex);
      setActionFeedback("Action redone");
    }
  };

  // AUTOMATIC FIX 1: Auto-Isolate Main Connected Component (Removes Neighbor Intruder Ink)
  const handleAutoIsolateMainStroke = () => {
    if (!localMask) return;
    const w = localMaskDims.width;
    const h = localMaskDims.height;
    const visited = new Uint8Array(w * h);

    // Find all connected components
    const components: { points: number[]; size: number; centerX: number; centerY: number }[] = [];

    const getNeighbors = (idx: number) => {
      const x = idx % w;
      const y = Math.floor(idx / w);
      const res: number[] = [];
      if (x > 0) res.push(idx - 1);
      if (x < w - 1) res.push(idx + 1);
      if (y > 0) res.push(idx - w);
      if (y < h - 1) res.push(idx + w);
      return res;
    };

    for (let i = 0; i < w * h; i++) {
      if (localMask[i] === 1 && visited[i] === 0) {
        const compPoints: number[] = [];
        const queue: number[] = [i];
        visited[i] = 1;
        let sumX = 0;
        let sumY = 0;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          compPoints.push(curr);
          sumX += curr % w;
          sumY += Math.floor(curr / w);

          for (const n of getNeighbors(curr)) {
            if (localMask[n] === 1 && visited[n] === 0) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        components.push({
          points: compPoints,
          size: compPoints.length,
          centerX: sumX / compPoints.length,
          centerY: sumY / compPoints.length,
        });
      }
    }

    if (components.length === 0) {
      setActionFeedback("No ink strokes found to isolate.");
      return;
    }

    // Sort components by size descending
    components.sort((a, b) => b.size - a.size);

    // Main glyph is either the largest component, or major components near the center
    const largestComp = components[0];
    const largestSize = largestComp.size;
    const centerBoxX = w / 2;
    const centerBoxY = h / 2;

    // Calculate bounding box of the main largest component
    let mainMinX = w;
    let mainMaxX = 0;
    let mainMinY = h;
    let mainMaxY = 0;
    for (const p of largestComp.points) {
      const px = p % w;
      const py = Math.floor(p / w);
      if (px < mainMinX) mainMinX = px;
      if (px > mainMaxX) mainMaxX = px;
      if (py < mainMinY) mainMinY = py;
      if (py > mainMaxY) mainMaxY = py;
    }

    // Keep components that are:
    // 1) The largest component itself
    // 2) Vertically stacked dots/accents/bars (e.g. dot on 'i', dot on 'j', dot on '!', dots on ':', second bar on '=')
    //    where component's center X falls within the main component's horizontal range
    // 3) Significant central components (>= 25% of largest and near center)
    const keptComponents = components.filter((c, idx) => {
      if (idx === 0) return true;

      // Check for vertically aligned dots/accents (multi-part characters like i, j, !, ?, :, ;, =)
      const isHorizontallyAlignedWithMain =
        c.centerX >= mainMinX - 8 && c.centerX <= mainMaxX + 8;
      const isVerticallyAboveOrBelow =
        c.centerY < mainMinY || c.centerY > mainMaxY;
      const isAccentOrDot = c.size >= 4 && isHorizontallyAlignedWithMain;

      if (isAccentOrDot) {
        return true;
      }

      const distToCenter = Math.hypot(c.centerX - centerBoxX, c.centerY - centerBoxY);
      return c.size >= largestSize * 0.22 && distToCenter < Math.max(w, h) * 0.45;
    });

    const newMask = new Uint8Array(w * h);
    let keptPixels = 0;
    for (const comp of keptComponents) {
      for (const p of comp.points) {
        newMask[p] = 1;
        keptPixels++;
      }
    }

    const removedCount = components.length - keptComponents.length;
    setLocalMask(newMask);
    pushHistoryState(newMask);
    setActionFeedback(
      `⚡ Auto-isolated primary glyph stroke! Discarded ${removedCount} intruding neighbor fragment${removedCount === 1 ? "" : "s"}.`
    );
  };

  // AUTOMATIC FIX 2: 1-Click Despeckle (Remove tiny disconnected specks < 15px)
  const handleDespeckle = () => {
    if (!localMask) return;
    const w = localMaskDims.width;
    const h = localMaskDims.height;
    const visited = new Uint8Array(w * h);
    const newMask = new Uint8Array(localMask);
    let speckCount = 0;

    for (let i = 0; i < w * h; i++) {
      if (newMask[i] === 1 && visited[i] === 0) {
        const queue = [i];
        const comp: number[] = [];
        visited[i] = 1;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          comp.push(curr);
          const cx = curr % w;
          const cy = Math.floor(curr / w);

          const neighbors = [
            cx > 0 ? curr - 1 : -1,
            cx < w - 1 ? curr + 1 : -1,
            cy > 0 ? curr - w : -1,
            cy < h - 1 ? curr + w : -1,
          ];

          for (const n of neighbors) {
            if (n >= 0 && newMask[n] === 1 && visited[n] === 0) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        if (comp.length < 16) {
          for (const p of comp) {
            newMask[p] = 0;
          }
          speckCount++;
        }
      }
    }

    setLocalMask(newMask);
    pushHistoryState(newMask);
    setActionFeedback(`🧹 Cleaned ${speckCount} stray dust speckle${speckCount === 1 ? "" : "s"}.`);
  };

  // AUTOMATIC FIX 3: Magic Island Eraser (Erase single connected component clicked)
  const eraseConnectedIslandAt = (localX: number, localY: number) => {
    if (!localMask) return;
    const w = localMaskDims.width;
    const h = localMaskDims.height;
    const px = Math.round(localX);
    const py = Math.round(localY);
    if (px < 0 || px >= w || py < 0 || py >= h) return;

    const startIdx = py * w + px;
    if (localMask[startIdx] !== 1) {
      // Find closest ink pixel within 5px
      let foundIdx = -1;
      let minD = 999;
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const idx = ny * w + nx;
            if (localMask[idx] === 1) {
              const d = Math.hypot(dx, dy);
              if (d < minD) {
                minD = d;
                foundIdx = idx;
              }
            }
          }
        }
      }
      if (foundIdx === -1) {
        setActionFeedback("Click directly on the intruding ink island to erase it.");
        return;
      }
    }

    const actualStart = localMask[startIdx] === 1 ? startIdx : -1;
    if (actualStart === -1) return;

    const newMask = new Uint8Array(localMask);
    const queue = [actualStart];
    newMask[actualStart] = 0;
    let erasedCount = 0;

    while (queue.length > 0) {
      const curr = queue.pop()!;
      erasedCount++;
      const cx = curr % w;
      const cy = Math.floor(curr / w);

      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx < w - 1 ? curr + 1 : -1,
        cy > 0 ? curr - w : -1,
        cy < h - 1 ? curr + w : -1,
      ];

      for (const n of neighbors) {
        if (n >= 0 && newMask[n] === 1) {
          newMask[n] = 0;
          queue.push(n);
        }
      }
    }

    setLocalMask(newMask);
    pushHistoryState(newMask);
    setActionFeedback(`🪄 Erased clicked intruder island (${erasedCount} pixels removed).`);
  };

  // MANUAL FIX: Brush Paint / Erase
  const applyBrush = (localX: number, localY: number, mode: "erase" | "draw") => {
    if (!localMask) return;
    const w = localMaskDims.width;
    const h = localMaskDims.height;
    const r = brushRadius;
    const newMask = new Uint8Array(localMask);
    let changed = false;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const nx = Math.round(localX + dx);
          const ny = Math.round(localY + dy);
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const idx = ny * w + nx;
            const targetVal = mode === "draw" ? 1 : 0;
            if (newMask[idx] !== targetVal) {
              newMask[idx] = targetVal;
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      setLocalMask(newMask);
    }
  };

  // MANUAL FIX: Lasso Cutout / Keep Application
  const applyLassoAction = (mode: "cutout-inside" | "keep-only-inside") => {
    if (!localMask || lassoPoints.length < 3) return;
    const w = localMaskDims.width;
    const h = localMaskDims.height;
    const newMask = new Uint8Array(localMask);

    // Point in polygon test (Ray-casting)
    const isPointInPoly = (px: number, py: number) => {
      let inside = false;
      for (let i = 0, j = lassoPoints.length - 1; i < lassoPoints.length; j = i++) {
        const xi = lassoPoints[i].x;
        const yi = lassoPoints[i].y;
        const xj = lassoPoints[j].x;
        const yj = lassoPoints[j].y;

        const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    let modified = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const inside = isPointInPoly(x, y);

        if (mode === "cutout-inside") {
          if (inside && newMask[idx] === 1) {
            newMask[idx] = 0;
            modified++;
          }
        } else {
          // keep-only-inside: anything outside polygon is erased
          if (!inside && newMask[idx] === 1) {
            newMask[idx] = 0;
            modified++;
          }
        }
      }
    }

    setLocalMask(newMask);
    pushHistoryState(newMask);
    setLassoPoints([]);
    setIsDrawingLasso(false);
    setActionFeedback(
      mode === "cutout-inside"
        ? `✂️ Cut out ${modified} pixels inside lasso selection.`
        : `✨ Isolated glyph inside lasso; trimmed ${modified} outer pixels.`
    );
  };

  // Auto-Trim Bounding Box tight to active ink
  const handleAutoTrimBounds = () => {
    if (!localMask) return;
    const w = localMaskDims.width;
    const h = localMaskDims.height;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (localMask[y * w + x] === 1) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX === -1) {
      setActionFeedback("No ink pixels remain to trim bounds.");
      return;
    }

    const pad = 2;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);

    const newW = maxX - minX + 1;
    const newH = maxY - minY + 1;

    // Crop the local mask to the new sub-region
    const croppedMask = new Uint8Array(newW * newH);
    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        croppedMask[y * newW + x] = localMask[(minY + y) * w + (minX + x)];
      }
    }

    const newBbox: BoundingBox = {
      x: Math.round(currentBbox.x + minX),
      y: Math.round(currentBbox.y + minY),
      width: Math.max(6, newW),
      height: Math.max(6, newH),
    };

    setCurrentBbox(newBbox);
    setLocalMask(croppedMask);
    setLocalMaskDims({ width: newW, height: newH });
    pushHistoryState(croppedMask);
    setActionFeedback(`📐 Tightened bounding box to ${newW}×${newH}px!`);
  };

  // Context Viewport Calculation
  const contextMargin = 60;
  const viewX = Math.max(0, currentBbox.x - contextMargin);
  const viewY = Math.max(0, currentBbox.y - contextMargin);
  const viewW = Math.min((maskWidth || 1200) - viewX, currentBbox.width + contextMargin * 2);
  const viewH = Math.min((maskHeight || 800) - viewY, currentBbox.height + contextMargin * 2);

  // RENDER MAIN CANVAS (Source Context, Shroud, 8-Handle Resizer, Ink/Mask overlay, Lasso, Vectors)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceCanvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const baseW = Math.max(260, viewW);
    const baseH = Math.max(260, viewH);

    canvas.width = Math.round(baseW * zoomLevel);
    canvas.height = Math.round(baseH * zoomLevel);

    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(panOffset.x, panOffset.y);

    // 1. Draw source background image slice
    ctx.fillStyle = "#121217";
    ctx.fillRect(0, 0, baseW, baseH);

    ctx.drawImage(sourceCanvas, viewX, viewY, viewW, viewH, 0, 0, viewW, viewH);

    // Coordinate mapping for local bounding box
    const localX = currentBbox.x - viewX;
    const localY = currentBbox.y - viewY;
    const localW = currentBbox.width;
    const localH = currentBbox.height;

    // 2. Draw semi-transparent shroud outside bounding box
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, baseW, Math.max(0, localY));
    ctx.fillRect(0, localY + localH, baseW, baseH - (localY + localH));
    ctx.fillRect(0, localY, Math.max(0, localX), localH);
    ctx.fillRect(localX + localW, localY, baseW - (localX + localW), localH);

    // 3. In Cutout / Eraser mode: Highlight active edited ink inside bounding box
    if (activeTab === "cutout" && localMask) {
      // Draw highlighted active ink mask overlay (emerald tint for kept strokes, red tint for erased regions)
      ctx.fillStyle = "rgba(16, 185, 129, 0.25)"; // translucent green
      for (let ly = 0; ly < localMaskDims.height; ly++) {
        for (let lx = 0; lx < localMaskDims.width; lx++) {
          if (localMask[ly * localMaskDims.width + lx] === 1) {
            ctx.fillRect(localX + lx, localY + ly, 1, 1);
          }
        }
      }
    }

    // 4. Draw Vector Contours Overlay if enabled
    if (showContoursOverlay && currentContours.length > 0) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.fillStyle = "rgba(245, 158, 11, 0.12)";

      for (const loop of currentContours) {
        if (loop.length < 3) continue;
        ctx.beginPath();
        const startX = localX + loop[0].x;
        const startY = localY + loop[0].y;
        ctx.moveTo(startX, startY);
        for (let i = 1; i < loop.length; i++) {
          ctx.lineTo(localX + loop[i].x, localY + loop[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
      }
    }

    // 5. Draw Bounding Box and 8 Grab Handles (in Crop / Cutout Mode)
    ctx.lineWidth = 2;
    ctx.strokeStyle = activeTab === "split" ? "#38bdf8" : "#f59e0b";
    ctx.strokeRect(localX, localY, localW, localH);

    if (activeTab === "crop" || (activeTab === "cutout" && currentTool === "select-crop")) {
      // 8 Grab Handles
      const hs = 8;
      const half = hs / 2;
      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;

      const handles = [
        { x: localX, y: localY }, // NW
        { x: localX + localW / 2, y: localY }, // N
        { x: localX + localW, y: localY }, // NE
        { x: localX + localW, y: localY + localH / 2 }, // E
        { x: localX + localW, y: localY + localH }, // SE
        { x: localX + localW / 2, y: localY + localH }, // S
        { x: localX, y: localY + localH }, // SW
        { x: localX, y: localY + localH / 2 }, // W
      ];

      for (const h of handles) {
        ctx.fillRect(h.x - half, h.y - half, hs, hs);
        ctx.strokeRect(h.x - half, h.y - half, hs, hs);
      }
    }

    // 6. Draw Split Guide Line in Split Mode
    if (activeTab === "split") {
      const splitPx = localX + localW * splitRatio;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ef4444";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(splitPx, localY - 8);
      ctx.lineTo(splitPx, localY + localH + 8);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(splitPx, localY - 6, 6, 0, Math.PI * 2);
      ctx.arc(splitPx, localY + localH + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Draw Active Lasso Path in Lasso Cutout Mode
    if (lassoPoints.length > 0) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(localX + lassoPoints[0].x, localY + lassoPoints[0].y);
      for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(localX + lassoPoints[i].x, localY + lassoPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw anchor nodes
      ctx.fillStyle = "#38bdf8";
      for (const pt of lassoPoints) {
        ctx.fillRect(localX + pt.x - 2, localY + pt.y - 2, 4, 4);
      }
    }

    ctx.restore();
  }, [
    sourceCanvas,
    currentBbox,
    viewX,
    viewY,
    viewW,
    viewH,
    activeTab,
    currentTool,
    splitRatio,
    zoomLevel,
    panOffset,
    localMask,
    localMaskDims,
    currentContours,
    showContoursOverlay,
    lassoPoints,
  ]);

  // Transform Mouse Event to Local Glyph & Sheet Coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { sheetX: 0, sheetY: 0, localGlyphX: 0, localGlyphY: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = (e.clientX - rect.left) / zoomLevel - panOffset.x;
    const clientY = (e.clientY - rect.top) / zoomLevel - panOffset.y;

    const sheetX = clientX + viewX;
    const sheetY = clientY + viewY;

    const localGlyphX = sheetX - currentBbox.x;
    const localGlyphY = sheetY - currentBbox.y;

    return { sheetX, sheetY, localGlyphX, localGlyphY };
  };

  // Cursor Hover Detection for 8-Handle Resizer
  const updateCursorIcon = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMouseDown) return;
    const { sheetX, sheetY } = getCanvasCoords(e);

    if (activeTab === "split") {
      setMouseCursor("col-resize");
      return;
    }

    if (activeTab === "cutout") {
      if (currentTool === "eraser") setMouseCursor("crosshair");
      else if (currentTool === "pen") setMouseCursor("crosshair");
      else if (currentTool === "magic-island") setMouseCursor("pointer");
      else if (currentTool.startsWith("lasso")) setMouseCursor("crosshair");
      else setMouseCursor("default");
      return;
    }

    // In 8-handle Crop Resizer mode
    const edgeThresh = 8 / zoomLevel;
    const bx = currentBbox.x;
    const by = currentBbox.y;
    const bw = currentBbox.width;
    const bh = currentBbox.height;
    const br = bx + bw;
    const bb = by + bh;

    const nearLeft = Math.abs(sheetX - bx) < edgeThresh;
    const nearRight = Math.abs(sheetX - br) < edgeThresh;
    const nearTop = Math.abs(sheetY - by) < edgeThresh;
    const nearBottom = Math.abs(sheetY - bb) < edgeThresh;
    const insideH = sheetX >= bx - edgeThresh && sheetX <= br + edgeThresh;
    const insideV = sheetY >= by - edgeThresh && sheetY <= bb + edgeThresh;

    if (nearTop && nearLeft) setMouseCursor("nwse-resize");
    else if (nearBottom && nearRight) setMouseCursor("nwse-resize");
    else if (nearTop && nearRight) setMouseCursor("nesw-resize");
    else if (nearBottom && nearLeft) setMouseCursor("nesw-resize");
    else if (nearTop && insideH) setMouseCursor("ns-resize");
    else if (nearBottom && insideH) setMouseCursor("ns-resize");
    else if (nearLeft && insideV) setMouseCursor("ew-resize");
    else if (nearRight && insideV) setMouseCursor("ew-resize");
    else if (sheetX > bx && sheetX < br && sheetY > by && sheetY < bb) setMouseCursor("move");
    else setMouseCursor("crosshair");
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.altKey) {
      // Middle click or Alt-drag = Pan canvas
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const { sheetX, sheetY, localGlyphX, localGlyphY } = getCanvasCoords(e);
    setIsMouseDown(true);
    setDragStartPos({ x: sheetX, y: sheetY });
    setDragStartBbox({ ...currentBbox });

    if (activeTab === "split") {
      const relX = (sheetX - currentBbox.x) / currentBbox.width;
      setSplitRatio(Math.max(0.08, Math.min(0.92, relX)));
      return;
    }

    // Cutout Tools Interaction
    if (activeTab === "cutout") {
      if (currentTool === "magic-island") {
        eraseConnectedIslandAt(localGlyphX, localGlyphY);
        return;
      }
      if (currentTool === "eraser") {
        applyBrush(localGlyphX, localGlyphY, "erase");
        return;
      }
      if (currentTool === "pen") {
        applyBrush(localGlyphX, localGlyphY, "draw");
        return;
      }
      if (currentTool.startsWith("lasso")) {
        setIsDrawingLasso(true);
        setLassoPoints([{ x: localGlyphX, y: localGlyphY }]);
        return;
      }
    }

    // 8-Handle Resizer Click Detection
    const edgeThresh = 9 / zoomLevel;
    const bx = currentBbox.x;
    const by = currentBbox.y;
    const bw = currentBbox.width;
    const bh = currentBbox.height;
    const br = bx + bw;
    const bb = by + bh;

    const nearLeft = Math.abs(sheetX - bx) < edgeThresh;
    const nearRight = Math.abs(sheetX - br) < edgeThresh;
    const nearTop = Math.abs(sheetY - by) < edgeThresh;
    const nearBottom = Math.abs(sheetY - bb) < edgeThresh;
    const insideH = sheetX >= bx - edgeThresh && sheetX <= br + edgeThresh;
    const insideV = sheetY >= by - edgeThresh && sheetY <= bb + edgeThresh;

    if (nearTop && nearLeft) setDragHandle("nw");
    else if (nearTop && nearRight) setDragHandle("ne");
    else if (nearBottom && nearLeft) setDragHandle("sw");
    else if (nearBottom && nearRight) setDragHandle("se");
    else if (nearTop && insideH) setDragHandle("n");
    else if (nearBottom && insideH) setDragHandle("s");
    else if (nearLeft && insideV) setDragHandle("w");
    else if (nearRight && insideV) setDragHandle("e");
    else if (sheetX > bx && sheetX < br && sheetY > by && sheetY < bb) {
      setDragHandle("move");
    } else {
      // Draw fresh box from scratch
      setDragHandle("draw");
      updateBboxAndMask({
        x: Math.round(sheetX),
        y: Math.round(sheetY),
        width: 10,
        height: 10,
      });
    }
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCursorIcon(e);

    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!isMouseDown) return;
    const { sheetX, sheetY, localGlyphX, localGlyphY } = getCanvasCoords(e);

    if (activeTab === "split") {
      const relX = (sheetX - currentBbox.x) / currentBbox.width;
      setSplitRatio(Math.max(0.08, Math.min(0.92, relX)));
      return;
    }

    if (activeTab === "cutout") {
      if (currentTool === "eraser") {
        applyBrush(localGlyphX, localGlyphY, "erase");
        return;
      }
      if (currentTool === "pen") {
        applyBrush(localGlyphX, localGlyphY, "draw");
        return;
      }
      if (isDrawingLasso && currentTool.startsWith("lasso")) {
        setLassoPoints((prev) => [...prev, { x: localGlyphX, y: localGlyphY }]);
        return;
      }
    }

    // 8-Handle Resizer Drag Math
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
    } else if (dragHandle === "w") {
      const newWidth = Math.max(6, dragStartBbox.width - dx);
      setCurrentBbox({
        ...dragStartBbox,
        x: dragStartBbox.x + dx,
        width: newWidth,
      });
    } else if (dragHandle === "e") {
      setCurrentBbox({
        ...dragStartBbox,
        width: Math.max(6, dragStartBbox.width + dx),
      });
    } else if (dragHandle === "n") {
      const newHeight = Math.max(6, dragStartBbox.height - dy);
      setCurrentBbox({
        ...dragStartBbox,
        y: dragStartBbox.y + dy,
        height: newHeight,
      });
    } else if (dragHandle === "s") {
      setCurrentBbox({
        ...dragStartBbox,
        height: Math.max(6, dragStartBbox.height + dy),
      });
    } else if (dragHandle === "nw") {
      setCurrentBbox({
        ...dragStartBbox,
        x: dragStartBbox.x + dx,
        y: dragStartBbox.y + dy,
        width: Math.max(6, dragStartBbox.width - dx),
        height: Math.max(6, dragStartBbox.height - dy),
      });
    } else if (dragHandle === "ne") {
      setCurrentBbox({
        ...dragStartBbox,
        y: dragStartBbox.y + dy,
        width: Math.max(6, dragStartBbox.width + dx),
        height: Math.max(6, dragStartBbox.height - dy),
      });
    } else if (dragHandle === "sw") {
      setCurrentBbox({
        ...dragStartBbox,
        x: dragStartBbox.x + dx,
        width: Math.max(6, dragStartBbox.width - dx),
        height: Math.max(6, dragStartBbox.height + dy),
      });
    } else if (dragHandle === "se") {
      setCurrentBbox({
        ...dragStartBbox,
        width: Math.max(6, dragStartBbox.width + dx),
        height: Math.max(6, dragStartBbox.height + dy),
      });
    }
  };

  // Canvas Mouse Up
  const handleCanvasMouseUp = () => {
    if (isMouseDown && (currentTool === "eraser" || currentTool === "pen") && localMask) {
      pushHistoryState(localMask);
    }

    if (isMouseDown && dragHandle) {
      const newMask = extractLocalMaskFromGlobal(currentBbox);
      setLocalMask(newMask);
      setLocalMaskDims({ width: currentBbox.width, height: currentBbox.height });
      pushHistoryState(newMask);
    }

    setIsMouseDown(false);
    setIsPanning(false);
    setDragHandle(null);
  };

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
      const updated = {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(6, width),
        height: Math.max(6, height),
      };
      const newMask = extractLocalMaskFromGlobal(updated);
      setLocalMask(newMask);
      setLocalMaskDims({ width: updated.width, height: updated.height });
      pushHistoryState(newMask);
      return updated;
    });
  };

  // AI Single Glyph Classifier Call
  const handleAiClassify = async () => {
    if (!previewMonoUrl) return;
    setIsClassifying(true);
    setAiRationale(null);
    try {
      const res = await fetch("/api/ai/classify-glyph", {
        method: "POST",
        headers: getAiRequestHeaders(),
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
      glyph.id,
      localMask || undefined,
      previewMonoUrl,
      previewColorUrl
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shadow-inner">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-100">
                  Cutout, Crop &amp; Shape Editor
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
                8-handle free-range resizer, precision eraser brush, and 1-click stroke isolator for concave characters (e.g. letter &apos;C&apos;).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrevGlyph && (
              <button
                onClick={onPrevGlyph}
                disabled={glyphIndex <= 0}
                title="Previous Glyph (Left Arrow)"
                className="p-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {onNextGlyph && (
              <button
                onClick={onNextGlyph}
                disabled={glyphIndex >= totalGlyphs - 1}
                title="Next Glyph (Right Arrow)"
                className="p-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab & Tool Navigation Bar */}
        <div className="px-6 py-2.5 border-b border-neutral-800 bg-neutral-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("crop");
                setCurrentTool("select-crop");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "crop"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>8-Point Resizer &amp; Crop</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("cutout");
                setCurrentTool("eraser");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "cutout"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Clean Intruder Ink (Eraser / Lasso)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("split");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "split"
                  ? "bg-sky-500 text-neutral-950 shadow-sm"
                  : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split Fused Letters</span>
            </button>
          </div>

          {/* Quick Undo/Redo & Zoom Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1 rounded text-neutral-400 hover:text-neutral-200 disabled:opacity-30 transition"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1 rounded text-neutral-400 hover:text-neutral-200 disabled:opacity-30 transition"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-300">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.75, Math.round((z - 0.25) * 100) / 100))}
                className="p-1 rounded text-neutral-400 hover:text-neutral-200 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] px-1 font-semibold">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
                className="p-1 rounded text-neutral-400 hover:text-neutral-200 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1.5);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="text-[10px] text-amber-400 hover:underline ml-1"
                title="Reset Zoom & Pan"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Left Workspace (7 cols) + Right Properties (5 cols) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Interactive Canvas & Toolbox (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Cutout Sub-Toolbar (When on Cutout tab) */}
            {activeTab === "cutout" && (
              <div className="bg-neutral-850 border border-neutral-750 rounded-2xl p-3 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentTool("eraser")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold transition ${
                        currentTool === "eraser"
                          ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Eraser Brush</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentTool("magic-island")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold transition ${
                        currentTool === "magic-island"
                          ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                      }`}
                      title="Click any intruder island to instantly delete only that component"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Magic Wand Eraser</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentTool("lasso-cutout")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold transition ${
                        currentTool.startsWith("lasso")
                          ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Lasso Cutout</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentTool("pen")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold transition ${
                        currentTool === "pen"
                          ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Restore Ink</span>
                    </button>
                  </div>

                  {/* Brush Size Slider (when in brush mode) */}
                  {(currentTool === "eraser" || currentTool === "pen") && (
                    <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1 rounded-xl border border-neutral-800">
                      <span className="text-[11px] text-neutral-400">Brush:</span>
                      <input
                        type="range"
                        min="2"
                        max="24"
                        value={brushRadius}
                        onChange={(e) => setBrushRadius(parseInt(e.target.value))}
                        className="w-16 accent-amber-500 h-1.5"
                      />
                      <span className="font-mono text-neutral-200 text-[11px] font-bold">{brushRadius * 2}px</span>
                    </div>
                  )}
                </div>

                {/* Lasso Execution Controls (if lasso is drawn) */}
                {lassoPoints.length >= 3 && (
                  <div className="p-2 bg-neutral-900 rounded-xl border border-sky-500/30 flex items-center justify-between gap-2 animate-in fade-in">
                    <span className="text-xs text-sky-300 font-medium">
                      Lasso Loop ({lassoPoints.length} pts):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyLassoAction("cutout-inside")}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition"
                      >
                        ✂️ Erase Inside (Remove Intruder)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyLassoAction("keep-only-inside")}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition"
                      >
                        ✨ Keep Inside (Isolate &apos;C&apos;)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLassoPoints([]);
                          setIsDrawingLasso(false);
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
                        title="Cancel Lasso"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AUTOMATIC 1-CLICK CLEANING TOOLBAR */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Automated Stroke &amp; Intruder Fixes:</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-auto-isolate-stroke"
                  onClick={handleAutoIsolateMainStroke}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition shadow-sm active:scale-95"
                  title="Keeps the primary letter stroke (e.g. 'C') and automatically discards any adjacent intruding letter strokes!"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Auto-Isolate Stroke (Remove Intruder)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDespeckle}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 transition"
                  title="Removes stray small dust dots"
                >
                  <span>🧹 Despeckle</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoTrimBounds}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 transition"
                  title="Tightly snaps bounding box to remaining ink"
                >
                  <span>📐 Snap Bounds</span>
                </button>
              </div>
            </div>

            {/* Action Feedback Banner */}
            {actionFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in">
                <span>{actionFeedback}</span>
                <button onClick={() => setActionFeedback(null)} className="text-emerald-400 hover:text-emerald-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Canvas Viewport Container */}
            <div className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden flex flex-col shadow-inner">
              <div className="px-3 py-2 border-b border-neutral-800/80 bg-neutral-900/70 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5 font-medium text-neutral-300">
                  <Move className="w-3.5 h-3.5 text-amber-400" />
                  {activeTab === "crop"
                    ? "Drag the 8 corner/edge handles to resize, or drag inside box to move"
                    : activeTab === "cutout"
                    ? currentTool === "eraser"
                      ? "Brush over intruder strokes inside concave letters (e.g. 'C') to erase"
                      : currentTool === "magic-island"
                      ? "Click on any intruding island to delete it instantly"
                      : currentTool.startsWith("lasso")
                      ? "Draw freehand loop around intruding section"
                      : "Paint with ink to bridge broken lines"
                    : "Drag the red vertical line to set the split point"}
                </span>

                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-400 hover:text-neutral-200">
                  <input
                    type="checkbox"
                    checked={showContoursOverlay}
                    onChange={(e) => setShowContoursOverlay(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Show Vectors</span>
                </label>
              </div>

              <div className="p-3 flex items-center justify-center min-h-[290px] max-h-[380px] overflow-hidden select-none relative bg-neutral-950">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  style={{ cursor: mouseCursor }}
                  className="max-w-full max-h-[360px] object-contain rounded border border-neutral-800 shadow-lg"
                />
              </div>
            </div>

            {/* Precision Edge Nudge Controls (in Crop Mode) */}
            {activeTab === "crop" && (
              <div className="bg-neutral-850 border border-neutral-800 rounded-2xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-300 font-semibold">
                  <span>Precision Edge Nudges:</span>
                  <button
                    type="button"
                    onClick={() => updateBboxAndMask({ ...glyph.bbox })}
                    className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Box</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold block">Left Edge</span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => nudge("left", 5)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-mono text-[10px]"
                      >
                        +5px
                      </button>
                      <button
                        onClick={() => nudge("left", 1)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px]"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => nudge("left", -1)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-[10px]"
                      >
                        -1
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold block">Right Edge</span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => nudge("right", -5)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-mono text-[10px]"
                      >
                        -5px
                      </button>
                      <button
                        onClick={() => nudge("right", -1)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px]"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => nudge("right", 1)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-[10px]"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold block">Top Edge</span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => nudge("top", 3)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px]"
                      >
                        +3px
                      </button>
                      <button
                        onClick={() => nudge("top", -3)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-[10px]"
                      >
                        -3px
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold block">Bottom Edge</span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => nudge("bottom", -3)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px]"
                      >
                        -3px
                      </button>
                      <button
                        onClick={() => nudge("bottom", 3)}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-[10px]"
                      >
                        +3px
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Split Mode Controls */}
            {activeTab === "split" && (
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
          <div className="lg:col-span-5 space-y-4">
            {/* Character & Casing Assignment */}
            <div className="bg-neutral-850 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Character &amp; Casing
                </span>
                <button
                  type="button"
                  onClick={() => setCharInput(toggleCharacterCase(charInput))}
                  title="Toggle Upper/Lower Case"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-amber-300 border border-neutral-700 transition"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Toggle Case (a ⇄ A)</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="input-edit-glyph-char"
                  type="text"
                  maxLength={1}
                  value={charInput}
                  onChange={(e) => setCharInput(e.target.value)}
                  className="w-16 h-16 text-center text-2xl font-bold font-mono bg-neutral-950 text-amber-300 rounded-2xl border-2 border-amber-500/50 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 shadow-inner"
                />

                <div className="space-y-1 text-xs text-neutral-300">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>Casing:</span>
                    <span className="font-bold text-amber-400 capitalize">{currentCasing}</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Type a letter (e.g. <code className="text-amber-300 font-mono">c</code> or <code className="text-amber-300 font-mono">C</code>), digit (<code className="text-amber-300 font-mono">0-9</code>), or symbol.
                  </p>
                </div>
              </div>

              {/* AI Precision Character & Casing Scanner */}
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <button
                  type="button"
                  onClick={handleAiClassify}
                  disabled={isClassifying}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 active:scale-95 transition disabled:opacity-50"
                >
                  {isClassifying ? (
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{isClassifying ? "Scanning with AI..." : "AI Detect Character & Case"}</span>
                </button>

                {aiRationale && (
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-amber-500/30 text-xs text-amber-300 animate-in fade-in">
                    {aiRationale}
                  </div>
                )}
              </div>
            </div>

            {/* Live Cutout Previews: Cultural Color & Monochrome Vector */}
            <div className="bg-neutral-850 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                Live Isolated Output Preview
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

              <div className="text-[11px] text-neutral-400 flex items-center justify-between border-t border-neutral-800 pt-2 font-mono">
                <span>Loops: {currentContours.length}</span>
                <span>Bounds: {currentBbox.width}×{currentBbox.height}px</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeTab === "split" ? (
              <button
                type="button"
                id="btn-confirm-split-glyph"
                onClick={handleConfirmSplit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-neutral-950 active:scale-95 shadow-md shadow-sky-500/20 transition"
              >
                <Split className="w-4 h-4" />
                <span>Split into 2 Glyphs</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-save-glyph-crop"
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 active:scale-95 shadow-md shadow-amber-500/20 transition"
              >
                <Check className="w-4 h-4" />
                <span>Save Cleaned Glyph</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
