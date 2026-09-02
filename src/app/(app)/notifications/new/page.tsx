import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { queueNotification } from "@/lib/actions/notifications";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";

export default async function NewNotificationPage() {
  const session = await requirePermission("notifications.create");
  const { t, locale } = await getT();
  const members = await db.member.findMany({ orderBy: { firstName: "asc" } });

  return (
    <>
      <Header title={t.notifications.compose} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={queueNotification}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.notifications.compose}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Member (optional)</Label>
                <Select name="memberId">
                  <option value="">—</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id} data-phone={m.phone}>
                      {m.memberCode} — {m.firstName} {m.lastName} ({m.phone})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Recipient (phone) *</Label>
                <Input name="recipient" required placeholder="01001234567" />
              </div>
              <div>
                <Label>Channel</Label>
                <Select name="channel" defaultValue="WHATSAPP">
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select name="type" defaultValue="OTHER">
                  <option value="SUBSCRIPTION_EXPIRY">Subscription Expiry</option>
                  <option value="CLASS_REMINDER">Class Reminder</option>
                  <option value="PAYMENT_DUE">Payment Due</option>
                  <option value="WELCOME">Welcome</option>
                  <option value="PROMOTIONAL">Promotional</option>
                  <option value="BIRTHDAY">Birthday</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Message *</Label>
                <Textarea name="body" rows={4} required placeholder="Type your message…" />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/notifications">
                <Button variant="outline" type="button">
                  {t.common.cancel}
                </Button>
              </Link>
              <Button type="submit">{t.notifications.send}</Button>
            </div>
          </Card>
        </form>
      </main>
    </>
  );
}
