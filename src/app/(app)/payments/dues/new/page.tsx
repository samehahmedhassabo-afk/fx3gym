import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createDue } from "@/lib/actions/dues";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { DuePayerPicker } from "@/components/due-payer-picker";

export default async function NewDuePage() {
  const session = await requirePermission("dues.create");
  const { locale } = await getT();

  const [members, trainers, employees] = await Promise.all([
    db.member.findMany({ orderBy: { firstName: "asc" } }),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
    db.employee.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <>
      <Header title="إضافة مستحق" user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createDue}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">إضافة مستحق جديد</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <DuePayerPicker
                  members={members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}`, sublabel: `${m.memberCode} — ${m.phone}` }))}
                  trainers={trainers.map((tr) => ({ id: tr.id, name: tr.user.fullName }))}
                  employees={employees.map((e) => ({ id: e.id, name: e.fullName }))}
                />
              </div>
              <div>
                <Label>المبلغ *</Label>
                <Input name="amount" type="number" step="0.01" required />
              </div>
              <div>
                <Label>تاريخ الاستحقاق *</Label>
                <Input name="dueDate" type="date" required />
              </div>
              <div>
                <Label>الفئة</Label>
                <Select name="category" defaultValue="OTHER">
                  <option value="SUBSCRIPTION_BALANCE">رصيد اشتراك</option>
                  <option value="TRAINER_RENTAL">إيجار مكان</option>
                  <option value="SALARY_ADVANCE">سلفة راتب</option>
                  <option value="OTHER">أخرى</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>الوصف</Label>
                <Input name="description" />
              </div>
              <div className="md:col-span-2">
                <Label>ملاحظات</Label>
                <Textarea name="notes" rows={2} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/payments/dues">
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
