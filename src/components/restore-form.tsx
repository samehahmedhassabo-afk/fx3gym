"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Upload, ShieldCheck, XCircle, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";

type Preview = { counts: Record<string, number>; exportedAt: string; totalRows: number };

export function RestoreForm() {
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [isProcessing, startTransition] = useTransition();
  const [optimisticPreview, setOptimisticPreview] = useOptimistic(
    preview,
    (_, next: Preview) => next
  );

  async function onDryRun(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPreview(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File)) {
      setError("اختر ملف النسخة أولًا.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/backup/dry-run", {
          method: "POST",
          body: fd,
          credentials: "include",
          cache: "no-store",
        });
        const contentType = res.headers.get("content-type") || "";
        let data: any = null;
        try {
          data = contentType.includes("application/json") ? await res.json() : null;
        } catch {
          data = null;
        }
        if (!res.ok || !data) {
          const text = contentType.includes("application/json") ? JSON.stringify(data) : await res.text();
          throw new Error(text || `Server returned ${res.status} ${res.statusText}`);
        }
        if (!data.ok) throw new Error(data.detail || "فشلت قراءة الملف.");
        setOptimisticPreview({ counts: data.counts, exportedAt: data.exportedAt, totalRows: data.totalRows });
        setPreview({ counts: data.counts, exportedAt: data.exportedAt, totalRows: data.totalRows });
      } catch (err) {
        const message = err instanceof Error ? err.message : "فشل المعاينة.";
        setError(message);
      }
    });
  }

  async function onConfirmImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preview || !selectedFile) {
      setError(!selectedFile ? "الملف مش متاح بعد، اختر الملف تاني." : "اعمل المعاينة أولًا.");
      return;
    }
    const confirmed = confirm(
      `استعادة كاملة من نسخة ${preview.exportedAt ? new Date(preview.exportedAt).toLocaleString("ar-EG") : "غير معروف"} — ${preview.totalRows} سجل.\n\nده هيمسح كل البيانات الحالية ويحطّ مكانها بيانات الملف. متأكد؟`
    );
    if (!confirmed) return;

    const fd = new FormData();
    fd.set("file", selectedFile);

    startTransition(async () => {
      try {
        const res = await fetch("/api/backup/import", { method: "POST", body: fd, credentials: "include", cache: "no-store" });
        const contentType = res.headers.get("content-type") || "";
        let data: any = null;
        try {
          data = contentType.includes("application/json") ? await res.json() : null;
        } catch {
          data = null;
        }
        if (!res.ok || !data) {
          const text = contentType.includes("application/json") ? JSON.stringify(data) : await res.text();
          throw new Error(text || `Server returned ${res.status} ${res.statusText}`);
        }
        if (!data.ok) throw new Error(data.detail || "فشلت الاستعادة.");
        alert("تمت الاستعادة بنجاح. سجّل دخول تاني.");
        window.location.href = "/signin";
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشلت الاستعادة.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onDryRun} className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 h-10 px-4 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>{fileName || "اختر ملف النسخة (.json)"}</span>
          <input
            type="file"
            name="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setFileName(file?.name ?? "");
              setSelectedFile(file ?? null);
              setPreview(null);
              setError("");
            }}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={isProcessing || !fileName}>
          <FileJson className="w-4 h-4" />
          معاينة
        </Button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 border border-red-200 bg-red-50 rounded-lg px-4 py-2.5">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {optimisticPreview && (
        <div className="border border-[var(--border)] rounded-lg p-4 space-y-2 bg-[var(--surface)]">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            معاينة الاستعادة
          </div>
          <div className="text-xs text-[var(--muted)]">
            {optimisticPreview.exportedAt
              ? `تاريخ النسخة: ${new Date(optimisticPreview.exportedAt).toLocaleString("ar-EG")}`
              : "تاريخ النسخة: غير معروف"}
            <span className="mx-2">•</span>
            {optimisticPreview.totalRows} سجل
          </div>
          <div className="max-h-40 overflow-auto rounded border border-[var(--border)] bg-[var(--background)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th className="text-start px-3 py-1.5">النموذج</th>
                  <th className="text-end px-3 py-1.5">عدد السجلات</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(optimisticPreview.counts)
                  .filter(([, count]) => count > 0)
                  .map(([model, count]) => (
                    <tr key={model} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-3 py-1.5 font-mono">{model}</td>
                      <td className="px-3 py-1.5 text-end">{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <form onSubmit={onConfirmImport} className="flex items-center gap-2">
            <Button type="submit" variant="danger" disabled={isProcessing}>
              تأكيد الاستعادة
            </Button>
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>
              إلغاء
            </Button>
          </form>
        </div>
      )}

      {!optimisticPreview && !error && (
        <p className="text-xs text-[var(--muted)]">
          هيعمل معاينة للنسخة أولًا، ثم تأكّد الاستبدال الكامل.
        </p>
      )}
    </div>
  );
}

