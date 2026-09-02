import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { createExpense } from "@/lib/actions/payments";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea } from "@/components/ui/input";

export default async function NewExpensePage() {
  const session = await requirePermission("payments.create");
  const { t, locale } = await getT();

  return (
    <>
      <Header title={t.payments.expenses} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createExpense}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {t.common.add} {t.payments.expenses}
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Input name="category" required placeholder="Rent / Utilities / Equipment…" />
              </div>
              <div>
                <Label>{t.payments.amount} *</Label>
                <Input name="amount" type="number" step="0.01" required />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea name="description" rows={2} />
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
