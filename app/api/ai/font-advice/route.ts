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
    const { availableCharacters, fontName, fontStyle } = body;
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
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error generating font advice:", error);
    return NextResponse.json({ error: error.message || "Failed to get font advice" }, { status: 500 });
  }
}
