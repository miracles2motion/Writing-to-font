# Image to Font Studio

A browser-based font creation studio that converts hand-drawn or designed character sheet images into installable **TrueType (`.ttf`)** font files.

Upload an image containing letters, numbers, and symbols on a white background. The studio automatically removes the background, segments each glyph, traces vector contours, harmonizes missing characters to match standard font specifications, and compiles a ready-to-use `.ttf` font file with a live interactive typing playground.

---

## ✨ Features

- **White Background Removal & Binarization**:
  - Automatic background removal with customizable white threshold, contrast boost, and speckle noise filtering.
  - Transparent preview showing isolated ink strokes.
  
- **Intelligent Glyph Segmentation & Vectorization**:
  - Connected component labeling discovers individual characters across the sheet.
  - Smart clustering automatically unifies multi-part glyphs (like dots on `i`, `j`, `!`, `?`, `:`, `;`).
  - Marching Squares contour tracing converts pixel contours into clean vector outlines.

- **Character Mapping & Sequencing**:
  - Click any character tag to edit its mapping with immediate Unicode synchronization.
  - One-click auto-sequencing presets (`A-Z, 0-9` or `0-9, A-Z`).
  - Batch selection tools for merging split strokes or deleting unwanted marks.
  - *(Optional)* **AI Auto-Label with Gemini**: Visual handwriting recognition to automatically detect letters in reading order.

- **Standard Font Specification Matching**:
  - **Synthesize Missing Lowercase (`a-z`)**: If your sheet only includes uppercase characters, the studio automatically derives harmonized small-caps lowercase glyphs so typing normal text never produces blank squares.
  - **Synthesize Essential Punctuation**: Generates standard period (`.`), comma (`,`), hyphen (`-`), and spacebar characters.
  - **Typographic Metrics**: Tune standard baseline, ascender (800), descender (-200), units per em (1000), space width, and side-bearing tracking.

- **Live Typing Playground & Specimen Waterfall**:
  - Real-time `@font-face` preview powered by the in-memory OpenType binary compiler.
  - Interactive multi-size specimen waterfall (16px to 72px).
  - Built-in classic pangrams and editable text canvas.

- **One-Click Export**:
  - Direct download of the compiled `.ttf` file.
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
│   │   ├── MetricsCompleter.tsx  # Standard font completion & metric sliders
│   │   ├── TypeTester.tsx        # Live interactive typing playground & waterfall
│   │   └── ExportPanel.tsx       # .TTF download, CSS snippet & install instructions
│   ├── utils/
│   │   ├── imageProcessor.ts     # Binarization & connected-component segmentation
│   │   ├── vectorizer.ts         # Marching squares contour extraction
│   │   ├── fontBuilder.ts        # OpenType.js font compilation & lowercase synthesis
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
