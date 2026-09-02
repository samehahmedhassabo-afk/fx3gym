import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveUploadPath } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { path: segments } = await params;
  if (!segments || segments.length < 2 || segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const [subdir, filename] = [segments[0], segments.slice(1).join("/")];
  const filePath = resolveUploadPath(subdir, filename);

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
