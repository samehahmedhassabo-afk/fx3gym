import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createPayroll } from "@/lib/actions/employees";
import { pendingAdjustmentsForEmployee } from "@/lib/actions/tasks";
import { formatCurrency } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";

export default async function NewPayrollPage({ searchParams }: { searchParams: Promise<{ employeeId?: string }> }) {
  const session = await requirePermission("payroll.create");
  const { t, locale } = await getT();
  const params = await searchParams;
  const employees = await db.employee.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } });
  const adjustments = params.employeeId ? await pendingAdjustmentsForEmployee(params.employeeId) : null;

  return (
    <>
      <Header title={t.employees.payroll} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createPayroll}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {t.common.add} {t.employees.payroll}
              </h2>
            </div>
            {adjustments && (adjustments.bonus > 0 || adjustments.deductions > 0) && (
              <div className="mx-5 mt-5 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm">
                {t.tasks.pendingAdjustments}: {adjustments.bonus > 0 && <span className="text-emerald-700">+{formatCurrency(adjustments.bonus)}</span>}{" "}
                {adjustments.deductions > 0 && <span className="text-red-700">-{formatCurrency(adjustments.deductions)}</span>} —{" "}
                {adjustments.tasks.length} {t.tasks.title}. {t.tasks.willApplyOnSave}
              </div>
            )}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {adjustments && (adjustments.bonus > 0 || adjustments.deductions > 0) && (
                <input type="hidden" name="applyTaskAdjustmentsForEmployeeId" value={params.employeeId} />
              )}
              <div className="md:col-span-2">
                <Label>{t.members.name} *</Label>
                <Select name="employeeId" required defaultValue={params.employeeId ?? ""}>
                  <option value="">—</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.position})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Period Start *</Label>
                <Input name="periodStart" type="date" required />
              </div>
              <div>
                <Label>Period End *</Label>
                <Input name="periodEnd" type="date" required />
              </div>
              <div>
                <Label>Base Salary</Label>
                <Input name="baseSalary" type="number" step="0.01" defaultValue="0" />
              </div>
              <div>
                <Label>Bonus</Label>
                <Input name="bonus" type="number" step="0.01" defaultValue={adjustments?.bonus ?? 0} />
              </div>
              <div>
                <Label>Commission</Label>
                <Input name="commission" type="number" step="0.01" defaultValue="0" />
              </div>
              <div>
                <Label>Deductions</Label>
                <Input name="deductions" type="number" step="0.01" defaultValue={adjustments?.deductions ?? 0} />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="hidden" name="markPaid" value="off" />
                  <input type="checkbox" name="markPaid" value="on" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">دفع فوري (خصم على طول — بدون حالة معلّقة)</span>
                </label>
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
