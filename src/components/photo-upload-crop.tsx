"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cropToSquareBlob } from "@/lib/crop-image";

export function PhotoUploadCrop({ initialUrl }: { initialUrl?: string | null }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialUrl ?? null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => setCroppedArea(areaPixels), []);

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم الصورة أكبر من 2 ميجا");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("الصورة لازم تكون JPG أو PNG");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setRawImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function confirmCrop() {
    if (!rawImage || !croppedArea) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await cropToSquareBlob(rawImage, croppedArea);
      const formData = new FormData();
      formData.append("file", blob, "photo.jpg");
      const res = await fetch("/api/members/photo", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل رفع الصورة");
      setPhotoUrl(json.url);
      setRawImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  if (rawImage) {
    return (
      <div className="space-y-3">
        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
          <Cropper image={rawImage} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
        </div>
        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={confirmCrop} disabled={uploading}>
            {uploading ? "جاري الرفع…" : "قص وحفظ"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setRawImage(null)}>
            إلغاء
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="صورة العضو" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-6 h-6 text-[var(--muted)]" />
        )}
        {photoUrl && (
          <button
            type="button"
            onClick={() => setPhotoUrl(null)}
            className="absolute top-0 end-0 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center"
            title="إزالة الصورة"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Camera className="w-4 h-4" /> {photoUrl ? "تغيير الصورة" : "رفع صورة"}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onFilePicked} />
        <p className="text-xs text-[var(--muted)] mt-1">مربعة 400×400، أقل من 2 ميجا، JPG أو PNG</p>
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
      </div>
    </div>
  );
}
