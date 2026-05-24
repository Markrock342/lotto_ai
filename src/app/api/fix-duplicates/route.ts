import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, message: "This endpoint has been disabled to protect data integrity." });
}
