import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
}
