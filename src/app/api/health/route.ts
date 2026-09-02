import { NextResponse } from "next/server";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    return NextResponse.json({
      ok: false,
      reason: "no_database_url",
      detail:
        "DATABASE_URL is not configured. Set it in your Vercel project environment variables.",
    });
  }

  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1 AS ok`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: "db_unreachable", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
