import { BoundingBox, DetectedGlyph, ImageProcessingSettings } from "../types";

export interface ProcessedImageResult {
  cleanedCanvas: HTMLCanvasElement;
  binaryMask: Uint8Array;
  width: number;
  height: number;
}

/**
 * Removes white background from image and builds binary mask of ink glyphs.
 */
export function removeBackgroundAndBinarize(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  settings: ImageProcessingSettings
): ProcessedImageResult {
  const width = sourceImage.width;
  const height = sourceImage.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not create 2D canvas context");
  }

  ctx.drawImage(sourceImage, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const binaryMask = new Uint8Array(width * height);
  const threshold = settings.whiteThreshold;
  const contrastFactor = settings.contrast;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply contrast
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
      // High-contrast clean ink on transparent background
      data[i] = 15; // Dark slate ink
      data[i + 1] = 23;
      data[i + 2] = 42;
      data[i + 3] = 255;
    } else {
      binaryMask[pixelIndex] = 0;
      // Transparent background
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    cleanedCanvas: canvas,
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

  // Multi-part character grouping (e.g., dots of i/j, colon, semicolon, exclamation, question mark, equals, percent)
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

        // Check if `o` is vertically stacked or directly adjacent to `b`
        const xOverlap = Math.min(b.x + b.width, o.x + o.width) - Math.max(b.x, o.x);
        const yOverlap = Math.min(b.y + b.height, o.y + o.height) - Math.max(b.y, o.y);

        const isVerticallyAligned =
          xOverlap > -8 &&
          (Math.abs(b.y - (o.y + o.height)) < maxGap ||
            Math.abs(o.y - (b.y + b.height)) < maxGap);

        const isDiagonallyClose =
          xOverlap > -5 &&
          yOverlap > -5 &&
          Math.hypot(b.x - o.x, b.y - o.y) < maxGap * 1.2;

        if (isVerticallyAligned || isDiagonallyClose) {
          // Merge bounding boxes
          const minX = Math.min(b.x, o.x);
          const minY = Math.min(b.y, o.y);
          const maxX = Math.max(b.x + b.width, o.x + o.width);
          const maxY = Math.max(b.y + b.height, o.y + o.height);

          // Avoid merging completely different lines of text
          const mergedHeight = maxY - minY;
          const avgSingleHeight = (b.height + o.height) / 2;
          if (mergedHeight < avgSingleHeight * 2.8) {
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

    // Extract cropped preview
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

    return {
      id: `glyph-${index}-${char}-${Date.now()}`,
      char,
      unicode,
      bbox,
      canvasDataUrl: cropCanvas.toDataURL("image/png"),
      advanceWidth: Math.round(bbox.width * 1.25),
      leftBearing: 20,
      rightBearing: 20,
    };
  });
}
