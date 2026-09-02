import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function addDays(date: Date | string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a: Date | string, b: Date | string) {
  const from = typeof a === "string" ? new Date(a) : a;
  const to = typeof b === "string" ? new Date(b) : b;
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatCurrency(amount: number, locale = "ar-EG") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string, locale = "en-GB") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export function formatDateTime(date: Date | string, locale = "en-GB") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function generateInvoiceNumber(n: number | string) {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(n).padStart(6, "0")}`;
}

// Plain incrementing number (1, 2, 3...), no prefix/padding — memberCode is stored
// and matched as an opaque string everywhere else in the app, so this is a pure
// display-format change. The underlying sequence counter is untouched and keeps
// incrementing from wherever it left off, so existing "FX3-00001"-style codes stay
// valid and unaffected — only newly created members get the new plain format.
export function generateMemberCode(n: number | string) {
  return String(n);
}

export function generateSaleNumber(n: number | string) {
  const year = new Date().getFullYear();
  return `S-${year}-${String(n).padStart(6, "0")}`;
}

export function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}

export function whatsAppLink(phone: string, message?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const normalized = digits.startsWith("20") ? digits : digits.startsWith("0") ? "20" + digits.slice(1) : digits;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${query}`;
}
