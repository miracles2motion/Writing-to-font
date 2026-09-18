import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./components/Header";
import { UploadAndCutout } from "./components/UploadAndCutout";
import { GlyphGrid } from "./components/GlyphGrid";
import { MetricsCompleter } from "./components/MetricsCompleter";
import { TypeTester } from "./components/TypeTester";
import { ExportPanel } from "./components/ExportPanel";
import {
  DetectedGlyph,
  FontSettings,
  ImageProcessingSettings,
  StudioTab,
} from "./types";
import { generateSampleSheet } from "./utils/sampleSheets";
import {
  removeBackgroundAndBinarize,
  segmentGlyphs,
  ProcessedImageResult,
} from "./utils/imageProcessor";
import { extractGlyphContours } from "./utils/vectorizer";
import {
  buildFontFromGlyphs,
  applyDynamicFontFace,
  FontBuildResult,
} from "./utils/fontBuilder";
import { downloadColorAssetPackZip } from "./utils/colorAssetExporter";
import { SEQUENCE_PATTERNS } from "./utils/glyphUtils";
import { ProcessingOverlay } from "./components/ProcessingOverlay";
import { CharacterExpanderModal } from "./components/CharacterExpanderModal";
import { ApiKeyModal, getCustomApiKey, getCustomModelPreference } from "./components/ApiKeyModal";
import { getAiRequestHeaders } from "./utils/aiClient";

