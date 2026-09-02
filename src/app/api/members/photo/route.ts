import { NextRequest, NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };

export async function POST(req: NextRequest) {
  try {
    await assertPermission("members.edit");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم اختيار صورة" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "حجم الصورة أكبر من 2 ميجا" }, { status: 400 });
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "الصورة لازم تكون JPG أو PNG" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const url = await saveUpload("members", filename, buffer);
  return NextResponse.json({ url });
}
