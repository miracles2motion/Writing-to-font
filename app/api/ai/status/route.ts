import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromReq } from "../../_lib/geminiServer";

export async function GET(req: NextRequest) {
  const customApiKey = extractApiKeyFromReq(req);
  const activeKey = customApiKey || process.env.GEMINI_API_KEY;
  return NextResponse.json({
    hasKey: Boolean(activeKey),
    isCustomKey: Boolean(customApiKey),
    hasServerKey: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: "gemini-2.5-flash",
  });
}
