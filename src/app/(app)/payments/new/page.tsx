import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getOpenSession } from "@/lib/actions/cashier";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createPayment } from "@/lib/actions/payments";
import { CashierRequired } from "@/components/cashier-required";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select, Input, Textarea } from "@/components/ui/input";
import { MemberPicker } from "@/components/member-picker";

export default async function NewPaymentPage() {
  const session = await requirePermission("payments.create");
  const { t, locale } = await getT();

  if (!(await getOpenSession(session.userId)) && session.role !== "ADMIN") {
    return <CashierRequired user={session} locale={locale} />;
  }

  const [members, trainers] = await Promise.all([
    db.member.findMany({ orderBy: { firstName: "asc" } }),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
  ]);

  return (
    <>
      <Header title={t.payments.addPayment} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createPayment}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.payments.addPayment}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>{t.payments.member}</Label>
                <MemberPicker
                  name="memberId"
                  members={members.map((m) => ({
                    id: m.id,
                    label: `${m.firstName} ${m.lastName}`,
                    sublabel: `${m.memberCode} — ${m.phone}`,
                  }))}
                  placeholder={t.common.search}
                />
              </div>
              <div>
                <Label>{t.payments.amount} *</Label>
                <Input name="amount" type="number" step="0.01" required />
              </div>
              <div>
                <Label>{t.payments.method}</Label>
                <Select name="method" defaultValue="CASH">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="INSTAPAY">InstaPay</option>
                  <option value="VODAFONE_CASH">Vodafone Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </Select>
              </div>
              <div>
                <Label>{t.payments.type}</Label>
                <Select name="type" defaultValue="SUBSCRIPTION">
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="PERSONAL_TRAINING">Personal Training</option>
                  <option value="PRODUCT_SALE">Product Sale</option>
                  <option value="REGISTRATION_FEE">Registration Fee</option>
                  <option value="AREA_RENTAL">Area Rental</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>
                  {t.classes.trainer} ({locale === "ar" ? "للعمولة" : "for commission"})
                </Label>
                <Select name="trainerId">
                  <option value="">— {locale === "ar" ? "بدون كابتن" : "No trainer"} —</option>
                  {trainers.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.user.fullName} {tr.commissionPct ? `(${tr.commissionPct}%)` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
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
