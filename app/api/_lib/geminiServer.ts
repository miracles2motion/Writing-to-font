import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest } from "next/server";

export { Type };

let defaultAiClient: GoogleGenAI | null = null;

export function getAI(customKey?: string | null): GoogleGenAI | null {
  const activeKey = customKey?.trim() || process.env.GEMINI_API_KEY;
  if (!activeKey) return null;

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

  return new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export function extractApiKeyFromReq(req: NextRequest, body?: any): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const customHeader = req.headers.get("x-gemini-api-key");
  if (customHeader && customHeader.trim()) {
    return customHeader.trim();
  }
  if (body && typeof body.customApiKey === "string" && body.customApiKey.trim()) {
    return body.customApiKey.trim();
  }
  return null;
}

export function extractModelFromReq(req: NextRequest, body?: any): string {
  const modelHeader = req.headers.get("x-gemini-model");
  if (modelHeader && modelHeader.trim()) {
    return modelHeader.trim();
  }
  if (body && typeof body.preferredModel === "string" && body.preferredModel.trim()) {
    return body.preferredModel.trim();
  }
  return "gemini-2.5-flash";
}

/**
 * Executes a Gemini request with automatic multi-model failover and hard timeout.
 */
export async function generateContentWithFailover(
  ai: GoogleGenAI,
  requestedModel: string,
  params: { contents: any; config?: any },
  timeoutMs: number = 22000
): Promise<{ response: any; modelUsed: string }> {
  let fallbackCandidates = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];
  try {
    const listRes = await ai.models.list();
    const rawList: any[] = [];
    if (listRes) {
      if (Symbol.asyncIterator in Object(listRes)) {
        for await (const m of listRes as any) rawList.push(m);
      } else if (Array.isArray((listRes as any).models)) {
        rawList.push(...(listRes as any).models);
      } else if (Array.isArray(listRes)) {
        rawList.push(...listRes);
      }
    }
    const dynamicModels = rawList
      .map((m) => {
         const name = m.name || m.id || "";
         return name.replace(/^models\//, "");
      })
      .filter((m) => m.includes("gemini") && !m.includes("embedding") && !m.includes("aqa") && !m.includes("imagen") && !m.includes("vision"))
      .sort((a, b) => {
         const score = (model: string) => {
           let s = 0;
           if (model.includes("pro")) s += 100;
           if (model.includes("flash")) s += 50;
           if (model.includes("2.5")) s += 30;
           if (model.includes("2.0")) s += 20;
           if (model.includes("1.5")) s += 10;
           return s;
         };
         return score(b) - score(a);
      });
    if (dynamicModels.length > 0) {
      fallbackCandidates = dynamicModels;
    }
  } catch (e) {
    console.warn("Failed to fetch dynamic models for failover. Using hardcoded fallback list.", e);
  }

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
        setTimeout(
          () => reject(new Error(`Model ${modelToTry} timed out after ${Math.round(timeoutMs / 1000)}s`)),
          timeoutMs
        )
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      return { response, modelUsed: modelToTry };
    } catch (err: any) {
      console.warn(
        `[Gemini Failover] Model '${modelToTry}' failed. Checking next standby model in chain...`,
        err?.message || err
      );
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini failover models exhausted.");
}
