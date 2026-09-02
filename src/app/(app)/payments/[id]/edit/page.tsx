import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updatePayment } from "@/lib/actions/payments";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select, Input, Textarea } from "@/components/ui/input";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("payments.edit");
  const { t, locale } = await getT();
  const { id } = await params;

  const [payment, members] = await Promise.all([
    db.payment.findUnique({ where: { id } }),
    db.member.findMany({ orderBy: { firstName: "asc" } }),
  ]);
  if (!payment) notFound();

  const action = updatePayment.bind(null, id);
  const pad = (n: number) => String(n).padStart(2, "0");
  const paidAt = payment.paidAt;
  const paidAtValue = `${paidAt.getFullYear()}-${pad(paidAt.getMonth() + 1)}-${pad(paidAt.getDate())}T${pad(paidAt.getHours())}:${pad(paidAt.getMinutes())}`;

  return (
    <>
      <Header title={t.payments.addPayment} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {t.common.edit} — {payment.invoiceNumber}
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>{t.payments.member}</Label>
                <Select name="memberId" defaultValue={payment.memberId ?? ""} disabled>
                  <option value="">—</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.memberCode} — {m.firstName} {m.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t.payments.amount} *</Label>
                <Input name="amount" type="number" step="0.01" required defaultValue={payment.amount} />
              </div>
              <div>
                <Label>{t.payments.method}</Label>
                <Select name="method" defaultValue={payment.method}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="INSTAPAY">InstaPay</option>
                  <option value="VODAFONE_CASH">Vodafone Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <Label>{t.payments.type}</Label>
                <Select name="type" defaultValue={payment.type}>
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="PERSONAL_TRAINING">Personal Training</option>
                  <option value="PRODUCT_SALE">Product Sale</option>
                  <option value="REGISTRATION_FEE">Registration Fee</option>
                  <option value="AREA_RENTAL">Area Rental</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <Label>{t.payments.date}</Label>
                <Input name="paidAt" type="datetime-local" defaultValue={paidAtValue} />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} defaultValue={payment.notes ?? ""} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/payments">
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
