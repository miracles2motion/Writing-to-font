import { BoundingBox, DetectedGlyph, ImageProcessingSettings, SheetQualityAssessment } from "../types";

export interface ProcessedImageResult {
  cleanedCanvas: HTMLCanvasElement;
  colorCanvas: HTMLCanvasElement;
  binaryMask: Uint8Array;
  width: number;
  height: number;
  quality?: SheetQualityAssessment;
}

/**
 * Analyzes binary mask and detected regions to check if the uploaded image
 * is a valid character/alphabet sheet rather than a natural photo, cluttered scene,
 * or full-bleed image of people.
 */
export function evaluateSheetQuality(
  binaryMask: Uint8Array,
  width: number,
  height: number,
  glyphCount: number
): SheetQualityAssessment {
  const totalPixels = width * height;
  let inkPixels = 0;
  let edgeInkPixels = 0;
  const edgeMargin = Math.max(2, Math.min(8, Math.floor(Math.min(width, height) * 0.015)));

  for (let y = 0; y < height; y++) {
    const isTopOrBottom = y < edgeMargin || y >= height - edgeMargin;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binaryMask[idx] === 1) {
        inkPixels++;
        if (isTopOrBottom || x < edgeMargin || x >= width - edgeMargin) {
          edgeInkPixels++;
        }
      }
    }
  }

  const inkCoverageRatio = inkPixels / totalPixels;
  // Border perimeter total pixels
  const totalBorderPixels = (width * 2 + height * 2) * edgeMargin;
  const edgeTouchingInkRatio = edgeInkPixels / Math.max(1, totalBorderPixels);

  const warnings: string[] = [];
  let isLikelyPhoto = false;

  // Real character sheets typically have 2% - 30% ink coverage (vast majority is white/light paper background)
  // Photos of people, landscapes, or solid graphics typically have > 40% ink coverage
  if (inkCoverageRatio > 0.45) {
    isLikelyPhoto = true;
    warnings.push(
      `High foreground density (${Math.round(inkCoverageRatio * 100)}% non-white area). Character sheets should be mostly clean light paper.`
    );
  } else if (inkCoverageRatio < 0.005) {
    warnings.push("Very faint or virtually blank image. Almost no ink strokes detected.");
  }

  // Edge bleeding: Character sheets almost always have clean white margins around the edges
  // Photos typically bleed all the way to the 4 edges of the image
  if (edgeTouchingInkRatio > 0.25) {
    isLikelyPhoto = true;
    warnings.push(
      `Dark areas bleed across ${Math.round(edgeTouchingInkRatio * 100)}% of the outer image borders, characteristic of a scene or photograph.`
    );
  }

  // Fragment count: Natural photos binarize into hundreds of micro-blobs
  if (glyphCount > 150) {
    isLikelyPhoto = true;
    warnings.push(
      `Extracted an unusually high count of fragments (${glyphCount}). Real font sheets typically contain 26 to 100 characters.`
    );
  } else if (glyphCount === 0) {
    warnings.push("No distinct character regions detected.");
  }

  const isValidSheet = !isLikelyPhoto && glyphCount >= 1 && glyphCount <= 120 && inkCoverageRatio <= 0.40;

  let recommendation = "Good character sheet format detected. Clean background and clear isolated glyphs.";
  if (isLikelyPhoto) {
    recommendation =
      "This image appears to be a photo or complex scene rather than a character sheet. For best font creation results, please upload a drawn or printed alphabet/number grid on a plain white or light background.";
  } else if (warnings.length > 0) {
    recommendation = "Some background noise or marginal elements detected. You can adjust the White Cutoff Threshold on the left to refine.";
  }

  return {
    isValidSheet,
    isLikelyPhoto,
    inkCoverageRatio,
    edgeTouchingInkRatio,
    glyphCount,
    warnings,
    recommendation,
  };
}

/**
 * Removes white background from image and builds binary mask of ink glyphs.
 * Preserves both:
 * 1. cleanedCanvas: high-contrast monochrome ink for vectorization
 * 2. colorCanvas: 100% original full-color cultural surface & textures on transparent background
 */
