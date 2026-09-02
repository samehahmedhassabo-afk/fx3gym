import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deletePayroll } from "@/lib/actions/employees";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function PayrollPage() {
  const session = await requirePermission("payroll.view");
  const { t, locale } = await getT();
  const perms = await getSessionPermissions();
  const canEdit = perms.has("payroll.edit");
  const canDelete = perms.has("payroll.delete");

  const payrolls = await db.payroll.findMany({ orderBy: { periodEnd: "desc" }, include: { employee: true }, take: 100 });

  const pendingTasks = await db.staffTask.findMany({
    where: { appliedPayrollId: null, OR: [{ bonusAmount: { gt: 0 } }, { deductionAmount: { gt: 0 } }] },
    include: { employee: true },
  });
  const pendingByEmployee = new Map<string, { name: string; bonus: number; deductions: number }>();
  for (const task of pendingTasks) {
    const entry = pendingByEmployee.get(task.employeeId) ?? { name: task.employee.fullName, bonus: 0, deductions: 0 };
    entry.bonus += task.bonusAmount;
    entry.deductions += task.deductionAmount;
    pendingByEmployee.set(task.employeeId, entry);
  }

  return (
    <>
      <Header title={t.employees.payroll} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        {pendingByEmployee.size > 0 && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.tasks.pendingAdjustments}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...pendingByEmployee.entries()].map(([employeeId, entry]) => (
                <div key={employeeId} className="rounded-lg border border-[var(--border)] p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{entry.name}</div>
                    <div className="text-xs mt-1 flex gap-2">
                      {entry.bonus > 0 && <span className="text-emerald-600">+{formatCurrency(entry.bonus)}</span>}
                      {entry.deductions > 0 && <span className="text-red-600">-{formatCurrency(entry.deductions)}</span>}
                    </div>
                  </div>
                  <Link href={`/payroll/new?employeeId=${employeeId}`}>
                    <Button size="sm" variant="outline">
                      {t.common.add}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-semibold">{t.employees.payroll}</h2>
            <Link href="/payroll/new">
              <Button>
                <Plus className="w-4 h-4" /> {t.common.add}
              </Button>
            </Link>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.members.name}</TH>
                <TH>Period</TH>
                <TH>Base</TH>
                <TH>Bonus</TH>
                <TH>Commission</TH>
                <TH>Deductions</TH>
                <TH>Net</TH>
                <TH>{t.common.status}</TH>
                {(canEdit || canDelete) && <TH className="text-left">{t.common.actions}</TH>}
              </TR>
            </THead>
            <TBody>
              {payrolls.length === 0 ? (
                <TR>
                  <TD colSpan={canEdit || canDelete ? 9 : 8} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                payrolls.map((p) => (
                  <TR key={p.id}>
                    <TD label={t.members.name} className="font-medium">{p.employee.fullName}</TD>
                    <TD label="Period" className="text-xs text-[var(--muted)]">
                      {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                    </TD>
                    <TD label="Base">{formatCurrency(p.baseSalary)}</TD>
                    <TD label="Bonus" className="text-emerald-600">+{formatCurrency(p.bonus)}</TD>
                    <TD label="Commission" className="text-emerald-600">+{formatCurrency(p.commission)}</TD>
                    <TD label="Deductions" className="text-red-600">-{formatCurrency(p.deductions)}</TD>
                    <TD label="Net" className="font-bold">{formatCurrency(p.netPay)}</TD>
                    <TD label={t.common.status}>
                      <Badge variant={p.paid ? "success" : "warning"}>{p.paid ? "Paid" : "Pending"}</Badge>
                    </TD>
                    {(canEdit || canDelete) && (
                      <TD label={t.common.actions}>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Link href={`/payroll/${p.id}/edit`}>
                              <Button variant="outline" size="sm">
                                {t.common.edit}
                              </Button>
                            </Link>
                          )}
                          {canDelete && <DeleteButton action={deletePayroll} id={p.id} iconOnly />}
                        </div>
                      </TD>
                    )}
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
