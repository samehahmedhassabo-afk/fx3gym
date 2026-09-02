"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input } from "@/components/ui/input";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function SystemTimeCard() {
  const [now, setNow] = useState<Date | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setIsElectron(Boolean(window.fx3System));
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleApply() {
    if (!window.fx3System || !draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const iso = new Date(draft).toISOString();
      await window.fx3System.setTime(iso);
      setMessage({ ok: true, text: "تم تحديث وقت الجهاز بنجاح ✓" });
      setDraft("");
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "فشل تحديث الوقت." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="p-5 border-b border-[var(--border)]">
        <h2 className="font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" /> وقت الجهاز
        </h2>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs text-[var(--muted)] mb-1">الوقت الحالي على الجهاز</p>
          <p className="text-2xl font-bold font-mono tabular-nums">
            {now ? now.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "medium" }) : "—"}
          </p>
        </div>

        {!isElectron ? (
          <div className="rounded-lg px-4 py-2.5 text-sm border bg-amber-50 text-amber-800 border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>تعديل الوقت متاح فقط داخل تطبيق FX3 على سطح المكتب (لا يعمل من المتصفح).</span>
          </div>
        ) : (
          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <div className="max-w-xs">
              <Label>ضبط تاريخ ووقت جديد</Label>
              <Input
                type="datetime-local"
                step={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={now ? toLocalInputValue(now) : undefined}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" onClick={handleApply} disabled={!draft || saving} size="sm">
                {saving ? "جارٍ التحديث…" : "تحديث وقت الجهاز"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => now && setDraft(toLocalInputValue(now))}
                disabled={saving}
              >
                استخدم الوقت الحالي
              </Button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              هيظهرلك طلب صلاحيات المسؤول (UAC) من ويندوز لتأكيد تغيير وقت الجهاز.
            </p>
          </div>
        )}

        {message && (
          <div
            className={`rounded-lg px-4 py-2.5 text-sm border flex items-start gap-2 ${
              message.ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
