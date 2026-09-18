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
    const { imageBase64, mimeType = "image/png" } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64 document data" }, { status: 400 });
    }

    const customApiKey = extractApiKeyFromReq(req, body);
    const preferredModel = extractModelFromReq(req, body);
    const ai = getAI(customApiKey);
    if (!ai) {
      return NextResponse.json(
        {
          error: "No Gemini API key available. Please configure your key in Settings or environment.",
        },
        { status: 503 }
      );
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
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error harvesting alphabet from notes:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to harvest alphabet from notes.",
      },
      { status: 500 }
    );
  }
}
