import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ match: null }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone")?.trim() ?? "";
  const excludeId = searchParams.get("excludeId") ?? undefined;
  if (!phone) return NextResponse.json({ match: null });

  const match = await db.member.findUnique({
    where: { phone },
    select: { id: true, firstName: true, lastName: true, phone: true, memberCode: true },
  });
  if (!match || match.id === excludeId) return NextResponse.json({ match: null });

  return NextResponse.json({ match });
}
