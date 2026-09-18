import { BoundingBox, DetectedGlyph, FontSettings } from "../types";
import { extractGlyphContours } from "./vectorizer";

export const STANDARD_UPPERCASE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
export const STANDARD_LOWERCASE = [..."abcdefghijklmnopqrstuvwxyz"];
export const STANDARD_DIGITS = [..."0123456789"];
export const STANDARD_PUNCTUATION = [
  ".",
  ",",
  "!",
  "?",
  ":",
  ";",
  "'",
  '"',
  "-",
  "+",
  "=",
  "/",
  "@",
  "#",
  "$",
  "%",
  "&",
  "*",
  "(",
  ")",
];

export interface TypographicStyleMetrics {
  averageWidth: number;
  averageHeight: number;
  estimatedStroke: number;
  dominantColor: string;
  secondaryColor: string;
  isDarkTheme: boolean;
}

/**
 * Analyzes the user's existing detected glyphs to extract typographic metrics
 * such as stroke width, typical glyph proportions, and dominant color palette.
 */
export function analyzeGlyphStyleMetrics(
  glyphs: DetectedGlyph[],
  colorCanvas: HTMLCanvasElement | null
): TypographicStyleMetrics {
  if (glyphs.length === 0) {
    return {
      averageWidth: 120,
      averageHeight: 160,
      estimatedStroke: 14,
      dominantColor: "#f59e0b",
      secondaryColor: "#b45309",
      isDarkTheme: false,
    };
  }

  let totalW = 0;
  let totalH = 0;
  glyphs.forEach((g) => {
    totalW += g.bbox.width;
    totalH += g.bbox.height;
  });
  const avgW = Math.round(totalW / glyphs.length);
  const avgH = Math.round(totalH / glyphs.length);

  // Estimate stroke thickness as a proportion of width (~12-18% for display letters)
  const estimatedStroke = Math.max(8, Math.round(avgW * 0.14));

  // Sample dominant color from colorCanvas if available
  let dominantColor = "#d97706";
  let secondaryColor = "#b45309";

  if (colorCanvas) {
    try {
      const ctx = colorCanvas.getContext("2d");
      if (ctx && glyphs[0]) {
        const sampleBbox = glyphs[0].bbox;
        const imgData = ctx.getImageData(
          Math.max(0, sampleBbox.x),
          Math.max(0, sampleBbox.y),
          Math.min(colorCanvas.width - sampleBbox.x, sampleBbox.width),
          Math.min(colorCanvas.height - sampleBbox.y, sampleBbox.height)
        );
        const d = imgData.data;
        let rSum = 0,
          gSum = 0,
          bSum = 0,
          count = 0;
        for (let i = 0; i < d.length; i += 16) {
          if (d[i + 3] > 80) {
            rSum += d[i];
            gSum += d[i + 1];
            bSum += d[i + 2];
            count++;
          }
        }
        if (count > 10) {
          const r = Math.round(rSum / count);
          const g = Math.round(gSum / count);
          const b = Math.round(bSum / count);
          dominantColor = `rgb(${r}, ${g}, ${b})`;
          secondaryColor = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(
            0,
            b - 40
          )})`;
        }
      }
    } catch {
      // fallback
    }
  }

  return {
    averageWidth: avgW,
    averageHeight: avgH,
    estimatedStroke,
    dominantColor,
    secondaryColor,
    isDarkTheme: false,
  };
}

/**
 * Converts an SVG path string (from Gemini or algorithmic generator) into a complete
 * DetectedGlyph with crisp vector contours, transparent monochrome canvas, and cultural color canvas.
 */
export function createGlyphFromSvgPath(
  char: string,
  svgPath: string,
  style: TypographicStyleMetrics,
  targetWidth = 140,
  targetHeight = 180,
  smoothing = 1.4
): DetectedGlyph {
  const canvasW = Math.max(80, targetWidth);
  const canvasH = Math.max(100, targetHeight);

  // 1. Create monochrome canvas
  const monoCanvas = document.createElement("canvas");
  monoCanvas.width = canvasW;
  monoCanvas.height = canvasH;
  const monoCtx = monoCanvas.getContext("2d")!;

  // 2. Create color canvas with matching cultural gradient
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = canvasW;
  colorCanvas.height = canvasH;
  const colorCtx = colorCanvas.getContext("2d")!;

  // Construct Path2D from SVG string
  const p2d = new Path2D(svgPath);

  // SVG paths are normalized to 100x100 box. Scale to canvas dimensions
  const scaleX = (canvasW * 0.82) / 100;
  const scaleY = (canvasH * 0.85) / 100;
  const offsetX = (canvasW - 100 * scaleX) / 2;
  const offsetY = (canvasH - 100 * scaleY) / 2;

  // Render Monochrome (clean dark ink on transparent)
  monoCtx.save();
  monoCtx.translate(offsetX, offsetY);
  monoCtx.scale(scaleX, scaleY);
  monoCtx.fillStyle = "#171717";
  monoCtx.fill(p2d);
  monoCtx.restore();

  // Render Cultural Color Edition (rich gradient & stroke matching user style)
  colorCtx.save();
  colorCtx.translate(offsetX, offsetY);
  colorCtx.scale(scaleX, scaleY);
  const grad = colorCtx.createLinearGradient(0, 0, 100, 100);
  grad.addColorStop(0, style.dominantColor);
  grad.addColorStop(1, style.secondaryColor);
  colorCtx.fillStyle = grad;
  colorCtx.fill(p2d);
  // Add subtle edge contour definition
  colorCtx.strokeStyle = "rgba(0,0,0,0.25)";
  colorCtx.lineWidth = 1.5;
  colorCtx.stroke(p2d);
  colorCtx.restore();

  // Create binary mask for contour vectorization
  const imgData = monoCtx.getImageData(0, 0, canvasW, canvasH);
  const mask = new Uint8Array(canvasW * canvasH);
  let minX = canvasW,
    minY = canvasH,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < canvasH; y++) {
    for (let x = 0; x < canvasW; x++) {
      const idx = (y * canvasW + x) * 4;
      const alpha = imgData.data[idx + 3];
      if (alpha > 50) {
        mask[y * canvasW + x] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Ensure valid bounding box
  if (maxX <= minX) {
    minX = 10;
    maxX = canvasW - 10;
    minY = 10;
    maxY = canvasH - 10;
  }

  const bbox: BoundingBox = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  // Vectorize contours
  const contours = extractGlyphContours(mask, canvasW, canvasH, bbox, smoothing);

  return {
    id: `glyph-expanded-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    char,
    unicode: char.charCodeAt(0),
    bbox,
    contours,
    canvasDataUrl: monoCanvas.toDataURL("image/png"),
    colorCanvasDataUrl: colorCanvas.toDataURL("image/png"),
    advanceWidth: Math.round(canvasW * 1.05),
    leftBearing: Math.round(minX * 0.8),
    rightBearing: Math.round((canvasW - maxX) * 0.8),
    isSynthesized: true,
  };
}

/**
 * Fast Algorithmic Synthesis:
 * Generates an SVG path for missing standard characters based on measured typographic metrics.
 */
export function getAlgorithmicSvgForChar(char: string, style: TypographicStyleMetrics): string {
  const s = 14; // normalized stroke

  switch (char) {
    // Standard basic lowercase
    case "a":
      return `M 70,38 L 70,80 A 18,18 0 1,1 34,80 A 18,18 0 0,1 70,62 L 70,48 A 24,24 0 0,0 26,68 L 26,60 A 24,24 0 0,1 70,38 Z`;
    case "b":
      return `M 26,15 L 40,15 L 40,46 A 18,18 0 1,1 40,78 L 26,78 Z M 40,56 A 12,12 0 1,0 40,68 Z`;
    case "c":
      return `M 72,48 A 18,18 0 1,0 72,72 L 80,78 A 24,24 0 1,1 80,42 Z`;
    case "d":
      return `M 62,15 L 76,15 L 76,78 L 62,78 L 62,74 A 18,18 0 1,1 62,46 Z M 62,56 A 12,12 0 1,0 62,68 Z`;
    case "e":
      return `M 26,60 L 74,60 A 12,12 0 0,0 30,52 L 26,46 A 20,20 0 1,1 72,74 L 64,80 A 20,20 0 0,1 26,60 Z`;
    case "f":
      return `M 62,16 A 14,14 0 0,0 42,30 L 42,42 L 30,42 L 30,52 L 42,52 L 42,80 L 56,80 L 56,52 L 70,52 L 70,42 L 56,42 L 56,32 A 6,6 0 0,1 64,26 Z`;
    case "g":
      return `M 70,38 L 70,82 A 16,16 0 0,1 32,95 L 34,84 A 10,10 0 0,0 60,80 L 60,76 A 18,18 0 1,1 70,52 Z M 56,54 A 12,12 0 1,0 56,66 Z`;
    case "h":
      return `M 26,15 L 40,15 L 40,48 A 16,16 0 0,1 72,56 L 72,80 L 58,80 L 58,58 A 8,8 0 0,0 40,58 L 40,80 L 26,80 Z`;
    case "i":
      return `M 42,16 A 7,7 0 1,1 42,30 A 7,7 0 0,1 42,16 Z M 35,40 L 49,40 L 49,80 L 35,80 Z`;
    case "j":
      return `M 56,16 A 7,7 0 1,1 56,30 A 7,7 0 0,1 56,16 Z M 50,40 L 64,40 L 64,82 A 14,14 0 0,1 32,95 L 34,84 A 8,8 0 0,0 50,78 Z`;
    case "k":
      return `M 26,15 L 40,15 L 40,80 L 26,80 Z M 40,58 L 66,38 L 78,38 L 52,60 L 80,80 L 66,80 L 40,62 Z`;
    case "l":
      return `M 38,15 L 52,15 L 52,74 A 8,8 0 0,0 64,80 L 64,88 A 16,16 0 0,1 38,74 Z`;
    case "m":
      return `M 18,40 L 30,40 L 30,48 A 12,12 0 0,1 54,48 A 12,12 0 0,1 78,48 L 78,80 L 66,80 L 66,54 A 6,6 0 0,0 54,54 L 54,80 L 42,80 L 42,54 A 6,6 0 0,0 30,54 L 30,80 L 18,80 Z`;
    case "n":
      return `M 26,40 L 40,40 L 40,48 A 16,16 0 0,1 72,56 L 72,80 L 58,80 L 58,58 A 8,8 0 0,0 40,58 L 40,80 L 26,80 Z`;
    case "o":
      return `M 50,38 A 21,21 0 1,1 49.9,38 Z M 50,50 A 9,9 0 1,0 50.1,50 Z`;
    case "p":
      return `M 26,40 L 40,40 L 40,48 A 16,16 0 1,1 40,76 L 40,96 L 26,96 Z M 40,54 A 10,10 0 1,0 40,66 Z`;
    case "q":
      return `M 60,40 L 74,40 L 74,96 L 60,96 L 60,76 A 16,16 0 1,1 60,48 Z M 60,54 A 10,10 0 1,0 60,66 Z`;
    case "r":
      return `M 26,40 L 40,40 L 40,52 A 14,14 0 0,1 68,44 L 68,56 A 14,14 0 0,0 40,58 L 40,80 L 26,80 Z`;
    case "s":
      return `M 68,48 A 10,10 0 0,0 40,44 L 38,50 A 8,8 0 0,0 58,62 A 10,10 0 0,1 40,78 A 12,12 0 0,1 28,70 L 34,64 A 8,8 0 0,0 60,70 A 6,6 0 0,0 42,56 A 12,12 0 0,1 68,48 Z`;
    case "t":
      return `M 42,22 L 56,22 L 56,40 L 70,40 L 70,50 L 56,50 L 56,72 A 6,6 0 0,0 66,78 L 66,86 A 14,14 0 0,1 42,72 Z`;
    case "u":
      return `M 26,40 L 40,40 L 40,68 A 12,12 0 0,0 60,68 L 60,40 L 74,40 L 74,80 L 60,80 L 60,76 A 18,18 0 0,1 26,68 Z`;
    case "v":
      return `M 22,40 L 36,40 L 50,74 L 64,40 L 78,40 L 58,80 L 42,80 Z`;
    case "w":
      return `M 18,40 L 30,40 L 40,74 L 50,44 L 60,44 L 70,74 L 80,40 L 92,40 L 78,80 L 64,80 L 55,54 L 46,80 L 32,80 Z`;
    case "x":
      return `M 26,40 L 40,40 L 50,56 L 60,40 L 74,40 L 58,60 L 74,80 L 60,80 L 50,64 L 40,80 L 26,80 L 42,60 Z`;
    case "y":
      return `M 22,40 L 36,40 L 50,68 L 64,40 L 78,40 L 56,86 A 12,12 0 0,1 32,95 L 34,84 A 6,6 0 0,0 50,80 Z`;
    case "z":
      return `M 26,40 L 74,40 L 74,48 L 42,72 L 74,72 L 74,80 L 26,80 L 26,72 L 58,48 L 26,48 Z`;

    // Standard Digits
    case "0":
      return `M 50,15 A 25,32 0 1,1 49.9,15 Z M 50,28 A 12,19 0 1,0 50.1,28 Z`;
    case "1":
      return `M 34,26 L 50,15 L 50,80 L 34,80 L 34,80 L 66,80 L 66,70 L 50,70 L 50,28 L 38,36 Z`;
    case "2":
      return `M 28,32 A 18,18 0 0,1 68,34 C 68,48 42,60 28,72 L 74,72 L 74,80 L 26,80 L 26,70 C 44,54 62,44 60,34 A 10,10 0 0,0 36,32 Z`;
    case "3":
      return `M 28,24 L 70,24 L 48,46 A 14,14 0 1,1 32,70 L 42,62 A 8,8 0 1,0 56,54 L 38,54 L 54,34 L 28,34 Z`;
    case "4":
      return `M 56,15 L 24,56 L 66,56 L 66,15 Z M 54,32 L 54,46 L 36,46 Z M 56,56 L 56,80 L 66,80 L 66,56 Z`;
    case "5":
      return `M 68,18 L 32,18 L 28,44 A 18,18 0 0,1 68,54 A 18,18 0 0,1 32,76 L 36,66 A 10,10 0 0,0 60,54 A 10,10 0 0,0 40,44 L 40,28 L 68,28 Z`;
    case "6":
      return `M 64,22 L 54,32 A 20,20 0 0,0 30,52 A 18,18 0 1,1 64,62 A 18,18 0 0,1 30,62 A 22,22 0 0,1 54,20 Z M 48,52 A 10,10 0 1,0 48,72 A 10,10 0 0,0 48,52 Z`;
    case "7":
      return `M 26,18 L 74,18 L 48,80 L 36,80 L 60,28 L 26,28 Z`;
    case "8":
      return `M 50,15 A 14,14 0 0,1 66,32 A 14,14 0 0,1 50,46 A 16,16 0 1,1 50,80 A 16,16 0 0,1 34,58 A 14,14 0 0,1 50,46 A 14,14 0 0,1 36,32 A 14,14 0 0,1 50,15 Z M 50,25 A 6,6 0 1,0 50,37 A 6,6 0 0,0 50,25 Z M 50,56 A 8,8 0 1,0 50,70 A 8,8 0 0,0 50,56 Z`;
    case "9":
      return `M 36,78 L 46,68 A 20,20 0 0,0 70,48 A 18,18 0 1,1 36,38 A 18,18 0 0,1 70,38 A 22,22 0 0,1 46,80 Z M 52,48 A 10,10 0 1,0 52,28 A 10,10 0 0,0 52,48 Z`;

    // Standard Punctuation
    case ".":
      return `M 42,70 A 8,8 0 1,1 42,86 A 8,8 0 0,1 42,70 Z`;
    case ",":
      return `M 42,68 A 7,7 0 1,1 56,68 L 52,82 L 40,86 L 44,76 A 7,7 0 0,1 42,68 Z`;
    case "!":
      return `M 44,15 L 56,15 L 54,60 L 46,60 Z M 43,72 A 7,7 0 1,1 43,86 A 7,7 0 0,1 43,72 Z`;
    case "?":
      return `M 32,30 A 18,18 0 0,1 68,32 C 68,46 54,50 54,60 L 46,60 C 46,48 60,44 60,34 A 10,10 0 0,0 38,32 Z M 43,72 A 7,7 0 1,1 43,86 A 7,7 0 0,1 43,72 Z`;
    case ":":
      return `M 43,34 A 7,7 0 1,1 43,48 A 7,7 0 0,1 43,34 Z M 43,68 A 7,7 0 1,1 43,82 A 7,7 0 0,1 43,68 Z`;
    case ";":
      return `M 43,34 A 7,7 0 1,1 43,48 A 7,7 0 0,1 43,34 Z M 42,66 A 7,7 0 1,1 56,66 L 52,80 L 40,84 L 44,74 A 7,7 0 0,1 42,66 Z`;
    case "-":
      return `M 24,46 L 76,46 L 76,56 L 24,56 Z`;
    case "+":
      return `M 45,28 L 55,28 L 55,45 L 72,45 L 72,55 L 55,55 L 55,72 L 45,72 L 45,55 L 28,55 L 28,45 L 45,45 Z`;
    case "=":
      return `M 24,38 L 76,38 L 76,46 L 24,46 Z M 24,56 L 76,56 L 76,64 L 24,64 Z`;
    case "/":
      return `M 28,84 L 72,16 L 80,20 L 36,88 Z`;
    case "&":
      return `M 56,18 A 12,12 0 0,1 66,32 C 66,42 54,48 44,56 C 60,62 76,68 76,78 A 14,14 0 0,1 48,82 C 34,82 24,72 24,60 C 24,48 38,36 44,28 A 6,6 0 0,0 56,18 Z M 52,28 A 4,4 0 0,0 46,34 C 44,38 38,46 38,58 C 38,68 44,74 54,74 C 62,74 66,70 66,66 C 66,58 56,54 48,50 Z`;
    default:
      // Fallback box for unknown characters
      return `M 30,20 L 70,20 L 70,80 L 30,80 Z M 40,30 L 40,70 L 60,70 L 60,30 Z`;
  }
}
