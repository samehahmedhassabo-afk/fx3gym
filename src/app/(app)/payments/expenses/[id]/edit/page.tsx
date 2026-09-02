import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateExpense } from "@/lib/actions/payments";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea } from "@/components/ui/input";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("payments.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) notFound();

  const action = updateExpense.bind(null, id);
  const pad = (n: number) => String(n).padStart(2, "0");
  const paidAt = expense.paidAt;
  const paidAtValue = `${paidAt.getFullYear()}-${pad(paidAt.getMonth() + 1)}-${pad(paidAt.getDate())}T${pad(paidAt.getHours())}:${pad(paidAt.getMinutes())}`;

  return (
    <>
      <Header title={t.payments.expenses} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {t.common.edit} {t.payments.expenses}
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Input name="category" required defaultValue={expense.category} placeholder="Rent / Utilities / Equipment…" />
              </div>
              <div>
                <Label>{t.payments.amount} *</Label>
                <Input name="amount" type="number" step="0.01" required defaultValue={expense.amount} />
              </div>
              <div>
                <Label>{t.payments.date}</Label>
                <Input name="paidAt" type="datetime-local" defaultValue={paidAtValue} />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea name="description" rows={2} defaultValue={expense.description ?? ""} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/payments/expenses">
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
