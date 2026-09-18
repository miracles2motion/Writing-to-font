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

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

// AI Recognition of Glyph Sheet
app.post("/api/ai/recognize-glyphs", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png", detectedCount = 0 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured in server environment.",
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

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
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

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Look at this single cropped character image from a font sheet.
Identify what exact character this is, paying crucial attention to CASING (uppercase vs lowercase):
- Is it an UPPERCASE letter (e.g. 'A', 'B', 'C'...), a LOWERCASE letter (e.g. 'a', 'b', 'c'...), a DIGIT (0-9), or a SYMBOL?
- Look for distinctive lowercase features: loop in 'a', crossbar and ear in 'g', curved top in 'r', ascenders on 'b'/'d'/'h'/'k'/'l'/'t', descenders on 'p'/'q'/'y', etc.
- Return the single character in 'char', 'casing' ("upper" | "lower" | "digit" | "symbol"), and a 1-sentence 'rationale'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
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
    return res.json(parsed);
  } catch (err: any) {
    console.error("Error classifying glyph:", err);
    return res.status(500).json({ error: err.message || "Failed to classify glyph." });
  }
});

// AI Style & Missing Glyph Advisory
app.post("/api/ai/font-advice", async (req, res) => {
  try {
    const { availableCharacters, fontName, fontStyle } = req.body;
    const ai = getAI();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured.",
      });
    }

    const prompt = `The user has created a custom font named "${fontName || "CustomFont"}" with style "${fontStyle || "handwritten"}".
Currently available characters in the font: "${(availableCharacters || []).join("")}".

Provide typography design recommendations:
1. What are the most critical missing standard characters for a usable font (e.g. lowercase a-z, space, period, exclamation mark)?
2. How should lowercase characters be derived or harmonized with the uppercase shapes if the user only supplied uppercase?
3. Recommended spacing (advance width tracking & side-bearings) for this style.
4. A creative sample pangram or marketing sentence that highlights this font's unique feel.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
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
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error generating font advice:", error);
    return res.status(500).json({ error: error.message || "Failed to get font advice" });
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
