import opentype from "opentype.js";
import { DetectedGlyph, FontSettings } from "../types";
import { buildOpenTypeGlyphPath } from "./vectorizer";

/**
 * Creates standard .notdef glyph required by OpenType specification.
 */
function createNotdefGlyph(): opentype.Glyph {
  const notdefPath = new opentype.Path();
  // Standard rectangular missing glyph box
  const width = 500;
  const height = 700;
  const stroke = 50;

  // Outer border
  notdefPath.moveTo(50, 0);
  notdefPath.lineTo(width - 50, 0);
  notdefPath.lineTo(width - 50, height);
  notdefPath.lineTo(50, height);
  notdefPath.close();

  // Inner hole
  notdefPath.moveTo(50 + stroke, stroke);
  notdefPath.lineTo(50 + stroke, height - stroke);
  notdefPath.lineTo(width - 50 - stroke, height - stroke);
  notdefPath.lineTo(width - 50 - stroke, stroke);
  notdefPath.close();

  return new opentype.Glyph({
    name: ".notdef",
    unicode: 0,
    advanceWidth: width,
    path: notdefPath,
  });
}

/**
 * Creates empty space glyph (Unicode 32).
 */
function createSpaceGlyph(spaceWidth = 320): opentype.Glyph {
  return new opentype.Glyph({
    name: "space",
    unicode: 32,
    advanceWidth: spaceWidth,
    path: new opentype.Path(),
  });
}

/**
 * Synthesizes a clean geometric punctuation glyph (e.g. period, hyphen)
 * if missing from user drawing.
 */
function synthesizePunctuationGlyph(
  char: string,
  capHeight = 700,
  stroke = 80
): opentype.Glyph | null {
  const path = new opentype.Path();
  let advance = 300;

  if (char === ".") {
    // Period dot
    advance = 260;
    const r = stroke * 0.7;
    path.moveTo(advance / 2 - r, 0);
    path.lineTo(advance / 2 + r, 0);
    path.lineTo(advance / 2 + r, r * 2);
    path.lineTo(advance / 2 - r, r * 2);
    path.close();
  } else if (char === "-") {
    // Hyphen
    advance = 400;
    const y = capHeight * 0.45;
    path.moveTo(60, y);
    path.lineTo(advance - 60, y);
    path.lineTo(advance - 60, y + stroke * 0.8);
    path.lineTo(60, y + stroke * 0.8);
    path.close();
  } else if (char === ",") {
    // Comma
    advance = 260;
    const r = stroke * 0.6;
    path.moveTo(advance / 2 - r, 0);
    path.lineTo(advance / 2 + r, 0);
    path.lineTo(advance / 2, -r * 2);
    path.lineTo(advance / 2 - r, -r);
    path.close();
  } else {
    return null;
  }

  return new opentype.Glyph({
    name: getGlyphNameForChar(char),
    unicode: char.charCodeAt(0),
    advanceWidth: advance,
    path,
  });
}

export interface FontBuildResult {
  font: opentype.Font;
  arrayBuffer: ArrayBuffer;
  blobUrl: string;
  glyphCount: number;
  synthesizedCount: number;
}

/**
 * Builds a complete OpenType/TrueType font instance from detected glyphs
 * and generates missing characters to form a standard complete font.
 */
