import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createRental } from "@/lib/actions/rentals";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { RentalPaymentChoice } from "@/components/rental-payment-choice";

export default async function NewRentalPage() {
  const session = await requirePermission("rentals.create");
  const { locale } = await getT();

  const trainers = await db.trainer.findMany({ where: { isActive: true }, include: { user: true } });

  return (
    <>
      <Header title="إضافة إيجار منطقة" user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createRental}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">تأجير منطقة/معدات لكابتن</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>الكابتن *</Label>
                <Select name="trainerId" required>
                  <option value="">— اختر —</option>
                  {trainers.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.user.fullName}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>المنطقة/المعدات *</Label>
                <Input name="areaName" required placeholder="منطقة الأوزان / الماتة الرئيسية..." />
              </div>
              <div>
                <Label>قيمة الإيجار *</Label>
                <Input name="rentFee" type="number" step="0.01" required />
              </div>
              <div>
                <Label>عدد الأعضاء المتوقع</Label>
                <Input name="expectedMembers" type="number" min="0" />
              </div>
              <div>
                <Label>وقت البداية *</Label>
                <Input name="startTime" type="datetime-local" required />
              </div>
              <div>
                <Label>وقت النهاية *</Label>
                <Input name="endTime" type="datetime-local" required />
              </div>
              <RentalPaymentChoice />
              <div className="md:col-span-2">
                <Label>ملاحظات</Label>
                <Textarea name="notes" rows={2} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/rentals">
                <Button variant="outline" type="button">
                  إلغاء
                </Button>
              </Link>
              <Button type="submit">حفظ</Button>
            </div>
          </Card>
        </form>
      </main>
    </>
  );
}
