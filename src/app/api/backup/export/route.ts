import { assertAdmin } from "@/lib/auth";
import { exportDatabase } from "@/lib/backup";

export async function GET() {
  await assertAdmin();
  const backup = await exportDatabase();
  const body = JSON.stringify(backup, null, 2);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const filename = `fx3-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
