import JSZip from "jszip";
import { DetectedGlyph } from "../types";

/**
 * Creates and triggers a download of a complete Full-Color Cultural Asset Pack (ZIP).
 * Contains:
 * - Individual high-res PNG for each character with transparent background
 * - Individual SVG for each character
 * - Full sheet with transparent background
 * - manifest.json with metrics, unicode, and character mappings
 */
export async function downloadColorAssetPackZip(
  glyphs: DetectedGlyph[],
  fontName: string,
  fullTransparentSheetDataUrl?: string
): Promise<void> {
  const zip = new JSZip();
  const safeName = (fontName || "CulturalFont")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const rootFolder = zip.folder(`${safeName}_Cultural_Color_Pack`);
  const pngFolder = rootFolder?.folder("png_characters");
  const svgFolder = rootFolder?.folder("svg_characters");

  const manifest: Record<string, any>[] = [];

  // 1. Process each glyph
  for (const glyph of glyphs) {
    const dataUrl = glyph.colorCanvasDataUrl || glyph.canvasDataUrl;
    if (!dataUrl) continue;

    // Clean character name for file system (e.g. "?" -> "question", "/" -> "slash")
    const safeCharName = getSafeCharFileName(glyph.char);

    // Add PNG
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    pngFolder?.file(`${safeCharName}.png`, base64Data, { base64: true });

    // Add SVG
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${glyph.bbox.width}" height="${glyph.bbox.height}" viewBox="0 0 ${glyph.bbox.width} ${glyph.bbox.height}">
  <!-- Cultural Character: ${glyph.char} (Unicode: U+${glyph.unicode.toString(16).toUpperCase().padStart(4, "0")}) -->
  <image href="${dataUrl}" width="${glyph.bbox.width}" height="${glyph.bbox.height}" />
</svg>`;
    svgFolder?.file(`${safeCharName}.svg`, svgContent);

    manifest.push({
      character: glyph.char,
      unicode: `U+${glyph.unicode.toString(16).toUpperCase().padStart(4, "0")}`,
      codePoint: glyph.unicode,
      width: glyph.bbox.width,
      height: glyph.bbox.height,
      advanceWidth: glyph.advanceWidth || Math.round(glyph.bbox.width * 1.25),
      fileNamePng: `${safeCharName}.png`,
      fileNameSvg: `${safeCharName}.svg`,
    });
  }

  // 2. Add manifest JSON
  rootFolder?.file(
    "manifest.json",
    JSON.stringify(
      {
        fontName,
        totalCharacters: glyphs.length,
        exportedAt: new Date().toISOString(),
        format: "Full-Color Cultural Character Art Pack",
        characters: manifest,
      },
      null,
      2
    )
  );

  // 3. Add full transparent sheet if available
  if (fullTransparentSheetDataUrl) {
    const sheetBase64 = fullTransparentSheetDataUrl.replace(/^data:image\/png;base64,/, "");
    rootFolder?.file(`${safeName}_transparent_full_sheet.png`, sheetBase64, { base64: true });
  }

  // 4. Add HTML Quick Preview / Web Embed Guide
  const htmlDemo = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${fontName} - Cultural Color Characters</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    h1 { margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 12px; margin-top: 2rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 12px; text-align: center; border: 1px solid #334155; }
    .card img { max-width: 60px; max-height: 60px; object-fit: contain; }
    .label { margin-top: 8px; font-weight: bold; font-size: 14px; }
    .code { font-size: 11px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${fontName}</h1>
  <p>Authentic Cultural Color Character Asset Pack (${glyphs.length} characters)</p>
  <div class="grid">
    ${manifest
      .map(
        (m) => `
    <div class="card">
      <img src="./png_characters/${m.fileNamePng}" alt="${m.character}" />
      <div class="label">${m.character}</div>
      <div class="code">${m.unicode}</div>
    </div>`
      )
      .join("")}
  </div>
</body>
</html>`;
  rootFolder?.file("index.html", htmlDemo);

  // Generate ZIP and download
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}_Cultural_Color_Asset_Pack.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Typesets arbitrary text using the real cultural color characters onto a canvas,
 * allowing users to type words/sentences and export high-res artwork!
 */
export function typesetCulturalArtwork(
  glyphs: DetectedGlyph[],
  text: string,
  options: {
    targetHeight?: number;
    letterSpacing?: number;
    lineHeightMultiplier?: number;
    backgroundColor?: string | null; // null for transparent
  }
): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const glyphMap = new Map<string, DetectedGlyph>();
    glyphs.forEach((g) => {
      glyphMap.set(g.char, g);
      // Fallback: uppercase mapping for lowercase if absent
      if (g.char >= "A" && g.char <= "Z") {
        if (!glyphMap.has(g.char.toLowerCase())) {
          glyphMap.set(g.char.toLowerCase(), g);
        }
      }
    });

    const targetHeight = options.targetHeight || 90;
    const spacing = options.letterSpacing ?? 12;
    const lineMult = options.lineHeightMultiplier || 1.35;
    const lineStep = targetHeight * lineMult;

    const lines = text.split("\n");

    // Load image elements for all required glyphs
    const imageCache = new Map<string, HTMLImageElement>();
    const promises: Promise<void>[] = [];

    lines.forEach((line) => {
      for (const char of line) {
        if (char === " ") continue;
        const g = glyphMap.get(char);
        if (g && !imageCache.has(g.id)) {
          const img = new Image();
          const p = new Promise<void>((res) => {
            img.onload = () => {
              imageCache.set(g.id, img);
              res();
            };
            img.onerror = () => res();
          });
          img.src = g.colorCanvasDataUrl || g.canvasDataUrl || "";
          promises.push(p);
        }
      }
    });

    Promise.all(promises).then(() => {
      // Calculate canvas dimensions
      let maxLineWidth = 0;
      const lineWidths: number[] = [];

      lines.forEach((line) => {
        let curW = 0;
        for (const char of line) {
          if (char === " ") {
            curW += targetHeight * 0.4;
            continue;
          }
          const g = glyphMap.get(char);
          if (g) {
            const aspect = g.bbox.width / (g.bbox.height || 1);
            curW += targetHeight * aspect + spacing;
          } else {
            // Missing char fallback width
            curW += targetHeight * 0.5 + spacing;
          }
        }
        lineWidths.push(curW);
        if (curW > maxLineWidth) maxLineWidth = curW;
      });

      const padding = 40;
      const totalWidth = Math.max(300, Math.round(maxLineWidth + padding * 2));
      const totalHeight = Math.max(160, Math.round(lines.length * lineStep + padding * 2));

      const canvas = document.createElement("canvas");
      canvas.width = totalWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(canvas);
        return;
      }

      // Background
      if (options.backgroundColor) {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, totalWidth, totalHeight);
      } else {
        ctx.clearRect(0, 0, totalWidth, totalHeight);
      }

      // Draw each line
      lines.forEach((line, lineIdx) => {
        let curX = padding;
        const lineY = padding + lineIdx * lineStep;

        for (const char of line) {
          if (char === " ") {
            curX += targetHeight * 0.4;
            continue;
          }

          const g = glyphMap.get(char);
          if (g) {
            const img = imageCache.get(g.id);
            const aspect = g.bbox.width / (g.bbox.height || 1);
            const charW = targetHeight * aspect;

            if (img && img.complete) {
              ctx.drawImage(img, curX, lineY, charW, targetHeight);
            } else {
              // Fallback placeholder
              ctx.fillStyle = "#f59e0b";
              ctx.font = `bold ${targetHeight * 0.8}px sans-serif`;
              ctx.fillText(char, curX, lineY + targetHeight * 0.8);
            }
            curX += charW + spacing;
          } else {
            // Unmapped character: render text fallback
            ctx.fillStyle = "#94a3b8";
            ctx.font = `bold ${targetHeight * 0.75}px sans-serif`;
            ctx.fillText(char, curX, lineY + targetHeight * 0.8);
            curX += targetHeight * 0.5 + spacing;
          }
        }
      });

      resolve(canvas);
    });
  });
}

/**
 * Downloads a canvas as high-resolution PNG
 */
export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getSafeCharFileName(char: string): string {
  const map: Record<string, string> = {
    "/": "slash",
    "\\": "backslash",
    ":": "colon",
    "*": "asterisk",
    "?": "question",
    '"': "quote",
    "<": "less",
    ">": "greater",
    "|": "pipe",
    ".": "period",
    ",": "comma",
    "!": "exclamation",
    "@": "at",
    "#": "hash",
    $: "dollar",
    "%": "percent",
    "&": "ampersand",
    "+": "plus",
    "-": "minus",
    "=": "equals",
  };

  if (map[char]) return `char_${map[char]}`;
  if (/[a-zA-Z0-9]/.test(char)) return `char_${char}`;
  return `char_u${char.charCodeAt(0).toString(16)}`;
}
