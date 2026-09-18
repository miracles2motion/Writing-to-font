/**
 * Generates rich sample character sheet images on white backgrounds
 * for testing and immediate demonstration.
 */

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  style: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "handwritten",
    name: "Handmade Marker Caps & Digits",
    description: "Casual hand-drawn uppercase alphabet, numbers, and symbols on clean white paper.",
    style: "marker",
  },
  {
    id: "geometric",
    name: "Modern Geometric Display",
    description: "Bold clean modern geometric letterforms and characters.",
    style: "geometric",
  },
  {
    id: "retro",
    name: "Vintage Grotesque Print",
    description: "Classic stylized display letters with heavy punchy contrast.",
    style: "retro",
  },
];

export function generateSampleSheet(presetId: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Crisp white background (as user described: "It's just an image file and I designed it. It has a white background.")
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle natural paper grain/warmth for realism that still thresholds cleanly
  ctx.fillStyle = "#0f172a"; // Deep rich ink

  const rows = [
    ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    ["K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"],
    ["U", "V", "W", "X", "Y", "Z", "0", "1", "2", "3"],
    ["4", "5", "6", "7", "8", "9", "!", "?", "&", "#"],
    ["$", "%", "*", "+", "-", "=", ".", ",", ":", ";"],
  ];

  if (presetId === "geometric") {
    ctx.font = "bold 64px 'Space Grotesk', 'Arial Black', sans-serif";
  } else if (presetId === "retro") {
    ctx.font = "bold 68px 'Georgia', serif";
  } else {
    // Casual handwritten style
    ctx.font = "bold 66px 'Comic Sans MS', 'Trebuchet MS', 'Chalkboard SE', cursive, sans-serif";
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const startY = 120;
  const rowHeight = 135;
  const colWidth = 115;
  const startX = 80;

  rows.forEach((row, rowIndex) => {
    const y = startY + rowIndex * rowHeight;
    row.forEach((char, colIndex) => {
      const x = startX + colIndex * colWidth;

      // Add tiny natural organic tilt for handwritten preset
      if (presetId === "handwritten") {
        ctx.save();
        const angle = ((colIndex * 13 + rowIndex * 7) % 9 - 4) * 0.015;
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(char, x, y);
      }
    });
  });

  return canvas.toDataURL("image/png");
}
