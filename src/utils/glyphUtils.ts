import { BoundingBox, DetectedGlyph } from "../types";
import { extractGlyphContours, extractGlyphContoursFromLocalMask } from "./vectorizer";

/**
 * Crops a rectangular region of a canvas and returns its data URL.
 */
export function cropCanvasToDataUrl(
  sourceCanvas: HTMLCanvasElement,
  bbox: BoundingBox,
  padding = 4
): string {
  const cropCanvas = document.createElement("canvas");
  const w = Math.max(1, Math.round(bbox.width + padding * 2));
  const h = Math.max(1, Math.round(bbox.height + padding * 2));
  cropCanvas.width = w;
  cropCanvas.height = h;

  const ctx = cropCanvas.getContext("2d");
  if (!ctx) return "";

  // Clamp bounding box to source dimensions
  const sx = Math.max(0, Math.min(sourceCanvas.width - 1, bbox.x));
  const sy = Math.max(0, Math.min(sourceCanvas.height - 1, bbox.y));
  const sw = Math.min(sourceCanvas.width - sx, bbox.width);
  const sh = Math.min(sourceCanvas.height - sy, bbox.height);

  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, padding, padding, sw, sh);
  return cropCanvas.toDataURL("image/png");
}

/**
 * Creates or rebuilds a complete DetectedGlyph from a bounding box,
 * extracting vector contours and both monochrome and color cutout data URLs.
 */
