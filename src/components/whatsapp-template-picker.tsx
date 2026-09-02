"use client";

import { useState, useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { Label, Select, Textarea } from "@/components/ui/input";

function fillTemplate(body: string, vars: Record<string, string>) {
  return (body || "").replace(/\{(name|plan|days|code|gym)\}/g, (_, key: string) => vars[key] ?? "");
}

export function WhatsAppTemplatePicker({
  phone,
  memberName,
  plan,
  daysLeft,
  memberCode,
  templates,
}: {
  phone: string;
  memberName: string;
  plan?: string;
  daysLeft?: number | null;
  memberCode?: string;
  templates: { id: string; name: string; body: string }[];
}) {
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");

  const vars = useMemo(
    () => ({
      name: memberName,
      plan: plan ?? "",
      days: daysLeft != null ? String(daysLeft) : "",
      code: memberCode ?? "",
      gym: "FX3",
    }),
    [memberName, plan, daysLeft, memberCode]
  );

  const digits = (phone || "").replace(/\D/g, "");
  const normalized = digits.startsWith("20") ? digits : digits.startsWith("0") ? "20" + digits.slice(1) : digits;
  const href = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  const disabled = !normalized || message.trim() === "";

  return (
    <div className="space-y-3">
      <div>
        <Label>قالب الرسالة</Label>
        <Select
          value={templateId}
          onChange={(e) => {
            const id = e.target.value;
            setTemplateId(id);
            const template = templates.find((tpl) => tpl.id === id);
            setMessage(template ? fillTemplate(template.body, vars) : "");
          }}
        >
          <option value="">— اختر قالب —</option>
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>الرسالة (قابلة للتعديل)</Label>
        <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اختر قالب أو اكتب رسالتك هنا…" />
      </div>
      <a
        href={disabled ? undefined : href}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={disabled}
        className={
          "inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-lg text-white transition-colors " +
          (disabled ? "bg-emerald-600/50 pointer-events-none" : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]")
        }
      >
        <MessageCircle className="w-4 h-4" />
        إرسال واتساب
      </a>
    </div>
  );
}
