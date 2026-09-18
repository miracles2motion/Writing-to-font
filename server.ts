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

    const prompt = `Analyze this character sheet image. It contains hand-drawn or designed characters (letters A-Z, numbers 0-9, and symbols).
There are approximately ${detectedCount || "20-50"} glyphs arranged in rows or a grid on a white background.

Please inspect the characters visible from left-to-right, top-to-bottom:
1. List all detected characters in their reading order (uppercase letters, lowercase if any, digits 0-9, symbols like !?.,- etc).
2. Describe the font's artistic style (e.g. geometric sans, playful handwritten, bold brush, gothic, slab serif).
3. Suggest an appropriate Font Family Name based on its visual personality.
4. Estimate key metrics: whether it has serifs, stroke weight (Light, Regular, Bold, Black), slant (Upright or Italic), and uppercase x-height proportion.

Respond in JSON format with:
- characters: array of single character strings in reading order, e.g. ["A", "B", "C", ...]
- style: string (e.g. "Playful Handwritten Sans")
- suggestedName: string (e.g. "SunnyHand")
- weight: string (e.g. "Bold")
- description: string (short 1-2 sentence aesthetic summary)`;

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
              description: "Array of detected single characters in visual reading order",
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
