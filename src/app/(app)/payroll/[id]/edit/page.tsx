import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updatePayroll } from "@/lib/actions/employees";
import { formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea } from "@/components/ui/input";

export default async function EditPayrollPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("payroll.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const payroll = await db.payroll.findUnique({ where: { id }, include: { employee: true } });
  if (!payroll) notFound();

  const action = updatePayroll.bind(null, id);
  const pad = (n: number) => String(n).padStart(2, "0");
  const paidAtValue = payroll.paidAt
    ? `${payroll.paidAt.getFullYear()}-${pad(payroll.paidAt.getMonth() + 1)}-${pad(payroll.paidAt.getDate())}T${pad(payroll.paidAt.getHours())}:${pad(payroll.paidAt.getMinutes())}`
    : "";

  return (
    <>
      <Header title={t.employees.payroll} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {t.common.edit} {t.employees.payroll} — {payroll.employee.fullName}
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                {formatDate(payroll.periodStart)} → {formatDate(payroll.periodEnd)}
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Base Salary</Label>
                <Input name="baseSalary" type="number" step="0.01" defaultValue={payroll.baseSalary} />
              </div>
              <div>
                <Label>Bonus</Label>
                <Input name="bonus" type="number" step="0.01" defaultValue={payroll.bonus} />
              </div>
              <div>
                <Label>Commission</Label>
                <Input name="commission" type="number" step="0.01" defaultValue={payroll.commission} />
              </div>
              <div>
                <Label>Deductions</Label>
                <Input name="deductions" type="number" step="0.01" defaultValue={payroll.deductions} />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <input type="checkbox" name="paid" defaultChecked={payroll.paid} className="h-4 w-4 rounded border-[var(--border)]" />
                  {locale === "ar" ? "مدفوع" : "Paid"}
                </Label>
              </div>
              <div>
                <Label>{locale === "ar" ? "تاريخ الدفع" : "Paid At"}</Label>
                <Input name="paidAt" type="datetime-local" defaultValue={paidAtValue} />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} defaultValue={payroll.notes ?? ""} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/payroll">
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
