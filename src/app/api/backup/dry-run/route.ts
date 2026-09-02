import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { isValidBackup, dryRunImport } from "@/lib/backup";

export async function POST(request: Request) {
  try {
    await assertAdmin();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, reason: "nofile" }, { status: 400 });
    }

    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ ok: false, reason: "badjson" }, { status: 400 });
    }

    if (!isValidBackup(parsed)) {
      return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
    }

    const counts = await dryRunImport(parsed);
    const totalRows = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const exportedAt = (parsed as { exportedAt?: string }).exportedAt ?? "";
    return NextResponse.json({ ok: true, counts, totalRows, exportedAt });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, reason: "error", detail: detail.slice(0, 300) }, { status: 500 });
  }
}
