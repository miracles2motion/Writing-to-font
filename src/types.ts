export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedGlyph {
  id: string;
  char: string;
  unicode: number;
  bbox: BoundingBox;
  confidence?: number;
  canvasDataUrl?: string; // Monochrome/silhouette for vectorization
  colorCanvasDataUrl?: string; // High-resolution cutout preserving real cultural surface colors & patterns
  isSynthesized?: boolean;
  baselineOffset?: number;
  advanceWidth?: number;
  leftBearing?: number;
  rightBearing?: number;
  contours?: Point[][];
  svgPath?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface SheetQualityAssessment {
  isValidSheet: boolean;
  isLikelyPhoto: boolean;
  inkCoverageRatio: number; // 0 to 1, % of image that turned into foreground ink
  edgeTouchingInkRatio: number; // 0 to 1, % of border perimeter covered in ink
  glyphCount: number;
  warnings: string[];
  recommendation: string;
}

export interface ImageProcessingSettings {
  whiteThreshold: number; // 0-255, pixels brighter than this become transparent
  contrast: number; // 1.0 - 2.5
  invert: boolean; // flip dark and light
  minGlyphArea: number; // minimum pixels for a valid glyph
  mergeDistance: number; // merge multi-part glyphs (e.g. i, j, :, !)
  smoothing: number; // contour simplification factor
}

export interface FontSettings {
  name: string;
  family: string;
  styleName: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
  spaceWidth: number;
  letterSpacing: number;
  autoSynthesizeLowercase: boolean;
  autoSynthesizePunctuation: boolean;
}

export type StudioTab = "upload" | "glyphs" | "metrics" | "test" | "export";