export default function App() {
  const [currentTab, setCurrentTab] = useState<StudioTab>("upload");

  // Rich File Upload & Extraction Loading State
  const [processingState, setProcessingState] = useState<{
    isOpen: boolean;
    stage: string;
    progress: number;
    currentStepIndex: number;
    fileName?: string;
    detectedCount?: number;
  }>({
    isOpen: false,
    stage: "",
    progress: 0,
    currentStepIndex: 0,
  });

  // Image Processing state
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [sourceImageElement, setSourceImageElement] = useState<HTMLImageElement | null>(null);
  const [cleanedCanvasDataUrl, setCleanedCanvasDataUrl] = useState<string | null>(null);
  const [colorCanvasDataUrl, setColorCanvasDataUrl] = useState<string | null>(null);
  const [processedResult, setProcessedResult] = useState<ProcessedImageResult | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isGeneratingColorPack, setIsGeneratingColorPack] = useState(false);

  // Settings
  const [imageSettings, setImageSettings] = useState<ImageProcessingSettings>({
    whiteThreshold: 235,
    contrast: 1.3,
    invert: false,
    minGlyphArea: 50,
    mergeDistance: 14,
    smoothing: 1.6,
  });

  const [fontSettings, setFontSettings] = useState<FontSettings>({
    name: "Cultural Heritage",
    family: "CulturalHeritage",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    capHeight: 700,
    xHeight: 500,
    spaceWidth: 320,
    letterSpacing: 35,
    autoSynthesizeLowercase: true,
    autoSynthesizePunctuation: true,
  });

  // Glyphs and Font Compile state
  const [glyphs, setGlyphs] = useState<DetectedGlyph[]>([]);
  const [compiledFontResult, setCompiledFontResult] = useState<FontBuildResult | null>(null);
  const [isBuildingFont, setIsBuildingFont] = useState(false);
  const [isAiLabeling, setIsAiLabeling] = useState(false);
  const [isExpanderModalOpen, setIsExpanderModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [hasCustomApiKey, setHasCustomApiKey] = useState(() => Boolean(getCustomApiKey()));
  const [activeModel, setActiveModel] = useState<string>(() => getCustomModelPreference());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyUpdate = () => {
      setHasCustomApiKey(Boolean(getCustomApiKey()));
    };
    const handleModelUpdate = (e: any) => {
      setActiveModel(e.detail || getCustomModelPreference());
    };
    window.addEventListener("gemini-api-key-updated", handleKeyUpdate);
    window.addEventListener("gemini-model-updated", handleModelUpdate);
    return () => {
      window.removeEventListener("gemini-api-key-updated", handleKeyUpdate);
      window.removeEventListener("gemini-model-updated", handleModelUpdate);
    };
  }, []);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Handler to merge newly synthesized glyphs into the glyph set
  const handleAddExpandedGlyphs = useCallback(
    (newGlyphs: DetectedGlyph[]) => {
      setGlyphs((prev) => {
        const map = new Map(prev.map((g) => [g.char, g]));
        newGlyphs.forEach((g) => {
          map.set(g.char, g);
        });
        const combined = Array.from(map.values());

        // Re-compile font asynchronously with expanded set
        setTimeout(() => {
          try {
            const buildRes = buildFontFromGlyphs(combined, fontSettings);
            applyDynamicFontFace(fontSettings.family, buildRes.arrayBuffer);
            setCompiledFontResult(buildRes);
          } catch (e) {
            console.error("Auto compile after expansion failed:", e);
          }
        }, 80);

        return combined;
      });
      showToast(`Successfully expanded font with ${newGlyphs.length} synthesized characters!`);
    },
    [fontSettings, showToast]
  );

  // Process image and extract glyphs with rich staged progress updates
  const processImage = useCallback(
    async (
      img: HTMLImageElement,
      settings: ImageProcessingSettings,
      meta?: { fileName?: string; showModal?: boolean }
    ) => {
      const showOverlay = meta?.showModal !== false;
      setIsProcessingImage(true);

      if (showOverlay) {
        setProcessingState({
          isOpen: true,
          stage: "Decoding pixels & dimensions...",
          progress: 20,
          currentStepIndex: 0,
          fileName: meta?.fileName,
        });
      }

      // Allow browser to render loading UI
      await new Promise((resolve) => setTimeout(resolve, 40));

      try {
        // Step 1: Remove white background and build binary mask & color cutout canvas
        if (showOverlay) {
          setProcessingState((prev) => ({
            ...prev,
            stage: "Removing white background & binarizing ink...",
            progress: 35,
            currentStepIndex: 1,
          }));
        }
        await new Promise((resolve) => setTimeout(resolve, 40));

        const result = removeBackgroundAndBinarize(img, settings);
        setProcessedResult(result);
        setCleanedCanvasDataUrl(result.cleanedCanvas.toDataURL("image/png"));
        setColorCanvasDataUrl(result.colorCanvas.toDataURL("image/png"));

        // Step 2: Segment connected components into glyph bounding boxes
        if (showOverlay) {
          setProcessingState((prev) => ({
            ...prev,
            stage: "Discovering and segmenting character glyphs...",
            progress: 58,
            currentStepIndex: 2,
          }));
        }
        await new Promise((resolve) => setTimeout(resolve, 40));

        const detected = segmentGlyphs(
          result.binaryMask,
          result.width,
          result.height,
          result.cleanedCanvas,
          result.colorCanvas,
          settings
        );

        // Step 3: Extract vector contours for each glyph
        if (showOverlay) {
          setProcessingState((prev) => ({
            ...prev,
            detectedCount: detected.length,
            stage: `Found ${detected.length} characters • Tracing vector contours...`,
            progress: 78,
            currentStepIndex: 3,
          }));
        }
        await new Promise((resolve) => setTimeout(resolve, 40));

        const glyphsWithContours = detected.map((g) => {
          const contours = extractGlyphContours(
            result.binaryMask,
            result.width,
            result.height,
            g.bbox,
            settings.smoothing
          );
          return {
            ...g,
            contours,
          };
        });

        setGlyphs(glyphsWithContours);

        // Step 4: Auto-compile font with initial settings
        if (showOverlay) {
          setProcessingState((prev) => ({
            ...prev,
            stage: "Compiling TrueType font tables & metrics...",
            progress: 92,
            currentStepIndex: 4,
          }));
        }
        await new Promise((resolve) => setTimeout(resolve, 40));

        if (glyphsWithContours.length > 0) {
          const fontRes = buildFontFromGlyphs(glyphsWithContours, fontSettings);
          setCompiledFontResult(fontRes);
          await applyDynamicFontFace(fontSettings.family, fontRes.arrayBuffer);
        }

        if (showOverlay) {
          setProcessingState((prev) => ({
            ...prev,
            stage: "Extraction complete!",
            progress: 100,
            currentStepIndex: 4,
          }));
          // Brief pause so user sees 100% completion
          await new Promise((resolve) => setTimeout(resolve, 350));
          setProcessingState((prev) => ({ ...prev, isOpen: false }));
        }

        showToast(`Isolated ${glyphsWithContours.length} glyphs with transparent background`);
      } catch (err: any) {
        console.error("Error processing image:", err);
        setProcessingState((prev) => ({ ...prev, isOpen: false }));
        showToast("Error processing image contours: " + err.message);
      } finally {
        setIsProcessingImage(false);
      }
    },
    [fontSettings, showToast]
  );

  // Clear currently loaded image and reset to blank studio
  const handleClearImage = () => {
    setSourceImageUrl(null);
    setSourceImageElement(null);
    setGlyphs([]);
    setProcessedResult(null);
    setCleanedCanvasDataUrl(null);
    setColorCanvasDataUrl(null);
    setCompiledFontResult(null);
    setFontSettings((prev) => ({
      ...prev,
      name: "My Custom Font",
      family: "MyCustomFont",
    }));
    showToast("Cleared loaded character sheet.");
  };

  // Handle uploaded file with real progress listener
  const handleUploadImage = (file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const fileDisplayName = `${file.name} (${sizeMb} MB)`;

    // Immediately show loading screen with upload listener
    setProcessingState({
      isOpen: true,
      stage: "Reading file into browser memory...",
      progress: 6,
      currentStepIndex: 0,
      fileName: fileDisplayName,
    });

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const readPercent = Math.round((e.loaded / e.total) * 16);
        setProcessingState((prev) => ({
          ...prev,
          progress: 6 + readPercent,
          stage: `Reading file bytes (${Math.round((e.loaded / e.total) * 100)}%)...`,
        }));
      }
    };

    reader.onload = (e) => {
      setProcessingState((prev) => ({
        ...prev,
        progress: 22,
        stage: "Decoding image dimensions & pixels...",
      }));

      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setSourceImageUrl(dataUrl);
        setSourceImageElement(img);

        // Deduce default font name from filename
        const cleanName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9 ]/g, " ")
          .trim();
        const deducedName = cleanName.length > 2 ? cleanName : "My Custom Font";
        const deducedFamily = deducedName.replace(/\s+/g, "");

        setFontSettings((prev) => ({
          ...prev,
          name: deducedName,
          family: deducedFamily,
        }));

        processImage(img, imageSettings, { fileName: fileDisplayName, showModal: true });
        setCurrentTab("upload");
        showToast(`Loaded ${file.name} successfully`);
      };

      img.onerror = () => {
        setProcessingState((prev) => ({ ...prev, isOpen: false }));
        showToast("Could not decode image. Please ensure it is a valid PNG, JPG, or WEBP.");
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      setProcessingState((prev) => ({ ...prev, isOpen: false }));
      showToast("Error reading file.");
    };

    reader.readAsDataURL(file);
  };

  // Handle sample preset selection
  const handleSelectSamplePreset = (presetId: string) => {
    const presetNames: Record<string, string> = {
      cultural: "African Cultural Heritage",
      dualcase: "Dual-Case Handwriting",
      handwritten: "Handmade Marker",
      geometric: "Modern Geometric",
      retro: "Vintage Grotesque",
    };
    const name = presetNames[presetId] || "Sample Font";

    setProcessingState({
      isOpen: true,
      stage: `Generating "${name}" sample sheet...`,
      progress: 10,
      currentStepIndex: 0,
      fileName: `${name} Sheet`,
    });

    const dataUrl = generateSampleSheet(presetId);
    const img = new Image();
    img.onload = () => {
      setSourceImageUrl(dataUrl);
      setSourceImageElement(img);

      setFontSettings((prev) => ({
        ...prev,
        name,
        family: name.replace(/\s+/g, ""),
      }));

      processImage(img, imageSettings, { fileName: `${name} Preset`, showModal: true });
      showToast(`Loaded "${name}" sample sheet`);
    };
    img.src = dataUrl;
  };

  // Update Image processing settings and re-run cutout
  const handleUpdateImageSettings = (newSettings: Partial<ImageProcessingSettings>) => {
    const updated = { ...imageSettings, ...newSettings };
    setImageSettings(updated);
    if (sourceImageElement) {
      processImage(sourceImageElement, updated, { fileName: "Re-processing Settings", showModal: true });
    }
  };

  // Update Font settings
  const handleUpdateFontSettings = (newSettings: Partial<FontSettings>) => {
    const updated = { ...fontSettings, ...newSettings };
    setFontSettings(updated);
  };

  // Compile font action
  const handleGenerateFont = useCallback(async () => {
    if (glyphs.length === 0) {
      showToast("No glyphs detected yet. Upload an image first!");
      return;
    }

    setIsBuildingFont(true);
    try {
      // Re-extract contours if needed or use existing
      const fontRes = buildFontFromGlyphs(glyphs, fontSettings);
      setCompiledFontResult(fontRes);

      // Register dynamic font
      await applyDynamicFontFace(fontSettings.family, fontRes.arrayBuffer);
      showToast(
        `Font "${fontSettings.name}" compiled successfully! (${fontRes.glyphCount} glyphs, ${fontRes.synthesizedCount} auto-synthesized)`
      );
    } catch (err: any) {
      console.error("Font compile error:", err);
      showToast("Error building font: " + err.message);
    } finally {
      setIsBuildingFont(false);
    }
  }, [glyphs, fontSettings, showToast]);

  // Download .TTF file
  const handleDownloadTtf = () => {
    if (!compiledFontResult) {
      handleGenerateFont();
      return;
    }

    const safeName = (fontSettings.name || fontSettings.family || "CustomFont")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `${safeName}.ttf`;

    // Trigger standard browser download
    const link = document.createElement("a");
    link.href = compiledFontResult.blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Downloading ${fileName}...`);
  };

  // Download Cultural Color Asset Pack (ZIP)
  const handleDownloadColorAssetPack = useCallback(async () => {
    if (glyphs.length === 0) {
      showToast("No glyphs detected to export.");
      return;
    }
    setIsGeneratingColorPack(true);
    showToast("Packaging Cultural Color Character Asset Pack (.ZIP)...");
    try {
      await downloadColorAssetPackZip(glyphs, fontSettings.name, colorCanvasDataUrl || undefined);
      showToast("Cultural Color Asset Pack downloaded successfully!");
    } catch (err: any) {
      console.error("ZIP creation failed:", err);
      showToast("Error creating ZIP: " + err.message);
    } finally {
      setIsGeneratingColorPack(false);
    }
  }, [glyphs, fontSettings.name, colorCanvasDataUrl, showToast]);

  // Update single glyph character tag
  const handleUpdateGlyphChar = (glyphId: string, newChar: string) => {
    setGlyphs((prev) =>
      prev.map((g) => {
        if (g.id === glyphId) {
          const char = newChar.charAt(0);
          return {
            ...g,
            char,
            unicode: char.charCodeAt(0),
          };
        }
        return g;
      })
    );
  };

  // Delete glyph
  const handleDeleteGlyph = (glyphId: string) => {
    setGlyphs((prev) => prev.filter((g) => g.id !== glyphId));
    showToast("Removed glyph");
  };

  // Merge multiple glyphs
  const handleMergeGlyphs = (glyphIds: string[]) => {
    if (glyphIds.length < 2 || !processedResult) return;

    const targets = glyphs.filter((g) => glyphIds.includes(g.id));
    if (targets.length < 2) return;

    // Combine bounding boxes
    const minX = Math.min(...targets.map((t) => t.bbox.x));
    const minY = Math.min(...targets.map((t) => t.bbox.y));
    const maxX = Math.max(...targets.map((t) => t.bbox.x + t.bbox.width));
    const maxY = Math.max(...targets.map((t) => t.bbox.y + t.bbox.height));

    const mergedBbox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    // Re-extract contours from binary mask for merged bbox
    const contours = extractGlyphContours(
      processedResult.binaryMask,
      processedResult.width,
      processedResult.height,
      mergedBbox,
      imageSettings.smoothing
    );

    // Render cropped preview (monochrome mask)
    const cropCanvas = document.createElement("canvas");
    const pad = 4;
    cropCanvas.width = mergedBbox.width + pad * 2;
    cropCanvas.height = mergedBbox.height + pad * 2;
    const cropCtx = cropCanvas.getContext("2d");
    if (cropCtx) {
      cropCtx.drawImage(
        processedResult.cleanedCanvas,
        mergedBbox.x,
        mergedBbox.y,
        mergedBbox.width,
        mergedBbox.height,
        pad,
        pad,
        mergedBbox.width,
        mergedBbox.height
      );
    }

    // Render cropped color preview if available
    let colorDataUrl: string | undefined = undefined;
    if (processedResult.colorCanvas) {
      const colorCropCanvas = document.createElement("canvas");
      colorCropCanvas.width = mergedBbox.width + pad * 2;
      colorCropCanvas.height = mergedBbox.height + pad * 2;
      const colorCtx = colorCropCanvas.getContext("2d");
      if (colorCtx) {
        colorCtx.drawImage(
          processedResult.colorCanvas,
          mergedBbox.x,
          mergedBbox.y,
          mergedBbox.width,
          mergedBbox.height,
          pad,
          pad,
          mergedBbox.width,
          mergedBbox.height
        );
        colorDataUrl = colorCropCanvas.toDataURL("image/png");
      }
    }

    const primaryTarget = targets[0];
    const newMergedGlyph: DetectedGlyph = {
      id: `merged-${Date.now()}`,
      char: primaryTarget.char,
      unicode: primaryTarget.unicode,
      bbox: mergedBbox,
      contours,
      canvasDataUrl: cropCanvas.toDataURL("image/png"),
      colorCanvasDataUrl: colorDataUrl,
      advanceWidth: Math.round(mergedBbox.width * 1.25),
      leftBearing: 20,
      rightBearing: 20,
    };

    // Replace the first target and remove the rest
    setGlyphs((prev) => {
      const filtered = prev.filter((g) => !glyphIds.includes(g.id));
      return [...filtered, newMergedGlyph];
    });

    showToast(`Merged ${glyphIds.length} components into single glyph "${primaryTarget.char}"`);
  };

  // Save updated glyph crop & contours
  const handleSaveGlyph = (updatedGlyph: DetectedGlyph) => {
    setGlyphs((prev) =>
      prev.map((g) => (g.id === updatedGlyph.id ? updatedGlyph : g))
    );
    showToast(`Saved crop for glyph "${updatedGlyph.char}"`);
  };

  // Split a fused glyph into two separate glyphs
  const handleSplitGlyph = (
    originalId: string,
    leftGlyph: DetectedGlyph,
    rightGlyph: DetectedGlyph
  ) => {
    setGlyphs((prev) => {
      const idx = prev.findIndex((g) => g.id === originalId);
      if (idx === -1) return [...prev, leftGlyph, rightGlyph];
      const copy = [...prev];
      copy.splice(idx, 1, leftGlyph, rightGlyph);
      return copy;
    });
    showToast(`Split into 2 glyphs: "${leftGlyph.char}" and "${rightGlyph.char}"`);
  };

  // Batch casing conversion (lower / upper)
  const handleBatchCaseConvert = (
    glyphIds: string[],
    targetCase: "lower" | "upper"
  ) => {
    setGlyphs((prev) =>
      prev.map((g) => {
        if (glyphIds.includes(g.id)) {
          const newChar =
            targetCase === "lower"
              ? g.char.toLowerCase()
              : g.char.toUpperCase();
          return {
            ...g,
            char: newChar,
            unicode: newChar.charCodeAt(0),
          };
        }
        return g;
      })
    );
    showToast(
      `Converted ${glyphIds.length} characters to ${
        targetCase === "lower" ? "lowercase (a-z)" : "uppercase (A-Z)"
      }`
    );
  };

  // Auto-sequence mappings
  const handleAutoSequence = (patternId: string) => {
    const matched = SEQUENCE_PATTERNS.find((p) => p.id === patternId);
    const sequence = matched ? matched.chars : SEQUENCE_PATTERNS[0].chars;

    setGlyphs((prev) =>
      prev.map((g, idx) => {
        const char = idx < sequence.length ? sequence[idx] : g.char;
        return {
          ...g,
          char,
          unicode: char.charCodeAt(0),
        };
      })
    );
    showToast(`Sequenced characters using pattern: ${matched?.name || patternId}`);
  };

  // AI Auto-label with Gemini
  const handleAiAutoLabel = async () => {
    if (!sourceImageUrl) {
      showToast("No image loaded to analyze.");
      return;
    }

    setIsAiLabeling(true);
    try {
      const res = await fetch("/api/ai/recognize-glyphs", {
        method: "POST",
        headers: getAiRequestHeaders(),
        body: JSON.stringify({
          imageBase64: sourceImageUrl,
          mimeType: "image/png",
          detectedCount: glyphs.length,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI recognition failed.");
      }

      if (data.characters && Array.isArray(data.characters)) {
        setGlyphs((prev) =>
          prev.map((g, index) => {
            if (index < data.characters.length) {
              const char = data.characters[index].charAt(0);
              return {
                ...g,
                char,
                unicode: char.charCodeAt(0),
              };
            }
            return g;
          })
        );
      }

      if (data.suggestedName) {
        setFontSettings((prev) => ({
          ...prev,
          name: data.suggestedName,
          family: data.suggestedName.replace(/\s+/g, ""),
        }));
      }

      showToast(
        `Gemini AI recognized ${data.characters?.length || 0} characters with casing! Style: ${data.style || "Custom"}`
      );
    } catch (err: any) {
      console.error("AI auto-label error:", err);
      // Fallback for static hosting (GitHub Pages)
      handleAutoSequence("A-Z_a-z_0-9");
      showToast("Auto-sequenced A-Z, a-z, 0-9. (AI vision requires backend server)");
    } finally {
      setIsAiLabeling(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        fontName={fontSettings.name}
        glyphCount={glyphs.length}
        hasCompiledFont={Boolean(compiledFontResult)}
        onDownloadFont={handleDownloadTtf}
        onDownloadColorPack={handleDownloadColorAssetPack}
        onGenerateFont={handleGenerateFont}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasCustomApiKey={hasCustomApiKey}
        activeModel={activeModel}
        isGenerating={isBuildingFont}
      />

      {/* Main Viewport depending on active tab */}
      <main className="flex-1">
        {currentTab === "upload" && (
          <UploadAndCutout
            sourceImageUrl={sourceImageUrl}
            cleanedCanvasDataUrl={cleanedCanvasDataUrl}
            colorCanvasDataUrl={colorCanvasDataUrl}
            detectedCount={glyphs.length}
            settings={imageSettings}
            onUpdateSettings={handleUpdateImageSettings}
            onUploadImage={handleUploadImage}
            onSelectSamplePreset={handleSelectSamplePreset}
            onProceedToGlyphs={() => setCurrentTab("glyphs")}
            onClearImage={handleClearImage}
            isProcessing={isProcessingImage}
            processingProgress={processingState.progress}
            processingStage={processingState.stage}
          />
        )}

        {currentTab === "glyphs" && (
          <GlyphGrid
            glyphs={glyphs}
            cleanedCanvas={processedResult?.cleanedCanvas || null}
            colorCanvas={processedResult?.colorCanvas || null}
            sourceCanvas={processedResult?.colorCanvas || processedResult?.cleanedCanvas || null}
            binaryMask={processedResult?.binaryMask || null}
            maskWidth={processedResult?.width || 1200}
            maskHeight={processedResult?.height || 800}
            smoothing={imageSettings.smoothing}
            onUpdateGlyphChar={handleUpdateGlyphChar}
            onDeleteGlyph={handleDeleteGlyph}
            onMergeGlyphs={handleMergeGlyphs}
            onSaveGlyph={handleSaveGlyph}
            onSplitGlyph={handleSplitGlyph}
            onBatchCaseConvert={handleBatchCaseConvert}
            onAutoSequence={handleAutoSequence}
            onAiAutoLabel={handleAiAutoLabel}
            onProceedToMetrics={() => setCurrentTab("metrics")}
            onOpenExpanderModal={() => setIsExpanderModalOpen(true)}
            isAiLabeling={isAiLabeling}
          />
        )}

        {currentTab === "metrics" && (
          <MetricsCompleter
            settings={fontSettings}
            glyphs={glyphs}
            onUpdateSettings={handleUpdateFontSettings}
            onBuildAndTest={async () => {
              await handleGenerateFont();
              setCurrentTab("test");
            }}
            onOpenExpanderModal={() => setIsExpanderModalOpen(true)}
            isBuilding={isBuildingFont}
          />
        )}

        {currentTab === "test" && (
          <TypeTester
            fontFamily={fontSettings.family}
            settings={fontSettings}
            glyphs={glyphs}
            onDownloadTtf={handleDownloadTtf}
            onDownloadColorPack={handleDownloadColorAssetPack}
            onProceedToExport={() => setCurrentTab("export")}
          />
        )}

        {currentTab === "export" && (
          <ExportPanel
            fontSettings={fontSettings}
            glyphCount={compiledFontResult?.glyphCount || glyphs.length}
            synthesizedCount={compiledFontResult?.synthesizedCount || 0}
            onDownloadTtf={handleDownloadTtf}
            onDownloadColorPack={handleDownloadColorAssetPack}
            hasCompiledFont={Boolean(compiledFontResult)}
            isGeneratingColorPack={isGeneratingColorPack}
          />
        )}
      </main>

      {/* Processing & Upload Progress Modal */}
      <ProcessingOverlay
        isOpen={processingState.isOpen}
        stage={processingState.stage}
        progress={processingState.progress}
        fileName={processingState.fileName}
        currentStepIndex={processingState.currentStepIndex}
        detectedCount={processingState.detectedCount}
      />

      {/* Character Extrapolation & Font Expansion Modal */}
      <CharacterExpanderModal
        isOpen={isExpanderModalOpen}
        onClose={() => setIsExpanderModalOpen(false)}
        glyphs={glyphs}
        onAddExpandedGlyphs={handleAddExpandedGlyphs}
        sourceImageUrl={sourceImageUrl}
        colorCanvasDataUrl={colorCanvasDataUrl}
        fontStyle={fontSettings.styleName}
        showToast={showToast}
      />

      {/* Gemini API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        showToast={showToast}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/80 py-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <p>
            Image to Font Studio • Convert handwriting and image designs to TrueType fonts
          </p>
          <p className="font-mono text-neutral-400">
            UnitsPerEm: {fontSettings.unitsPerEm} • Engine: OpenType.js
          </p>
        </div>
      </footer>
    </div>
  );
}
