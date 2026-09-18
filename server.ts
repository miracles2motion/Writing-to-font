import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy Gemini client helper: supports either server process.env.GEMINI_API_KEY
// or a custom user-provided key passed via Authorization: Bearer <key> / x-gemini-api-key header
let defaultAiClient: GoogleGenAI | null = null;
function getAI(customKey?: string | null): GoogleGenAI | null {
  const activeKey = customKey?.trim() || process.env.GEMINI_API_KEY;
  if (!activeKey) return null;

  // If using default environment key, memoize instance
  if (!customKey || customKey.trim() === process.env.GEMINI_API_KEY) {
    if (!defaultAiClient) {
      defaultAiClient = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return defaultAiClient;
  }

  // If custom user-provided key, instantiate with user's key
  return new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function extractApiKeyFromReq(req: express.Request): string | null {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const customHeader = req.headers["x-gemini-api-key"] as string | undefined;
  if (customHeader && customHeader.trim()) {
    return customHeader.trim();
  }
  if (req.body && typeof req.body.customApiKey === "string" && req.body.customApiKey.trim()) {
    return req.body.customApiKey.trim();
  }
  return null;
}

function extractModelFromReq(req: express.Request): string {
  const modelHeader = req.headers["x-gemini-model"] as string | undefined;
  if (modelHeader && modelHeader.trim()) {
    return modelHeader.trim();
  }
  if (req.body && typeof req.body.preferredModel === "string" && req.body.preferredModel.trim()) {
    return req.body.preferredModel.trim();
  }
  return "gemini-2.5-flash";
}

/**
 * Executes a Gemini request with automatic multi-model failover and hard timeout.
 * Prevents requests from stalling or taking forever.
 */
async function generateContentWithFailover(
  ai: GoogleGenAI,
  requestedModel: string,
  params: { contents: any; config?: any },
  timeoutMs: number = 22000
): Promise<{ response: any; modelUsed: string }> {
  // Build fallback model chain starting with the user's requested model
  const fallbackCandidates = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];
  const modelChain: string[] = [requestedModel];
  for (const m of fallbackCandidates) {
    if (!modelChain.includes(m)) {
      modelChain.push(m);
    }
  }

  let lastError: any = null;
  for (const modelToTry of modelChain) {
    try {
      const generatePromise = ai.models.generateContent({
        model: modelToTry,
        contents: params.contents,
        config: params.config,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Model ${modelToTry} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      return { response, modelUsed: modelToTry };
    } catch (err: any) {
      console.warn(`[Gemini Failover] Model '${modelToTry}' failed. Checking next standby model in chain...`, err?.message || err);
      lastError = err;
      // Continue to next model in failover chain
    }
  }

  throw lastError || new Error("All Gemini failover models exhausted.");
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

// AI Configuration Status
app.get("/api/ai/status", (req, res) => {
  const customApiKey = extractApiKeyFromReq(req);
  const activeKey = customApiKey || process.env.GEMINI_API_KEY;
  res.json({
    hasKey: Boolean(activeKey),
    isCustomKey: Boolean(customApiKey),
    hasServerKey: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: "gemini-2.5-flash",
  });
});

// Dynamic List of Available Models from Gemini API for the provided or server key
app.get("/api/ai/models", async (req, res) => {
  try {
    const customApiKey = extractApiKeyFromReq(req);
    const ai = getAI(customApiKey);

    if (!ai) {
      return res.status(401).json({
        error: "No Gemini API key available. Please enter your API key to list available models.",
        models: [],
      });
    }

    // Query Gemini models API via SDK
    const response = await ai.models.list();
    const rawList: any[] = [];

    // The SDK models.list() can return an iterable or list array
    if (response) {
      if (Symbol.asyncIterator in Object(response)) {
        for await (const model of response as any) {
          rawList.push(model);
        }
      } else if (Array.isArray((response as any).models)) {
        rawList.push(...(response as any).models);
      } else if (Array.isArray(response)) {
        rawList.push(...response);
      }
    }

    // Filter models suitable for multimodal vision/OCR and generation (e.g. gemini-*)
    const formattedModels = rawList
      .map((m: any) => {
        const rawName = m.name || m.id || "";
        const cleanId = rawName.replace(/^models\//, "");
        return {
          id: cleanId,
          name: m.displayName || cleanId,
          description: m.description || "Gemini multimodal generative vision model.",
          supportedActions: m.supportedActions || [],
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
        };
      })
      .filter((m: any) => {
        const idLower = m.id.toLowerCase();
        // Keep gemini generative/vision models, exclude audio-only or non-gemini embeddings
        return (
          idLower.includes("gemini") &&
          !idLower.includes("embedding") &&
          !idLower.includes("aqa") &&
          !idLower.includes("imagen")
        );
      });

    return res.json({
      success: true,
      count: formattedModels.length,
      models: formattedModels,
    });
  } catch (err: any) {
    console.warn("Failed to fetch dynamic model list from Gemini API:", err?.message || err);
    return res.status(500).json({
      error: err?.message || "Failed to query available models from Gemini API.",
      models: [],
    });
  }
});

// AI Recognition of Glyph Sheet
app.post("/api/ai/recognize-glyphs", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png", detectedCount = 0 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    const customApiKey = extractApiKeyFromReq(req);
    const preferredModel = extractModelFromReq(req);
    const ai = getAI(customApiKey);
    if (!ai) {
      return res.status(503).json({
        error: "No Gemini API key available. Please provide your Gemini API key in App Settings or environment.",
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are a world-class typographic analyst, font engineer, and OCR specialist.
Analyze this character sheet image containing hand-drawn or designed alphabet characters, numbers, and symbols on a white background.
There are approximately ${detectedCount || "20-60"} glyphs arranged in rows or a grid.

CRITICAL CASING & CHARACTER RECOGNITION RULES:
1. RIGOROUS UPPERCASE (A-Z) VS. LOWERCASE (a-z) DIFFERENTIATION:
   - Carefully examine the visual anatomy and relative proportions:
     - Distinct lowercase shapes: 'a' vs 'A', 'b' vs 'B', 'd' vs 'D', 'e' vs 'E', 'g' vs 'G', 'm' vs 'M', 'n' vs 'N', 'q' vs 'Q', 'r' vs 'R', 't' vs 'T'.
     - Ascenders extending tall: lowercase 'b', 'd', 'f', 'h', 'k', 'l', 't'.
     - Descenders dipping low: lowercase 'g', 'j', 'p', 'q', 'y'.
     - X-height characters: 'c', 'o', 's', 'v', 'w', 'x', 'z'. If they appear alongside capitals and are clearly shorter (x-height), identify them as lowercase ('c', 'o', 's'...), NOT uppercase.
   - If the user wrote lowercase characters, OUTPUT THEM STRICTLY IN LOWERCASE (e.g. "a", "b", "c").
   - NEVER convert lowercase letters into uppercase letters!
   - If the sheet has uppercase followed by lowercase (e.g. A-Z on top rows, a-z on bottom rows, or paired Aa, Bb, Cc), preserve each letter's exact casing.

2. DIGITS & SYMBOLS:
   - Digits 0-9: "0", "1", "2", "3", "4", "5", "6", "7", "8", "9".
   - Punctuation & Symbols: "!", "?", ".", ",", ":", ";", "'", '"', "-", "+", "=", "/", "@", "#", "$", "%", "&", "*", "(", ")".

3. ORDER:
   - List all detected characters strictly in natural visual reading order: row by row, from top-to-bottom and left-to-right.

4. METRICS & STYLE:
   - Describe the font's artistic style (e.g. "African Cultural Display Sans", "Handmade Casual Marker", "Geometric Minimalist").
   - Suggest an evocative font family name matching its personality.
   - Estimate weight (e.g. "Regular", "Bold", "Black").

Respond in JSON format with:
- characters: array of single character strings in reading order with EXACT UPPER/LOWER CASING, e.g. ["A", "B", "C"] or ["a", "b", "c"]
- style: string
- suggestedName: string
- weight: string
- description: string`;

    const { response, modelUsed } = await generateContentWithFailover(ai, preferredModel, {
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of detected single characters with exact uppercase/lowercase casing preserved in visual reading order",
            },
            style: {
              type: Type.STRING,
              description: "Style of the typography",
            },
            suggestedName: {
              type: Type.STRING,
              description: "A fitting font name",
            },
            weight: {
              type: Type.STRING,
              description: "Estimated font weight",
            },
            description: {
              type: Type.STRING,
              description: "Summary of aesthetic characteristics",
            },
          },
          required: ["characters", "style", "suggestedName"],
        },
      },
    });

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);
    parsed._modelUsed = modelUsed;
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error recognizing glyphs:", error);
    return res.status(500).json({
      error: error.message || "Failed to analyze glyphs with Gemini.",
    });
  }
});

// AI Single-Glyph Casing & Character Classifier
app.post("/api/ai/classify-glyph", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const customApiKey = extractApiKeyFromReq(req);
    const preferredModel = extractModelFromReq(req);
    const ai = getAI(customApiKey);
    if (!ai) {
      return res.status(503).json({ error: "No Gemini API key available. Please configure your key in Settings or environment." });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Look at this single cropped character image from a font sheet.
Identify what exact character this is, paying crucial attention to CASING (uppercase vs lowercase):
- Is it an UPPERCASE letter (e.g. 'A', 'B', 'C'...), a LOWERCASE letter (e.g. 'a', 'b', 'c'...), a DIGIT (0-9), or a SYMBOL?
- Look for distinctive lowercase features: loop in 'a', crossbar and ear in 'g', curved top in 'r', ascenders on 'b'/'d'/'h'/'k'/'l'/'t', descenders on 'p'/'q'/'y', etc.
- Return the single character in 'char', 'casing' ("upper" | "lower" | "digit" | "symbol"), and a 1-sentence 'rationale'.`;

    const { response, modelUsed } = await generateContentWithFailover(ai, preferredModel, {
      contents: {
        parts: [
          { inlineData: { data: cleanBase64, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            char: { type: Type.STRING, description: "The single exact character, case-sensitive" },
            casing: { type: Type.STRING, description: "Casing type: 'upper', 'lower', 'digit', or 'symbol'" },
            confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
            rationale: { type: Type.STRING, description: "Brief visual rationale" },
          },
          required: ["char", "casing"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed._modelUsed = modelUsed;
    return res.json(parsed);
  } catch (err: any) {
    console.error("Error classifying glyph:", err);
    return res.status(500).json({ error: err.message || "Failed to classify glyph." });
  }
});

// AI One-Click Alphabet Harvester & Resolver for Scattered Notes
app.post("/api/ai/harvest-alphabet-from-notes", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 document data" });
    }

    const customApiKey = extractApiKeyFromReq(req);
    const preferredModel = extractModelFromReq(req);
    const ai = getAI(customApiKey);
    if (!ai) {
      return res.status(503).json({
        error: "No Gemini API key available. Please configure your key in Settings or environment.",
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are a world-leading paleographer, forensic document analyst, and master font engineer.
You are inspecting a handwritten document (e.g. notes, lined notebook paper, brainstorming diagram, letter, or manuscript).

YOUR MISSION: PRECISE SINGLE-CHARACTER HARVESTING & COMPLETE ALPHABET RESOLUTION.

CRITICAL PRECISION REQUIREMENTS:
1. ACCURATE CHARACTER LOCALIZATION (box2d):
   - You must inspect the actual handwritten text on this page.
   - For every unique character that actually appears written on this page:
     - UPPERCASE LETTERS: A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z
     - LOWERCASE LETTERS: a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z
     - DIGITS: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
     - PUNCTUATION / SYMBOLS: ?, !, ., ,, -, :, ;, ', ", (, ), @, &, +, =
   - Provide the EXACT tight bounding box [ymin, xmin, ymax, xmax] (normalized from 0 to 1000) enclosing ONLY that single individual letter.
   - DO NOT encompass multi-letter clusters (like "AKE", "HO", "MAN", "COM") or full words.
   - DO NOT encompass ruled notebook lines, underlines, or margins.
   - The bounding box must tightly wrap the exact letter stroke on the image.

2. TRUE DEDUPLICATION & BEST EXEMPLAR SELECTION:
   - When a letter appears multiple times in the text (e.g. 'E' appears in 'STAKEHOLDER' and 'MANAGEMENT'):
     - Choose the SINGLE cleanest, most legible, best-formed instance.
     - Specify the source word and why it was chosen.

3. STRICT HONESTY ON MISSING CHARACTERS:
   - NEVER fake or hallucinate a letter! If the letter 'B', 'F', 'Q', 'X', or 'Z' does NOT appear in the written document, DO NOT assign a random stroke to it.
   - Put all standard English letters (A-Z, a-z, 0-9) that are truly NOT present in the page into the "missingStandardCharacters" list.

4. FONT CLASSIFICATION & EVOCATIVE NAME:
   - Analyze the handwriting aesthetic (e.g. "Architectural Sans Caps", "Modern Executive Cursive", "Artisan Quick Jotted Script").
   - Suggest a font name matching the content/style (e.g. "Stakeholder Sans", "Lecture Script", "Quick Thought").

Return strictly JSON conforming to the schema.`;

    const { response, modelUsed } = await generateContentWithFailover(ai, preferredModel, {
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resolvedCharacters: {
              type: Type.ARRAY,
              description: "Array of unique curated characters extracted with exact 2D bounding boxes",
              items: {
                type: Type.OBJECT,
                properties: {
                  char: { type: Type.STRING, description: "The single exact character (e.g. 'A', 'a', '7', '?')" },
                  casing: { type: Type.STRING, description: "'upper', 'lower', 'digit', or 'symbol'" },
                  box2d: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: "[ymin, xmin, ymax, xmax] in 0-1000 scale enclosing ONLY this single character",
                  },
                  qualityScore: { type: Type.NUMBER, description: "0.0 to 1.0 visual quality and legibility score" },
                  sourceWord: { type: Type.STRING, description: "Word or phrase where this letter occurred (e.g. 'STAKEHOLDER')" },
                  notes: { type: Type.STRING, description: "Why this exemplar was chosen" },
                },
                required: ["char", "casing", "box2d"],
              },
            },
            missingStandardCharacters: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Standard characters (from A-Z, a-z, 0-9) truly not written on the page",
            },
            totalFoundCount: {
              type: Type.INTEGER,
              description: "Total unique characters resolved",
            },
            handwritingStyle: {
              type: Type.STRING,
              description: "Artistic classification of the handwriting",
            },
            suggestedFontName: {
              type: Type.STRING,
              description: "Evocative name suggested for the font",
            },
            summary: {
              type: Type.STRING,
              description: "1-2 sentence overview of the harvest results",
            },
          },
          required: ["resolvedCharacters", "missingStandardCharacters", "totalFoundCount", "summary"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed._modelUsed = modelUsed;
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error harvesting alphabet from notes:", error);
    return res.status(500).json({
      error: error.message || "Failed to harvest alphabet from notes.",
    });
  }
});

// AI Style & Missing Glyph Advisory
app.post("/api/ai/font-advice", async (req, res) => {
  try {
    const { availableCharacters, fontName, fontStyle } = req.body;
    const customApiKey = extractApiKeyFromReq(req);
    const preferredModel = extractModelFromReq(req);
    const ai = getAI(customApiKey);
    if (!ai) {
      return res.status(503).json({
        error: "No Gemini API key available. Please configure your key in Settings or environment.",
      });
    }

    const prompt = `The user has created a custom font named "${fontName || "CustomFont"}" with style "${fontStyle || "handwritten"}".
Currently available characters in the font: "${(availableCharacters || []).join("")}".

Provide typography design recommendations:
1. What are the most critical missing standard characters for a usable font (e.g. lowercase a-z, space, period, exclamation mark)?
2. How should lowercase characters be derived or harmonized with the uppercase shapes if the user only supplied uppercase?
3. Recommended spacing (advance width tracking & side-bearings) for this style.
4. A creative sample pangram or marketing sentence that highlights this font's unique feel.`;

    const { response, modelUsed } = await generateContentWithFailover(ai, preferredModel, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            missingEssentials: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of essential missing characters",
            },
            lowercaseDerivationTip: {
              type: Type.STRING,
              description: "Tip on harmonizing lowercase",
            },
            recommendedTracking: {
              type: Type.STRING,
              description: "Spacing guidance",
            },
            samplePangrams: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 fun sample test phrases tailored to the font style",
            },
          },
          required: ["missingEssentials", "lowercaseDerivationTip", "samplePangrams"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed._modelUsed = modelUsed;
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error generating font advice:", error);
    return res.status(500).json({ error: error.message || "Failed to get font advice" });
  }
});

// AI Font Character Set Expansion: Studies style DNA and synthesizes missing characters
app.post("/api/ai/expand-glyphs", async (req, res) => {
  try {
    const {
      referenceImageBase64,
      mimeType = "image/png",
      existingCharacters = [],
      targetCharacters = [],
      fontStyle = "custom display font",
    } = req.body;

    if (!targetCharacters || targetCharacters.length === 0) {
      return res.status(400).json({ error: "Missing targetCharacters to generate." });
    }

    const customApiKey = extractApiKeyFromReq(req);
    const preferredModel = extractModelFromReq(req);
    const ai = getAI(customApiKey);
    if (!ai) {
      return res.status(503).json({ error: "No Gemini API key available. Please configure your key in Settings or environment." });
    }

    // Limit batch size to max 28 per request to prevent token truncation
    const batchTargets = targetCharacters.slice(0, 28);

    const prompt = `You are an elite master type designer, fontographer, and SVG vector artist.
The user has uploaded a partial character set containing these drawn characters: "${existingCharacters.join(", ")}".
Artistic style: "${fontStyle}".

TASK:
Synthesize matching letterforms for each of the following MISSING characters so they fit the exact visual DNA, stroke thickness, curvature, slant, and aesthetic spirit of the user's drawn characters:
Target characters to synthesize: ${JSON.stringify(batchTargets)}

STRICT DESIGN RULES:
1. VECTOR SVG PATH:
   - For EACH target character, provide a valid, self-contained SVG path string (the 'd' attribute of an SVG <path>).
   - Coordinates MUST be normalized within a 100x100 box:
     - Baseline is at y = 80.
     - Cap-height top is at y = 15.
     - X-height (for lowercase without ascenders) top is at y = 38.
     - Descender bottom (for g, j, p, q, y) reaches down to y = 95.
     - Left-to-right advance is centered comfortably between x = 10 and x = 90.
   - The path must be FILLED black (do not use open stroke lines without thickness; the path must enclose the pen/brush stroke volume so it can be filled).
   - The stroke thickness, serif treatment, and curvature must closely imitate the reference image characters.

2. PROPORTIONS & CASING:
   - If target is lowercase (e.g. 'a', 'b', 'c'), ensure true lowercase anatomy with proper x-height and natural ascenders/descenders.
   - If target is a digit (0-9), match the height and optical weight of the uppercase letters.
   - If target is punctuation, match the pen stroke thickness.

Respond strictly in JSON format with an array of synthesized characters.`;

    const parts: any[] = [];
    if (referenceImageBase64) {
      const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType,
        },
      });
    }
    parts.push({ text: prompt });

    const { response, modelUsed } = await generateContentWithFailover(ai, preferredModel, {
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            styleAnalysis: {
              type: Type.STRING,
              description: "Brief analysis of stroke weight, curvature, and stylistic traits",
            },
            synthesizedGlyphs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  char: {
                    type: Type.STRING,
                    description: "The target single character",
                  },
                  svgPath: {
                    type: Type.STRING,
                    description: "Complete SVG path 'd' attribute normalized to 100x100 bounding box",
                  },
                  advanceWidth: {
                    type: Type.NUMBER,
                    description: "Advance width suggestion (typically 70-110)",
                  },
                  notes: {
                    type: Type.STRING,
                    description: "Design rationale",
                  },
                },
                required: ["char", "svgPath"],
              },
            },
          },
          required: ["synthesizedGlyphs"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed._modelUsed = modelUsed;
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error expanding character set with AI:", error);
    return res.status(500).json({
      error: error.message || "Failed to expand character set with AI.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Image to Font Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
