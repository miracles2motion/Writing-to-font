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
      return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
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
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Error classifying glyph:", err);
    return NextResponse.json({ error: err.message || "Failed to classify glyph." }, { status: 500 });
  }
}