export function removeBackgroundAndBinarize(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  settings: ImageProcessingSettings
): ProcessedImageResult {
  const width = sourceImage.width;
  const height = sourceImage.height;

  // Canvas 1: Cleaned monochrome canvas for vector contour tracing
  const monoCanvas = document.createElement("canvas");
  monoCanvas.width = width;
  monoCanvas.height = height;
  const monoCtx = monoCanvas.getContext("2d", { willReadFrequently: true });
  if (!monoCtx) throw new Error("Could not create 2D canvas context");

  // Canvas 2: Full-color cultural canvas preserving authentic artwork and textures
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext("2d", { willReadFrequently: true });
  if (!colorCtx) throw new Error("Could not create color canvas context");

  monoCtx.drawImage(sourceImage, 0, 0);
  colorCtx.drawImage(sourceImage, 0, 0);

  const monoImgData = monoCtx.getImageData(0, 0, width, height);
  const monoData = monoImgData.data;

  const colorImgData = colorCtx.getImageData(0, 0, width, height);
  const colorData = colorImgData.data;

  const binaryMask = new Uint8Array(width * height);
  const threshold = settings.whiteThreshold;
  const contrastFactor = settings.contrast;

  for (let i = 0; i < monoData.length; i += 4) {
    let r = monoData[i];
    let g = monoData[i + 1];
    let b = monoData[i + 2];

    // Apply contrast for threshold calculation
    if (contrastFactor !== 1.0) {
      r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
      g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
      b = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128));
    }

    // Perceived luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let isInk = lum < threshold;
    if (settings.invert) {
      isInk = !isInk;
    }

    const pixelIndex = i / 4;
    if (isInk) {
      binaryMask[pixelIndex] = 1;
      // Monochrome canvas: clean slate for vector tracing
      monoData[i] = 15;
      monoData[i + 1] = 23;
      monoData[i + 2] = 42;
      monoData[i + 3] = 255;

      // Color canvas: KEEP authentic original colors and textures, ensure full opacity
      colorData[i + 3] = 255;
    } else {
      binaryMask[pixelIndex] = 0;
      // Both canvases get transparent background
      monoData[i + 3] = 0;
      colorData[i + 3] = 0;
    }
  }

  monoCtx.putImageData(monoImgData, 0, 0);
  colorCtx.putImageData(colorImgData, 0, 0);

  return {
    cleanedCanvas: monoCanvas,
    colorCanvas,
    binaryMask,
    width,
    height,
  };
}

/**
 * Detects connected ink regions and groups multi-part characters (e.g. i, j, :, !, ?, =, %)
 */
