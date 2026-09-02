import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ match: null }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim() ?? "";
  const excludeId = searchParams.get("excludeId") ?? undefined;
  if (!code) return NextResponse.json({ match: null });

  const match = await db.member.findUnique({ where: { memberCode: code }, select: { id: true, firstName: true, lastName: true } });
  if (!match || match.id === excludeId) return NextResponse.json({ match: null });

  return NextResponse.json({ match });
}
