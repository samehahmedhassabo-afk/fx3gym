import * as XLSX from "xlsx";

const HEADER_ALIASES: Record<string, "coach" | "year" | "month" | "amount"> = {
  coach: "coach",
  coachname: "coach",
  "coach name": "coach",
  trainer: "coach",
  "اسم الكابتن": "coach",
  الكابتن: "coach",
  year: "year",
  السنة: "year",
  month: "month",
  الشهر: "month",
  amount: "amount",
  revenue: "amount",
  total: "amount",
  الإيراد: "amount",
  الاجمالي: "amount",
  الإجمالي: "amount",
};

function normalizeHeader(h: string): "coach" | "year" | "month" | "amount" | null {
  const key = String(h).trim().toLowerCase();
  return HEADER_ALIASES[key] ?? null;
}

export type ParsedRevenueRow = { coach: string; year: number; month: number; amount: number };
export type RevenueImportResult = { rows: ParsedRevenueRow[]; errors: string[] };

export function parseRevenueWorkbook(buffer: Buffer): RevenueImportResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: ParsedRevenueRow[] = [];
  const errors: string[] = [];

  raw.forEach((rawRow, i) => {
    const mapped: Partial<Record<"coach" | "year" | "month" | "amount", unknown>> = {};
    for (const [header, value] of Object.entries(rawRow)) {
      const key = normalizeHeader(header);
      if (key) mapped[key] = value;
    }
    const rowNum = i + 2; // header row + 1-indexed
    const coach = String(mapped.coach ?? "").trim();
    const year = Number(mapped.year);
    const month = Number(mapped.month);
    const amount = Number(mapped.amount);

    if (!coach) return errors.push(`صف ${rowNum}: اسم الكابتن مفقود`);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return errors.push(`صف ${rowNum}: سنة غير صالحة`);
    if (!Number.isInteger(month) || month < 1 || month > 12) return errors.push(`صف ${rowNum}: شهر غير صالح (1-12)`);
    if (!Number.isFinite(amount) || amount < 0) return errors.push(`صف ${rowNum}: قيمة إيراد غير صالحة`);

    rows.push({ coach, year, month, amount });
  });

  return { rows, errors };
}
