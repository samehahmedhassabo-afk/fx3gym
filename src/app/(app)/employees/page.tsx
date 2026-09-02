import Link from "next/link";
import { Plus, UserCog } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteEmployee } from "@/lib/actions/employees";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function EmployeesPage() {
  const session = await requirePermission("employees.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();
  const employees = await db.employee.findMany({ where: { isActive: true }, orderBy: { hireDate: "desc" } });
  const canManage = perms.has("employees.edit") || perms.has("employees.delete");

  return (
    <>
      <Header title={t.employees.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <UserCog className="w-4 h-4" /> {t.employees.title}
            </h2>
            <Link href="/employees/new">
              <Button>
                <Plus className="w-4 h-4" /> {t.employees.addEmployee}
              </Button>
            </Link>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.members.name}</TH>
                <TH>{t.employees.position}</TH>
                <TH>{t.employees.type}</TH>
                <TH>{t.employees.salary}</TH>
                <TH>{t.members.phone}</TH>
                <TH>{t.employees.hireDate}</TH>
                {canManage && <TH>{t.common.actions}</TH>}
              </TR>
            </THead>
            <TBody>
              {employees.length === 0 ? (
                <TR>
                  <TD colSpan={canManage ? 7 : 6} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                employees.map((e) => (
                  <TR key={e.id}>
                    <TD label={t.members.name} className="font-medium">{e.fullName}</TD>
                    <TD label={t.employees.position}>{e.position}</TD>
                    <TD label={t.employees.type}>
                      <Badge variant="outline">{e.employmentType}</Badge>
                    </TD>
                    <TD label={t.employees.salary}>{formatCurrency(e.baseSalary)}</TD>
                    <TD label={t.members.phone} className="font-mono text-xs">{e.phone}</TD>
                    <TD label={t.employees.hireDate} className="text-xs text-[var(--muted)]">{formatDate(e.hireDate)}</TD>
                    {canManage && (
                      <TD label={t.common.actions}>
                        <div className="flex items-center gap-2">
                          {perms.has("employees.edit") && (
                            <Link href={`/employees/${e.id}/edit`}>
                              <Button variant="outline" size="sm">
                                {t.common.edit}
                              </Button>
                            </Link>
                          )}
                          {perms.has("employees.delete") && <DeleteButton action={deleteEmployee} id={e.id} iconOnly />}
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