export function buildFontFromGlyphs(
  glyphs: DetectedGlyph[],
  settings: FontSettings
): FontBuildResult {
  const fontGlyphs: opentype.Glyph[] = [];
  let synthesizedCount = 0;

  // 1. Mandatory .notdef glyph
  fontGlyphs.push(createNotdefGlyph());

  // 2. Space glyph
  fontGlyphs.push(createSpaceGlyph(settings.spaceWidth));

  // Map of registered unicodes
  const registeredUnicodes = new Set<number>([0, 32]);
  const userGlyphsByChar = new Map<string, DetectedGlyph>();

  // 3. User detected glyphs
  for (const g of glyphs) {
    if (!g.char) continue;
    const char = g.char.charAt(0);
    const unicode = char.charCodeAt(0);

    // Skip if already registered
    if (registeredUnicodes.has(unicode)) continue;

    const { path, advanceWidth } = buildOpenTypeGlyphPath(
      g.contours || [],
      g.bbox,
      settings,
      g
    );

    const glyph = new opentype.Glyph({
      name: getGlyphNameForChar(char),
      unicode,
      advanceWidth,
      path,
    });

    fontGlyphs.push(glyph);
    registeredUnicodes.add(unicode);
    userGlyphsByChar.set(char, g);
  }

  // 4. Standard Font Matching: Auto-synthesize missing lowercase if uppercase exists
  if (settings.autoSynthesizeLowercase) {
    for (let c = 65; c <= 90; c++) {
      const upperChar = String.fromCharCode(c);
      const lowerChar = String.fromCharCode(c + 32);
      const lowerUnicode = lowerChar.charCodeAt(0);

      if (!registeredUnicodes.has(lowerUnicode)) {
        // Find corresponding uppercase glyph
        const upperGlyph = userGlyphsByChar.get(upperChar);
        if (upperGlyph && upperGlyph.contours && upperGlyph.contours.length > 0) {
          // Scale down by ~75% for natural small-caps proportion
          const lowerGlyphData = {
            ...upperGlyph,
            char: lowerChar,
            unicode: lowerUnicode,
            isSynthesized: true,
          };

          const { path, advanceWidth } = buildOpenTypeGlyphPath(
            upperGlyph.contours,
            upperGlyph.bbox,
            settings,
            lowerGlyphData
          );

          const glyph = new opentype.Glyph({
            name: getGlyphNameForChar(lowerChar),
            unicode: lowerUnicode,
            advanceWidth: Math.round(advanceWidth * 0.88),
            path,
          });

          fontGlyphs.push(glyph);
          registeredUnicodes.add(lowerUnicode);
          synthesizedCount++;
        }
      }
    }
  }

  // 5. Synthesize missing essential punctuation
  if (settings.autoSynthesizePunctuation) {
    const essentialPunctuation = [".", ",", "-"];
    for (const p of essentialPunctuation) {
      const u = p.charCodeAt(0);
      if (!registeredUnicodes.has(u)) {
        const synthGlyph = synthesizePunctuationGlyph(p, settings.capHeight);
        if (synthGlyph) {
          fontGlyphs.push(synthGlyph);
          registeredUnicodes.add(u);
          synthesizedCount++;
        }
      }
    }
  }

  // Construct Font Object
  const familyName = (settings.family || settings.name || "CustomFont").trim();
  const styleName = settings.styleName || "Regular";

  const font = new opentype.Font({
    familyName,
    styleName,
    unitsPerEm: settings.unitsPerEm || 1000,
    ascender: settings.ascender || 800,
    descender: settings.descender || -200,
    glyphs: fontGlyphs,
  });

  const arrayBuffer = font.toArrayBuffer();
  const blob = new Blob([arrayBuffer], { type: "font/ttf" });
  const blobUrl = URL.createObjectURL(blob);

  return {
    font,
    arrayBuffer,
    blobUrl,
    glyphCount: fontGlyphs.length,
    synthesizedCount,
  };
}

/**
 * Injects a compiled font buffer as a dynamic @font-face into the document.
 */
export async function applyDynamicFontFace(
  fontFamilyName: string,
  arrayBuffer: ArrayBuffer
): Promise<void> {
  try {
    const fontFace = new FontFace(fontFamilyName, arrayBuffer);
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
  } catch (err) {
    console.error("Failed to register dynamic FontFace:", err);
  }
}

function getGlyphNameForChar(char: string): string {
  if (char >= "A" && char <= "Z") return char;
  if (char >= "a" && char <= "z") return char;
  if (char >= "0" && char <= "9") {
    const numNames = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    return numNames[parseInt(char, 10)] || `digit_${char}`;
  }
  const map: Record<string, string> = {
    "!": "exclam",
    "?": "question",
    ".": "period",
    ",": "comma",
    ":": "colon",
    ";": "semicolon",
    "-": "hyphen",
    "+": "plus",
    "=": "equal",
    "/": "slash",
    "@": "at",
    "#": "numbersign",
    "$": "dollar",
    "%": "percent",
    "&": "ampersand",
    "*": "asterisk",
    "(": "parenleft",
    ")": "parenright",
    "'": "quotesingle",
    '"': "quotedbl",
  };
  return map[char] || `uni${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
}
