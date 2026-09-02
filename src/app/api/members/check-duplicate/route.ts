import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findDuplicateMembers } from "@/lib/duplicate-check";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ matches: [] }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const firstName = searchParams.get("firstName") ?? "";
  const lastName = searchParams.get("lastName") ?? "";
  const excludeId = searchParams.get("excludeId") ?? undefined;
  if (!firstName.trim() || !lastName.trim()) return NextResponse.json({ matches: [] });

  const matches = await findDuplicateMembers(firstName, lastName, excludeId);
  return NextResponse.json({ matches });
}
