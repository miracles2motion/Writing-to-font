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
    id: "cultural",
    name: "African Cultural Pattern & Textures",
    description: "Rich cultural geometric surfaces, vibrant kente ochre, terracotta, and indigo patterns on each letter.",
    style: "cultural",
  },
  {
    id: "dualcase",
    name: "Dual-Case Alphabet (A-Z & a-z & 0-9)",
    description: "Complete handwriting sheet with distinct uppercase capitals, lowercase ascenders/descenders, and numbers.",
    style: "dualcase",
  },
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

  // 1. Crisp white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let rows: string[][];
  if (presetId === "dualcase") {
    rows = [
      ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"],
      ["N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
      ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"],
      ["n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],
      ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "!", "?", "."],
    ];
  } else {
    rows = [
      ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      ["K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"],
      ["U", "V", "W", "X", "Y", "Z", "0", "1", "2", "3"],
      ["4", "5", "6", "7", "8", "9", "!", "?", "&", "#"],
      ["$", "%", "*", "+", "-", "=", ".", ",", ":", ";"],
    ];
  }

  const culturalPalettes = [
    ["#d97706", "#b45309", "#92400e"], // Warm gold / ochre
    ["#dc2626", "#991b1b", "#7f1d1d"], // Terracotta red
    ["#0284c7", "#0369a1", "#075985"], // Vibrant indigo / cyan
    ["#16a34a", "#15803d", "#166534"], // Emerald forest
    ["#9333ea", "#7e22ce", "#6b21a8"], // Royal amethyst
  ];

  if (presetId === "geometric") {
    ctx.font = "bold 64px 'Space Grotesk', 'Arial Black', sans-serif";
  } else if (presetId === "retro") {
    ctx.font = "bold 68px 'Georgia', serif";
  } else if (presetId === "cultural") {
    ctx.font = "900 68px 'Arial Black', 'Impact', sans-serif";
  } else if (presetId === "dualcase") {
    ctx.font = "bold 52px 'Comic Sans MS', 'Trebuchet MS', cursive, sans-serif";
  } else {
    // Casual handwritten style
    ctx.font = "bold 66px 'Comic Sans MS', 'Trebuchet MS', 'Chalkboard SE', cursive, sans-serif";
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const isDual = presetId === "dualcase";
  const startY = isDual ? 90 : 120;
  const rowHeight = isDual ? 135 : 135;
  const colWidth = isDual ? 86 : 115;
  const startX = isDual ? 60 : 80;

  rows.forEach((row, rowIndex) => {
    const y = startY + rowIndex * rowHeight;
    row.forEach((char, colIndex) => {
      const x = startX + colIndex * colWidth;

      if (presetId === "cultural") {
        // Render rich cultural multi-color patterns on each letter
        ctx.save();
        const palette = culturalPalettes[(colIndex + rowIndex * 2) % culturalPalettes.length];
        
        // Create custom diagonal gradient pattern for cultural surface
        const grad = ctx.createLinearGradient(x - 30, y - 35, x + 30, y + 35);
        grad.addColorStop(0, palette[0]);
        grad.addColorStop(0.5, palette[1]);
        grad.addColorStop(1, palette[2]);
        ctx.fillStyle = grad;

        // Draw character
        ctx.fillText(char, x, y);

        // Draw intricate cultural geometric accents over the character strokes
        ctx.save();
        ctx.beginPath();
        // Clip to character
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#fef08a"; // Gold highlight line
        ctx.strokeText(char, x, y);
        ctx.restore();

        ctx.restore();
      } else if (presetId === "handwritten" || presetId === "dualcase") {
        ctx.fillStyle = "#0f172a";
        ctx.save();
        const angle = ((colIndex * 13 + rowIndex * 7) % 9 - 4) * 0.015;
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = "#0f172a";
        ctx.fillText(char, x, y);
      }
    });
  });

  return canvas.toDataURL("image/png");
}

/**
 * Generates a clean, high-resolution printable PDF/PNG template with light guide boxes
 * labeled with A-Z, a-z, and 0-9 for users to print, write, and scan/photograph.
 */
export function generatePrintableTemplateSheet(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 2480; // High-res A4 / 300 DPI equivalent width
  canvas.height = 3508; // High-res A4 height
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Crisp white paper background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Header and instructions
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("IMAGE TO FONT STUDIO — HANDWRITING TEMPLATE SHEET", 120, 160);

  ctx.fillStyle = "#64748b";
  ctx.font = "normal 32px sans-serif";
  ctx.fillText(
    "Write one character clearly inside each box with a black or dark pen/marker. Keep strokes inside the dotted box.",
    120,
    220
  );

  // Outer border
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 4;
  ctx.strokeRect(100, 280, canvas.width - 200, canvas.height - 380);

  const sections = [
    {
      title: "UPPERCASE LETTERS (A – Z)",
      rows: [
        ["A", "B", "C", "D", "E", "F", "G"],
        ["H", "I", "J", "K", "L", "M", "N"],
        ["O", "P", "Q", "R", "S", "T", "U"],
        ["V", "W", "X", "Y", "Z", "", ""],
      ],
      startY: 360,
    },
    {
      title: "LOWERCASE LETTERS (a – z)",
      rows: [
        ["a", "b", "c", "d", "e", "f", "g"],
        ["h", "i", "j", "k", "l", "m", "n"],
        ["o", "p", "q", "r", "s", "t", "u"],
        ["v", "w", "x", "y", "z", "", ""],
      ],
      startY: 1400,
    },
    {
      title: "NUMBERS & ESSENTIAL SYMBOLS (0 – 9, ! ? . , -)",
      rows: [
        ["0", "1", "2", "3", "4", "5", "6"],
        ["7", "8", "9", "!", "?", ".", ","],
      ],
      startY: 2440,
    },
  ];

  const cellWidth = 300;
  const cellHeight = 210;
  const gapX = 18;
  const gapY = 18;
  const marginX = 140;

  sections.forEach((section) => {
    // Section Header
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(section.title, marginX, section.startY);

    section.rows.forEach((row, rIdx) => {
      const rowY = section.startY + 40 + rIdx * (cellHeight + gapY);

      row.forEach((charLabel, cIdx) => {
        if (!charLabel) return; // empty filler box

        const cellX = marginX + cIdx * (cellWidth + gapX);

        // Draw light grey dotted/solid guide box
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.strokeRect(cellX, rowY, cellWidth, cellHeight);

        // Baseline guideline (subtle dashed line)
        ctx.save();
        ctx.strokeStyle = "#f1f5f9";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(cellX + 15, rowY + cellHeight - 50);
        ctx.lineTo(cellX + cellWidth - 15, rowY + cellHeight - 50);
        ctx.stroke();
        ctx.restore();

        // Small faint reference label in top-left corner
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(charLabel, cellX + 16, rowY + 36);
      });
    });
  });

  // Footer branding
  ctx.fillStyle = "#94a3b8";
  ctx.font = "normal 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Tip: After writing, take a well-lit flat photo or scan and upload to Image to Font Studio.",
    canvas.width / 2,
    canvas.height - 40
  );

  return canvas.toDataURL("image/png");
}

