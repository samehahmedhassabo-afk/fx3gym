import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

function uploadsRoot(): string {
  if (process.env.NODE_ENV === "production") {
    return path.join("/tmp", "fx3-uploads");
  }
  return path.join(process.cwd(), "prisma", "uploads");
}

export async function saveUpload(subdir: string, filename: string, data: Buffer): Promise<string> {
  const dir = path.join(uploadsRoot(), subdir);
  await mkdir(dir, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  await writeFile(path.join(dir, safeName), data);
  return `/api/uploads/${subdir}/${safeName}`;
}

export async function deleteUpload(publicPath: string): Promise<void> {
  if (!publicPath.startsWith("/api/uploads/")) return;
  const rel = publicPath.replace("/api/uploads/", "");
  try {
    await unlink(path.join(uploadsRoot(), rel));
  } catch {}
}

export function resolveUploadPath(subdir: string, filename: string): string {
  return path.join(uploadsRoot(), subdir, filename);
}

