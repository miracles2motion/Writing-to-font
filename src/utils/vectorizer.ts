import opentype from "opentype.js";
import { BoundingBox, DetectedGlyph, FontSettings, Point } from "../types";

/**
 * Simplifies a polyline using Ramer-Douglas-Peucker algorithm.
 */
export function simplifyDouglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = simplifyDouglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = simplifyDouglasPeucker(points.slice(index), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDistance(p: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  const u = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / (mag * mag);
  const clampedU = Math.max(0, Math.min(1, u));
  const ix = p1.x + clampedU * dx;
  const iy = p1.y + clampedU * dy;
  return Math.hypot(p.x - ix, p.y - iy);
}

/**
 * Signed area of polygon loop. Positive = Clockwise, Negative = Counter-Clockwise
 */
export function polygonSignedArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

/**
 * Extracts vector contours from a single glyph's binary image crop using Marching Squares.
 */
export function extractGlyphContours(
  binaryMask: Uint8Array,
  fullWidth: number,
  fullHeight: number,
  bbox: BoundingBox,
  smoothing = 1.8
): Point[][] {
  // Add 1px safety border around the glyph
  const pad = 2;
  const w = bbox.width + pad * 2;
  const h = bbox.height + pad * 2;
  const localGrid = new Uint8Array(w * h);

  for (let ly = 0; ly < bbox.height; ly++) {
    const gy = bbox.y + ly;
    if (gy < 0 || gy >= fullHeight) continue;
    for (let lx = 0; lx < bbox.width; lx++) {
      const gx = bbox.x + lx;
      if (gx < 0 || gx >= fullWidth) continue;
      if (binaryMask[gy * fullWidth + gx] === 1) {
        localGrid[(ly + pad) * w + (lx + pad)] = 1;
      }
    }
  }

  // Marching squares segment extraction
  type Segment = [Point, Point];
  const segments: Segment[] = [];

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = localGrid[y * w + x];
      const tr = localGrid[y * w + (x + 1)];
      const br = localGrid[(y + 1) * w + (x + 1)];
      const bl = localGrid[(y + 1) * w + x];

      const caseId = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (caseId === 0 || caseId === 15) continue;

      const top: Point = { x: x + 0.5, y };
      const right: Point = { x: x + 1, y: y + 0.5 };
      const bottom: Point = { x: x + 0.5, y: y + 1 };
      const left: Point = { x, y: y + 0.5 };

      switch (caseId) {
        case 1: // bl
          segments.push([bottom, left]);
          break;
        case 2: // br
          segments.push([right, bottom]);
          break;
        case 3: // bl + br
          segments.push([right, left]);
          break;
        case 4: // tr
          segments.push([top, right]);
          break;
        case 5: // tr + bl (saddle)
          segments.push([top, right]);
          segments.push([bottom, left]);
          break;
        case 6: // tr + br
          segments.push([top, bottom]);
          break;
        case 7: // !tl
          segments.push([top, left]);
          break;
        case 8: // tl
          segments.push([left, top]);
          break;
        case 9: // tl + bl
          segments.push([bottom, top]);
          break;
        case 10: // tl + br (saddle)
          segments.push([left, top]);
          segments.push([right, bottom]);
          break;
        case 11: // !tr
          segments.push([right, top]);
          break;
        case 12: // tl + tr
          segments.push([left, right]);
          break;
        case 13: // !br
          segments.push([bottom, right]);
          break;
        case 14: // !bl
          segments.push([left, bottom]);
          break;
      }
    }
  }

  // Connect segments into closed contour loops
  const loops: Point[][] = [];
  const remaining = [...segments];

  while (remaining.length > 0) {
    const startSeg = remaining.pop()!;
    const loop: Point[] = [startSeg[0], startSeg[1]];

    let closed = false;
    let maxSteps = 2000;

    while (!closed && maxSteps-- > 0) {
      const currentHead = loop[loop.length - 1];
      let foundIndex = -1;
      let reverse = false;

      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        if (Math.hypot(seg[0].x - currentHead.x, seg[0].y - currentHead.y) < 0.1) {
          foundIndex = i;
          reverse = false;
          break;
        } else if (Math.hypot(seg[1].x - currentHead.x, seg[1].y - currentHead.y) < 0.1) {
          foundIndex = i;
          reverse = true;
          break;
        }
      }

      if (foundIndex >= 0) {
        const nextSeg = remaining.splice(foundIndex, 1)[0];
        const nextPt = reverse ? nextSeg[0] : nextSeg[1];

        // Check if loop closed back to start
        if (Math.hypot(nextPt.x - loop[0].x, nextPt.y - loop[0].y) < 0.4) {
          closed = true;
        } else {
          loop.push(nextPt);
        }
      } else {
        // Disconnected fragment, close to start
        closed = true;
      }
    }

    if (loop.length >= 4) {
      // Offset local coords back to glyph bounding box
      const adjusted = loop.map((pt) => ({
        x: pt.x - pad,
        y: pt.y - pad,
      }));

      // Simplify
      const simplified = simplifyDouglasPeucker(adjusted, Math.max(0.4, smoothing));
      if (simplified.length >= 3) {
        loops.push(simplified);
      }
    }
  }

  return loops;
}

