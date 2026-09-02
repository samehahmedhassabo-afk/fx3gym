import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { isValidBackup, importDatabase } from "@/lib/backup";
import { ok, fail, toApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    await assertAdmin();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(fail("nofile"), { status: 400 });
    }

    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(fail("badjson"), { status: 400 });
    }

    if (!isValidBackup(parsed)) {
      return NextResponse.json(fail("invalid"), { status: 400 });
    }

    const counts = await importDatabase(parsed);
    const totalRows = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return NextResponse.json(ok({ counts, totalRows }));
  } catch (err) {
    console.error("DB restore failed:", err);
    return NextResponse.json(toApiError(err, "error"), { status: 500 });
  }
}
