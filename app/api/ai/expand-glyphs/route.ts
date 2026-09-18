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
    const {
      referenceImageBase64,
      mimeType = "image/png",
      existingCharacters = [],
      targetCharacters = [],
      fontStyle = "custom display font",
    } = body;

    if (!targetCharacters || targetCharacters.length === 0) {
      return NextResponse.json({ error: "Missing targetCharacters to generate." }, { status: 400 });
    }

    const customApiKey = extractApiKeyFromReq(req, body);
    const preferredModel = extractModelFromReq(req, body);
    const ai = getAI(customApiKey);
    if (!ai) {
      return NextResponse.json(
        { error: "No Gemini API key available. Please configure your key in Settings or environment." },
        { status: 503 }
      );
    }

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
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error expanding character set with AI:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to expand character set with AI.",
      },
      { status: 500 }
    );
  }
}
