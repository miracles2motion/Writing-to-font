import { NextRequest, NextResponse } from "next/server";
import {
  getAI,
  extractApiKeyFromReq,
  extractModelFromReq,
  generateContentWithFailover,
  Type,
} from "../../_lib/geminiServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = "image/png", detectedCount = 0 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64 data" }, { status: 400 });
    }

    const customApiKey = extractApiKeyFromReq(req, body);
    const preferredModel = extractModelFromReq(req, body);
    const ai = getAI(customApiKey);
    if (!ai) {
      return NextResponse.json(
        {
          error: "No Gemini API key available. Please provide your Gemini API key in App Settings or environment.",
        },
        { status: 503 }
      );
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are a world-class typographic analyst, font engineer, and OCR specialist.
Analyze this character sheet image containing hand-drawn or designed alphabet characters, numbers, and symbols on a white background.
There are approximately ${detectedCount || "20-60"} glyphs arranged in rows or a grid. Note that this grid might be highly complex, dense, and heavily overlapping.

CRITICAL CASING & CHARACTER RECOGNITION RULES:
1. RIGOROUS UPPERCASE (A-Z) VS. LOWERCASE (a-z) DIFFERENTIATION:
   - Carefully examine the visual anatomy and relative proportions.
   - Distinct lowercase shapes: 'a' vs 'A', 'b' vs 'B', 'd' vs 'D', 'e' vs 'E', 'g' vs 'G', 'm' vs 'M', 'n' vs 'N', 'q' vs 'Q', 'r' vs 'R', 't' vs 'T'.
   - Ascenders extending tall: lowercase 'b', 'd', 'f', 'h', 'k', 'l', 't'.
   - Descenders dipping low: lowercase 'g', 'j', 'p', 'q', 'y'.
   - X-height characters: 'c', 'o', 's', 'v', 'w', 'x', 'z'. If they appear alongside capitals and are clearly shorter (x-height), identify them as lowercase ('c', 'o', 's'...), NOT uppercase.
   - If the user wrote lowercase characters, OUTPUT THEM STRICTLY IN LOWERCASE (e.g. "a", "b", "c").
   - NEVER convert lowercase letters into uppercase letters!
   - If the sheet has uppercase followed by lowercase, preserve each letter's exact casing.
   
2. COMPLEX & DENSED GRIDS:
   - Identify every single character, no matter how complex, distorted, or densely packed.
   - Some symbols might look like intersections. Be meticulous.
   - Digits 0-9: "0", "1", "2", "3", "4", "5", "6", "7", "8", "9".
   - Punctuation & Symbols: "!", "?", ".", ",", ":", ";", "'", '"', "-", "+", "=", "/", "@", "#", "$", "%", "&", "*", "(", ")".

3. ORDER:
   - List all detected characters strictly in natural visual reading order: row by row, from top-to-bottom and left-to-right.

4. METRICS & STYLE:
   - Describe the font's artistic style.
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
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Array of detected single characters with exact uppercase/lowercase casing preserved in visual reading order",
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
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error recognizing glyphs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze glyphs with Gemini." },
      { status: 500 }
    );
  }
}
