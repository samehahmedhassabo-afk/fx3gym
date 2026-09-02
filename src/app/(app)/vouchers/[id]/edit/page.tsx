import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateVoucher } from "@/lib/actions/vouchers";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select } from "@/components/ui/input";

function toDateInputValue(date: Date | null) {
  return date ? new Date(date.getTime() - 60_000 * date.getTimezoneOffset()).toISOString().slice(0, 10) : "";
}

export default async function EditVoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("vouchers.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const voucher = await db.voucher.findUnique({ where: { id } });
  if (!voucher) notFound();

  const action = updateVoucher.bind(null, id);

  return (
    <>
      <Header
        title={`تعديل الكود: ${voucher.code}`}
        user={session}
        locale={locale}
        actions={
          <Link href="/vouchers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" /> {t.common.back}
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 max-w-2xl">
        <form action={action}>
          <Card>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>الكود *</Label>
                <Input name="code" required defaultValue={voucher.code} className="uppercase" />
              </div>
              <div>
                <Label>النوع *</Label>
                <Select name="type" defaultValue={voucher.type}>
                  <option value="PERCENT">نسبة %</option>
                  <option value="FIXED">مبلغ ثابت</option>
                </Select>
              </div>
              <div>
                <Label>القيمة *</Label>
                <Input name="value" type="number" step="any" min="0" required defaultValue={voucher.value} />
              </div>
              <div>
                <Label>الحد الأقصى للاستخدام</Label>
                <Input name="maxUses" type="number" min="1" placeholder="بدون حد" defaultValue={voucher.maxUses ?? ""} />
              </div>
              <div>
                <Label>صالح من</Label>
                <Input name="validFrom" type="date" defaultValue={toDateInputValue(voucher.validFrom)} />
              </div>
              <div>
                <Label>صالح حتى</Label>
                <Input name="validUntil" type="date" defaultValue={toDateInputValue(voucher.validUntil)} />
              </div>
              <div className="md:col-span-2">
                <Label>الوصف</Label>
                <Input name="description" defaultValue={voucher.description ?? ""} placeholder="خصم الصيف" />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/vouchers">
                <Button variant="outline" type="button">
                  {t.common.cancel}
                </Button>
              </Link>
              <Button type="submit">{t.common.save}</Button>
            </div>
          </Card>
        </form>
      </main>
    </>
  );
}
