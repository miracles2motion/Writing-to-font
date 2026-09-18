import { NextRequest, NextResponse } from "next/server";
import { getAI, extractApiKeyFromReq } from "../../_lib/geminiServer";

export async function GET(req: NextRequest) {
  try {
    const customApiKey = extractApiKeyFromReq(req);
    const ai = getAI(customApiKey);

    if (!ai) {
      return NextResponse.json(
        {
          error: "No Gemini API key available. Please enter your API key to list available models.",
          models: [],
        },
        { status: 401 }
      );
    }

    const response = await ai.models.list();
    const rawList: any[] = [];

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
        return (
          idLower.includes("gemini") &&
          !idLower.includes("embedding") &&
          !idLower.includes("aqa") &&
          !idLower.includes("imagen")
        );
      });

    return NextResponse.json({
      success: true,
      count: formattedModels.length,
      models: formattedModels,
    });
  } catch (err: any) {
    console.warn("Failed to fetch dynamic model list from Gemini API:", err?.message || err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to query available models from Gemini API.",
        models: [],
      },
      { status: 500 }
    );
  }
}