/**
 * Converts loops into SVG path string for preview and rendering.
 */
export function contoursToSvgPath(contours: Point[][]): string {
  if (!contours || contours.length === 0) return "";
  let d = "";

  for (const contour of contours) {
    if (contour.length < 3) continue;
    d += ` M ${contour[0].x.toFixed(1)} ${contour[0].y.toFixed(1)}`;

    for (let i = 1; i < contour.length; i++) {
      const curr = contour[i];
      const next = contour[(i + 1) % contour.length];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
    }

    d += " Z";
  }

  return d;
}

/**
 * Builds an opentype.Path for a glyph scaled into font coordinates.
 */
export function buildOpenTypeGlyphPath(
  contours: Point[][],
  bbox: BoundingBox,
  fontSettings: FontSettings,
  glyph: DetectedGlyph
): { path: opentype.Path; advanceWidth: number } {
  const path = new opentype.Path();

  if (!contours || contours.length === 0) {
    // Return empty path with default advance
    return {
      path,
      advanceWidth: fontSettings.spaceWidth || 320,
    };
  }

  // Calculate target scale and baseline
  // Normal capital letters fit into capHeight (e.g. 700 units)
  const isLower = glyph.char >= "a" && glyph.char <= "z";
  const targetEmHeight = isLower
    ? fontSettings.xHeight || 500
    : fontSettings.capHeight || 700;

  const glyphH = Math.max(1, bbox.height);
  const scale = targetEmHeight / glyphH;

  const leftBearing = glyph.leftBearing ?? Math.round(fontSettings.letterSpacing * 0.5);
  const rightBearing = glyph.rightBearing ?? Math.round(fontSettings.letterSpacing * 0.5);
  const calculatedAdvance = Math.round(bbox.width * scale + leftBearing + rightBearing);

  // In OpenType / TrueType, Y = 0 is baseline, Y > 0 is upwards towards ascender
  // In image coordinates, Y = 0 is top of bbox, Y = bbox.height is bottom
  for (const contour of contours) {
    if (contour.length < 3) continue;

    // First point
    const startX = Math.round(leftBearing + contour[0].x * scale);
    const startY = Math.round((bbox.height - contour[0].y) * scale);
    path.moveTo(startX, startY);

    for (let i = 1; i < contour.length; i++) {
      const curr = contour[i];
      const next = contour[(i + 1) % contour.length];

      const cx = Math.round(leftBearing + curr.x * scale);
      const cy = Math.round((bbox.height - curr.y) * scale);

      const mx = Math.round(leftBearing + ((curr.x + next.x) / 2) * scale);
      const my = Math.round((bbox.height - (curr.y + next.y) / 2) * scale);

      path.quadraticCurveTo(cx, cy, mx, my);
    }

    path.close();
  }

  return {
    path,
    advanceWidth: calculatedAdvance,
  };
}
