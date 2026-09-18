# Image to Font Studio
https://miracles2motion.github.io/Writing-to-font/


A browser-based font creation studio that converts hand-drawn or designed character sheet images into installable **TrueType (`.ttf`)** font files.

Upload an image containing letters, numbers, and symbols on a white background. The studio automatically removes the background, segments each glyph, traces vector contours, harmonizes missing characters to match standard font specifications, and compiles a ready-to-use `.ttf` font file with a live interactive typing playground.

---

## ✨ Features

- **White Background Removal & Binarization**:
  - Automatic background removal with customizable white threshold, contrast boost, and speckle noise filtering.
  - Transparent preview showing isolated ink strokes.
  
- **Intelligent Glyph Segmentation & Vectorization**:
  - Connected component labeling discovers individual characters across the sheet.
  - Smart clustering unifies multi-part glyphs (vertical dots on `i`, `j`, `!`, `?`, `:`, `;`) while strictly preventing horizontal bleeding into neighboring letters.
  - Marching Squares contour tracing converts pixel contours into clean vector outlines.

- **Manual Glyph Review & Cutout Editor**:
  - **Interactive Crop & Cutout Modal**: Click **Edit Crop** on any character to drag or resize bounding boxes, trim excess whitespace, or remove neighboring strokes that slipped in.
  - **Neighbor Bleed Trimming**: Directional edge-nudging buttons (Trim Left, Trim Right, Trim Top, Trim Bottom) for pixel-perfect isolation.
  - **Character Split Tool**: For letters drawn too closely that became fused together, easily split them horizontally into two distinct independent glyphs in one click.
  - **Single-Character AI Classification**: Re-classify any individual edited glyph with dedicated Gemini vision.

- **Uppercase vs. Lowercase Recognition & Management**:
  - **Full Casing Awareness**: Distinguishes between uppercase (`A-Z`) and lowercase (`a-z`) glyphs based on relative x-height, ascenders, descenders, and visual geometry.
  - **Quick Casing Toggle (`a ⇄ A`)**: Instantly toggle individual characters between uppercase and lowercase with a single click.
  - **Batch Case Conversion**: Select any group of characters and convert them simultaneously to lowercase or uppercase.
  - **Casing Badges & Filters**: Visual color-coded tags (`[CAP]` blue, `[lower]` amber, `[0-9]` emerald) and instant filter tabs.
  - **Expanded Sequencing Presets**: Auto-sequence `A-Z, a-z, 0-9`, `a-z, 0-9`, `Aa, Bb, Cc...`, or standalone alphabets.

- **Standard Font Specification Matching**:
  - **Synthesize Missing Lowercase (`a-z`)**: If your sheet only includes uppercase characters, the studio automatically derives harmonized small-caps lowercase glyphs so typing normal text never produces blank squares.
  - **Synthesize Essential Punctuation**: Generates standard period (`.`), comma (`,`), hyphen (`-`), and spacebar characters.
  - **Typographic Metrics**: Tune standard baseline, ascender (800), descender (-200), units per em (1000), space width, and side-bearing tracking.

- **Live Typing Playground & Specimen Waterfall**:
  - Real-time `@font-face` preview powered by the in-memory OpenType binary compiler.
  - Interactive multi-size specimen waterfall (16px to 72px).
  - Built-in classic pangrams and editable text canvas.

- **Dual Export Editions (Cultural Color & Standard Font)**:
  - **Authentic Cultural Color Character Asset Pack (`.ZIP`)**: Preserves the original individual cultural background colors, surface patterns, and textures designed onto each character with transparent backgrounds. Includes high-resolution transparent PNGs for every character (`A.png`, `B.png`...), SVG wrappers, a consolidated transparent character sheet, metadata `manifest.json`, and an HTML web gallery preview.
  - **Cultural Color Art Typesetter**: Interactive canvas where you can type any words or sentences and render them live using the authentic colorful cultural characters, with custom spacing, sizing, backgrounds, and instant high-res PNG artwork download.
  - **Standard TrueType Vector Font (`.ttf`)**: Compiled single-color scalable vector font installable into Windows, macOS, Figma, Photoshop, Illustrator, and Microsoft Word.

- **One-Click Export**:
  - Direct download of both the `.ttf` TrueType font file and the Full-Color Cultural Asset Pack (`.zip`).
  - Ready-to-use CSS `@font-face` code snippet for web embedding.
  - Desktop installation instructions for Windows, macOS, Figma, Photoshop, Illustrator, and Word.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18, 20, or later)
- `npm` or `bun`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/image-to-font-studio.git
   cd image-to-font-studio
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. *(Optional)* Set up your Gemini API key for AI handwriting recognition:
   ```bash
   cp .env.example .env
   ```
   Add your key to `.env`:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```
   *(Note: The core font creation and compilation engine works 100% locally in the browser without any API key!)*

4. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to GitHub Pages

This repository includes a ready-to-use GitHub Actions workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Steps to Deploy:

1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

2. Enable **GitHub Actions** as the Pages deployment source:
   - In your GitHub repository, click **Settings** (top bar).
   - In the left sidebar, click **Pages**.
   - Under **Build and deployment** → **Source**, change the dropdown to **GitHub Actions**.

3. Trigger the deployment:
   - Go to the **Actions** tab in your repository.
   - Select **Deploy to GitHub Pages** from the left list.
   - Click **Run workflow**.

Once completed, your live site will be accessible at:
```
https://<your-username>.github.io/<your-repo-name>/
```

---

## 🛠️ Project Structure

```
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages deployment workflow
├── src/
│   ├── components/
│   │   ├── Header.tsx            # Navigation and compile status
│   │   ├── UploadAndCutout.tsx   # Image upload, background removal, threshold sliders
│   │   ├── GlyphGrid.tsx         # Interactive glyph cards, re-tagging & sequencing
│   │   ├── GlyphCropModal.tsx    # Manual bounding box crop, neighbor trim & split modal
│   │   ├── MetricsCompleter.tsx  # Standard font completion & metric sliders
│   │   ├── TypeTester.tsx        # Live interactive typing playground & waterfall
│   │   └── ExportPanel.tsx       # .TTF download, CSS snippet & install instructions
│   ├── utils/
│   │   ├── imageProcessor.ts     # Binarization & connected-component segmentation
│   │   ├── glyphUtils.ts         # Crop adjustment, character splitting & casing helpers
│   │   ├── vectorizer.ts         # Marching squares contour extraction
│   │   ├── fontBuilder.ts        # OpenType.js font compilation & lowercase synthesis
│   │   ├── colorAssetExporter.ts # Cultural color character pack ZIP exporter
│   │   └── sampleSheets.ts       # Sample character sheet presets
│   ├── App.tsx                   # Main state coordinator
│   ├── main.tsx                  # React entry point
│   ├── types.ts                  # Shared TypeScript interfaces
│   └── index.css                 # Tailwind CSS styles
├── server.ts                     # Optional Express backend for Gemini AI features
├── vite.config.ts                # Vite config with relative base path support
└── package.json
```

---

## 📦 Built With

- **[React 19](https://react.dev/)** & **[TypeScript](https://www.typescriptlang.org/)**
- **[Vite](https://vite.dev/)** - Fast frontend tooling and bundler
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first styling
- **[OpenType.js](https://opentype.js.org/)** - In-browser TrueType font generation
- **[Lucide React](https://lucide.dev/)** - Clean iconography
- **[Google Gen AI SDK](https://github.com/google-gemini/generative-ai-js)** - Optional vision handwriting recognition

---

## 📄 License

This project is licensed under the Apache-2.0 License.
