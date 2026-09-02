import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteExpense } from "@/lib/actions/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function ExpensesPage() {
  const session = await requirePermission("payments.viewAll");
  const { t, locale } = await getT();
  const perms = await getSessionPermissions();
  const canEdit = perms.has("payments.edit");
  const canDelete = perms.has("payments.delete");

  const [expensesCount, expenses] = await Promise.all([
    db.expense.count(),
    db.expense.findMany({ orderBy: { paidAt: "desc" } }),
  ]);

  return (
    <>
      <Header
        title={t.payments.expenses}
        user={session}
        locale={locale}
        actions={
          <Link href="/payments/expenses/new">
            <Button size="sm">
              <Plus className="w-4 h-4" /> {t.common.add} {t.payments.expenses}
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 space-y-4">
        <Link href="/payments" className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline">
          <ArrowRight className="w-4 h-4" /> رجوع للمدفوعات
        </Link>
        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">
              {t.payments.expenses} <span className="text-[var(--muted)] font-normal text-sm">({expensesCount})</span>
            </h2>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Category</TH>
                <TH>{t.payments.amount}</TH>
                <TH>Description</TH>
                <TH>{t.payments.date}</TH>
                <TH className="text-left">{t.common.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {expenses.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="text-center text-[var(--muted)] py-8">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                expenses.map((e) => (
                  <TR key={e.id}>
                    <TD label="Category">{e.category}</TD>
                    <TD label={t.payments.amount} className="font-medium">{formatCurrency(e.amount, locale)}</TD>
                    <TD label="Description" className="text-[var(--muted)]">{e.description}</TD>
                    <TD label={t.payments.date} className="text-xs text-[var(--muted)]">{formatDate(e.paidAt)}</TD>
                    <TD label={t.common.actions}>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <Link href={`/payments/expenses/${e.id}/edit`}>
                            <Button variant="outline" size="sm">
                              {t.common.edit}
                            </Button>
                          </Link>
                        )}
                        {canDelete && <DeleteButton action={deleteExpense} id={e.id} iconOnly />}
                      </div>
                    </TD>
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
