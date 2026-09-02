import { db } from "@/lib/db";
import { generateMemberCode, generateInvoiceNumber, generateSaleNumber } from "@/lib/utils";

async function nextSequence(key: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const setting = await tx.setting.findUnique({ where: { key } });
    const current = parseInt(setting?.value ?? "1", 10);
    if (Number.isNaN(current)) throw new Error(`Setting ${key} is not numeric`);
    await tx.setting.upsert({
      where: { key },
      update: { value: String(current + 1) },
      create: { key, value: String(current + 1) },
    });
    return current;
  });
}

export async function nextMemberCode(): Promise<string> {
  return generateMemberCode(await nextSequence("next.member.sequence"));
}

export async function nextInvoiceNumber(): Promise<string> {
  return generateInvoiceNumber(await nextSequence("next.invoice.sequence"));
}

export async function nextSaleNumber(): Promise<string> {
  return generateSaleNumber(await nextSequence("next.sale.sequence"));
}
