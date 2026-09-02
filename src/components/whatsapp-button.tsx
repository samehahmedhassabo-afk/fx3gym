import { MessageCircle } from "lucide-react";
import { whatsAppLink } from "@/lib/utils";

export function WhatsAppButton({
  phone,
  message,
  label,
  iconOnly = false,
  className,
}: {
  phone: string;
  message?: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const href = whatsAppLink(phone, message);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label ?? "واتساب"}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 h-8 px-3 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors active:scale-[0.98]"
      }
    >
      <MessageCircle className="w-4 h-4" />
      {!iconOnly && <span>{label ?? "واتساب"}</span>}
    </a>
  );
}