export function segmentGlyphs(
  binaryMask: Uint8Array,
  width: number,
  height: number,
  cleanedCanvas: HTMLCanvasElement,
  colorCanvas: HTMLCanvasElement,
  settings: ImageProcessingSettings
): DetectedGlyph[] {
  const visited = new Uint8Array(width * height);
  const rawBoxes: BoundingBox[] = [];

  // Breadth-first / Flood fill for connected components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binaryMask[idx] === 1 && visited[idx] === 0) {
        // Found new component
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let pixelCount = 0;

        const queue: number[] = [idx];
        visited[idx] = 1;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          const cy = Math.floor(curr / width);
          const cx = curr % width;
          pixelCount++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // Check 4-connected neighbors
          const neighbors = [
            curr - 1, // left
            curr + 1, // right
            curr - width, // up
            curr + width, // down
          ];

          for (const n of neighbors) {
            if (n >= 0 && n < visited.length) {
              const nx = n % width;
              const ny = Math.floor(n / width);
              // Ensure we don't wrap edges
              if (Math.abs(nx - cx) <= 1 && Math.abs(ny - cy) <= 1) {
                if (binaryMask[n] === 1 && visited[n] === 0) {
                  visited[n] = 1;
                  queue.push(n);
                }
              }
            }
          }
        }

        const bWidth = maxX - minX + 1;
        const bHeight = maxY - minY + 1;
        const area = bWidth * bHeight;

        // Filter out microscopic noise specks
        if (pixelCount >= settings.minGlyphArea && area >= settings.minGlyphArea) {
          // Reject full-canvas borders or outer framing artifacts
          if (bWidth < width * 0.95 && bHeight < height * 0.95) {
            // Discard blobs that touch the absolute perimeter if they span wide/tall (edge photographic borders/shadows)
            const touchesBorder = minX <= 1 || minY <= 1 || maxX >= width - 2 || maxY >= height - 2;
            const isBorderClutter = touchesBorder && (bWidth > width * 0.35 || bHeight > height * 0.35);
            if (!isBorderClutter) {
              rawBoxes.push({
                x: minX,
                y: minY,
                width: bWidth,
                height: bHeight,
              });
            }
          }
        }
      }
    }
  }

  // Multi-part character grouping: STRICTLY for vertical accents & dots (e.g. dots of i/j, colon, semicolon, !, ?, =)
  // NEVER merge horizontally adjacent characters into each other!
  const mergedBoxes: BoundingBox[] = [];
  const used = new Set<number>();

  const maxGap = settings.mergeDistance;

  for (let i = 0; i < rawBoxes.length; i++) {
    if (used.has(i)) continue;
    let b = { ...rawBoxes[i] };
    used.add(i);

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < rawBoxes.length; j++) {
        if (used.has(j)) continue;
        const o = rawBoxes[j];

        // Horizontal overlap (must have true positive overlap, never negative)
        const xOverlap = Math.min(b.x + b.width, o.x + o.width) - Math.max(b.x, o.x);

        // Centers must be horizontally aligned (one is stacked vertically above/below the other)
        const bCenterX = b.x + b.width / 2;
        const oCenterX = o.x + o.width / 2;
        const centerDistanceX = Math.abs(bCenterX - oCenterX);
        const maxAllowedCenterDiff = Math.max(b.width, o.width) * 0.75;

        // Vertical distance between components
        const verticalDistance =
          b.y > o.y
            ? b.y - (o.y + o.height)
            : o.y - (b.y + b.height);

        // Character height comparison: at least one component MUST be an accent or dot, OR both are small punctuation (:, =)
        const minH = Math.min(b.height, o.height);
        const maxH = Math.max(b.height, o.height);
        const isAccentOrDot = minH < maxH * 0.55 || (b.height < 45 && o.height < 45);

        // Only merge if vertically stacked, horizontally aligned, with positive xOverlap, and one is an accent/dot
        const shouldMerge =
          verticalDistance >= -4 &&
          verticalDistance < maxGap &&
          centerDistanceX < maxAllowedCenterDiff &&
          xOverlap > 2 &&
          isAccentOrDot;

        if (shouldMerge) {
          const minX = Math.min(b.x, o.x);
          const minY = Math.min(b.y, o.y);
          const maxX = Math.max(b.x + b.width, o.x + o.width);
          const maxY = Math.max(b.y + b.height, o.y + o.height);

          // Guard against merging distinct lines
          const mergedHeight = maxY - minY;
          const avgSingleHeight = (b.height + o.height) / 2;
          if (mergedHeight < avgSingleHeight * 2.5) {
            b = {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            };
            used.add(j);
            changed = true;
          }
        }
      }
    }
    mergedBoxes.push(b);
  }

  // Sort boxes in natural visual reading order (rows top-to-bottom, left-to-right)
  if (mergedBoxes.length === 0) return [];

  // Estimate average glyph height to group into lines
  const medianHeight =
    mergedBoxes.map((b) => b.height).sort((a, b) => a - b)[
      Math.floor(mergedBoxes.length / 2)
    ] || 50;
  const lineThreshold = medianHeight * 0.65;

  const rows: BoundingBox[][] = [];
  const sortedByY = [...mergedBoxes].sort((a, b) => a.y - b.y);

  for (const box of sortedByY) {
    let placed = false;
    for (const row of rows) {
      const rowAvgY =
        row.reduce((sum, item) => sum + item.y + item.height / 2, 0) /
        row.length;
      const boxCenterY = box.y + box.height / 2;
      if (Math.abs(boxCenterY - rowAvgY) < lineThreshold) {
        row.push(box);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rows.push([box]);
    }
  }

  // Sort each row left-to-right
  const orderedBoxes: BoundingBox[] = [];
  rows
    .sort((r1, r2) => {
      const y1 = r1.reduce((s, b) => s + b.y, 0) / r1.length;
      const y2 = r2.reduce((s, b) => s + b.y, 0) / r2.length;
      return y1 - y2;
    })
    .forEach((row) => {
      row.sort((a, b) => a.x - b.x);
      orderedBoxes.push(...row);
    });

  // Default character mapping sequence (standard uppercase A-Z, digits 0-9, then common punctuation)
  const defaultSequence = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ..."0123456789",
    ..."!?.,:;\"'-+=/@#$%&*()",
  ];

  return orderedBoxes.map((bbox, index) => {
    const char =
      index < defaultSequence.length ? defaultSequence[index] : `?`;
    const unicode = char.charCodeAt(0);

    // Extract cropped monochrome preview
    const cropCanvas = document.createElement("canvas");
    const pad = 4;
    cropCanvas.width = bbox.width + pad * 2;
    cropCanvas.height = bbox.height + pad * 2;
    const cropCtx = cropCanvas.getContext("2d");
    if (cropCtx) {
      cropCtx.drawImage(
        cleanedCanvas,
        bbox.x,
        bbox.y,
        bbox.width,
        bbox.height,
        pad,
        pad,
        bbox.width,
        bbox.height
      );
    }

    // Extract cropped full-color cultural preview (with authentic colors, textures & transparent bg)
    const colorCropCanvas = document.createElement("canvas");
    colorCropCanvas.width = bbox.width + pad * 2;
    colorCropCanvas.height = bbox.height + pad * 2;
    const colorCropCtx = colorCropCanvas.getContext("2d");
    if (colorCropCtx) {
      colorCropCtx.drawImage(
        colorCanvas,
        bbox.x,
        bbox.y,
        bbox.width,
        bbox.height,
        pad,
        pad,
        bbox.width,
        bbox.height
      );
    }

    return {
      id: `glyph-${index}-${char}-${Date.now()}`,
      char,
      unicode,
      bbox,
      canvasDataUrl: cropCanvas.toDataURL("image/png"),
      colorCanvasDataUrl: colorCropCanvas.toDataURL("image/png"),
      advanceWidth: Math.round(bbox.width * 1.25),
      leftBearing: 20,
      rightBearing: 20,
    };
  });
}