export function createGlyphFromCrop(
  bbox: BoundingBox,
  char: string,
  cleanedCanvas: HTMLCanvasElement,
  colorCanvas: HTMLCanvasElement | null,
  binaryMask: Uint8Array,
  maskWidth: number,
  maskHeight: number,
  smoothing: number,
  existingId?: string,
  customLocalMask?: Uint8Array,
  customMonoDataUrl?: string,
  customColorDataUrl?: string
): DetectedGlyph {
  const safeChar = char ? char.charAt(0) : "?";
  const unicode = safeChar.charCodeAt(0);

  // Extract vector contours
  const contours = customLocalMask
    ? extractGlyphContoursFromLocalMask(customLocalMask, bbox.width, bbox.height, smoothing)
    : extractGlyphContours(
        binaryMask,
        maskWidth,
        maskHeight,
        bbox,
        smoothing
      );

  // Render monochrome preview
  const canvasDataUrl = customMonoDataUrl || cropCanvasToDataUrl(cleanedCanvas, bbox, 4);

  // Render color preview if colorCanvas exists
  let colorCanvasDataUrl: string | undefined = customColorDataUrl;
  if (!colorCanvasDataUrl && colorCanvas) {
    colorCanvasDataUrl = cropCanvasToDataUrl(colorCanvas, bbox, 4);
  }

  return {
    id: existingId || `glyph-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    char: safeChar,
    unicode,
    bbox,
    contours,
    canvasDataUrl,
    colorCanvasDataUrl,
    advanceWidth: Math.round(bbox.width * 1.25),
    leftBearing: 20,
    rightBearing: 20,
  };
}

/**
 * Splits a bounding box vertically into two adjacent boxes.
 */
export function splitGlyphBbox(
  bbox: BoundingBox,
  splitRatio: number // e.g. 0.5 for 50/50 split
): { leftBbox: BoundingBox; rightBbox: BoundingBox } {
  const clampedRatio = Math.max(0.1, Math.min(0.9, splitRatio));
  const splitX = Math.round(bbox.width * clampedRatio);

  const leftBbox: BoundingBox = {
    x: bbox.x,
    y: bbox.y,
    width: Math.max(2, splitX),
    height: bbox.height,
  };

  const rightBbox: BoundingBox = {
    x: bbox.x + splitX,
    y: bbox.y,
    width: Math.max(2, bbox.width - splitX),
    height: bbox.height,
  };

  return { leftBbox, rightBbox };
}

/**
 * Detects whether a character is uppercase, lowercase, digit, or symbol.
 */
export function getCharacterCasing(char: string): "upper" | "lower" | "digit" | "symbol" {
  if (!char) return "symbol";
  const c = char.charAt(0);
  if (c >= "A" && c <= "Z") return "upper";
  if (c >= "a" && c <= "z") return "lower";
  if (c >= "0" && c <= "9") return "digit";
  return "symbol";
}

/**
 * Toggles a character between uppercase and lowercase.
 */
export function toggleCharacterCase(char: string): string {
  if (!char) return char;
  const c = char.charAt(0);
  if (c >= "A" && c <= "Z") return c.toLowerCase();
  if (c >= "a" && c <= "z") return c.toUpperCase();
  return c;
}

/**
 * Comprehensive sequence pattern definitions.
 */
export const SEQUENCE_PATTERNS: {
  id: string;
  name: string;
  description: string;
  chars: string[];
}[] = [
  {
    id: "A-Z_a-z_0-9",
    name: "A-Z, a-z, 0-9",
    description: "Uppercase A-Z, then Lowercase a-z, then Digits 0-9",
    chars: [
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      ..."abcdefghijklmnopqrstuvwxyz",
      ..."0123456789",
      ..."!?.,:;\"'-+=/@#$%&*()",
    ],
  },
  {
    id: "A-Z_0-9",
    name: "A-Z, 0-9",
    description: "Uppercase A-Z, then Digits 0-9 & punctuation",
    chars: [
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      ..."0123456789",
      ..."!?.,:;\"'-+=/@#$%&*()",
    ],
  },
  {
    id: "a-z_0-9",
    name: "a-z, 0-9",
    description: "Lowercase a-z, then Digits 0-9",
    chars: [
      ..."abcdefghijklmnopqrstuvwxyz",
      ..."0123456789",
      ..."!?.,:;\"'-+=/@#$%&*()",
    ],
  },
  {
    id: "Aa_Bb_Cc",
    name: "Aa, Bb, Cc...",
    description: "Paired Uppercase and Lowercase characters",
    chars: [
      "A", "a", "B", "b", "C", "c", "D", "d", "E", "e",
      "F", "f", "G", "g", "H", "h", "I", "i", "J", "j",
      "K", "k", "L", "l", "M", "m", "N", "n", "O", "o",
      "P", "p", "Q", "q", "R", "r", "S", "s", "T", "t",
      "U", "u", "V", "v", "W", "w", "X", "x", "Y", "y",
      "Z", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ],
  },
  {
    id: "0-9_A-Z",
    name: "0-9, A-Z",
    description: "Digits 0-9 first, then Uppercase A-Z",
    chars: [
      ..."0123456789",
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      ..."!?.,:;\"'-+=/@#$%&*()",
    ],
  },
  {
    id: "a-z",
    name: "a-z (Only Lowercase)",
    description: "Only lowercase letters a-z",
    chars: [..."abcdefghijklmnopqrstuvwxyz"],
  },
  {
    id: "A-Z",
    name: "A-Z (Only Uppercase)",
    description: "Only uppercase letters A-Z",
    chars: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
  },
];

/**
 * Performs a 100% in-browser offline "Normal Mode" harvest of isolated glyphs:
 * 1. Groups glyphs by spatial line rows (top-to-bottom reading order).
 * 2. Within each line row, sorts left-to-right.
 * 3. Maps to the chosen sequence pattern (A-Z, a-z, 0-9, etc.).
 * 4. Determines casing, confidence quality score, missing characters, and produces a complete AlphabetHarvestResult.
 */
export function performNormalHarvest(
  glyphs: DetectedGlyph[],
  patternId = "A-Z_a-z_0-9"
): {
  resolvedCharacters: any[];
  missingStandardCharacters: string[];
  totalFoundCount: number;
  handwritingStyle?: string;
  suggestedFontName?: string;
  summary: string;
} {
  if (glyphs.length === 0) {
    return {
      resolvedCharacters: [],
      missingStandardCharacters: [
        ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        ..."abcdefghijklmnopqrstuvwxyz",
        ..."0123456789",
      ],
      totalFoundCount: 0,
      handwritingStyle: "Clean In-Browser Spatial Extraction",
      suggestedFontName: "Handwritten Script",
      summary: "No glyphs found to harvest.",
    };
  }

  // 1. Calculate average glyph height for line clustering threshold
  const totalHeight = glyphs.reduce((sum, g) => sum + g.bbox.height, 0);
  const avgHeight = Math.max(10, totalHeight / glyphs.length);
  const lineTolerance = avgHeight * 0.55;

  // 2. Sort all glyphs by centerY
  const sorted = [...glyphs].sort((a, b) => {
    const aCenterY = a.bbox.y + a.bbox.height / 2;
    const bCenterY = b.bbox.y + b.bbox.height / 2;
    return aCenterY - bCenterY;
  });

  // 3. Cluster into rows
  const rows: DetectedGlyph[][] = [];
  let currentRow: DetectedGlyph[] = [];
  let currentRowCenterY = 0;

  for (const g of sorted) {
    const centerY = g.bbox.y + g.bbox.height / 2;
    if (currentRow.length === 0) {
      currentRow.push(g);
      currentRowCenterY = centerY;
    } else {
      if (Math.abs(centerY - currentRowCenterY) < lineTolerance) {
        currentRow.push(g);
        currentRowCenterY =
          currentRow.reduce((s, item) => s + (item.bbox.y + item.bbox.height / 2), 0) /
          currentRow.length;
      } else {
        rows.push(currentRow);
        currentRow = [g];
        currentRowCenterY = centerY;
      }
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // 4. Sort each row left-to-right
  const spatiallyOrderedGlyphs: DetectedGlyph[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.bbox.x - b.bbox.x);
    spatiallyOrderedGlyphs.push(...row);
  }

  // 5. Map to target pattern characters
  const matchedPattern =
    SEQUENCE_PATTERNS.find((p) => p.id === patternId) || SEQUENCE_PATTERNS[0];
  const targetChars = matchedPattern.chars;

  const resolvedCharacters: any[] = [];
  const assignedCharSet = new Set<string>();

  spatiallyOrderedGlyphs.forEach((glyph, idx) => {
    const assignedChar =
      idx < targetChars.length ? targetChars[idx] : glyph.char || `?`;
    const casing = getCharacterCasing(assignedChar);
    assignedCharSet.add(assignedChar);

    resolvedCharacters.push({
      char: assignedChar,
      casing,
      glyphIndex: idx,
      glyphId: glyph.id,
      croppedDataUrl: glyph.canvasDataUrl,
      colorCroppedDataUrl: glyph.colorCanvasDataUrl,
      qualityScore: 95,
      sourceWord: `Row ${Math.floor(idx / 10) + 1}`,
      notes: "Extracted via local high-speed spatial ordering",
    });
  });

  // 6. Compute missing standard characters (A-Z, a-z, 0-9)
  const standardSet = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ..."abcdefghijklmnopqrstuvwxyz",
    ..."0123456789",
  ];
  const missingStandardCharacters = standardSet.filter(
    (c) => !assignedCharSet.has(c)
  );

  return {
    resolvedCharacters,
    missingStandardCharacters,
    totalFoundCount: resolvedCharacters.length,
    handwritingStyle: "Natural Handwriting / In-Browser Extraction",
    suggestedFontName: "Handcrafted Script",
    summary: `Singled out ${resolvedCharacters.length} glyphs organized in natural reading order across ${rows.length} rows (${matchedPattern.name}).`,
  };
}
