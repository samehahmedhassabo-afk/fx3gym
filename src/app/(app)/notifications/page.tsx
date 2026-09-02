import Link from "next/link";
import { Plus, Zap, FileText, MessageCircle, Users } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { queueExpiryReminders, updateNotificationStatus, deleteNotification } from "@/lib/actions/notifications";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

const STATUS_OPTIONS = ["QUEUED", "SENT", "FAILED", "CANCELLED"];

export default async function NotificationsPage() {
  const session = await requirePermission("notifications.view");
  const perms = await getSessionPermissions();
  const canCreate = perms.has("notifications.create");
  const canDelete = perms.has("notifications.delete");
  const { t, locale } = await getT();

  const notifications = await db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { member: true } });
  const stats = {
    queued: notifications.filter((n) => n.status === "QUEUED").length,
    sent: notifications.filter((n) => n.status === "SENT").length,
    failed: notifications.filter((n) => n.status === "FAILED").length,
  };

  return (
    <>
      <Header title={t.notifications.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="text-sm text-[var(--muted)]">{t.notifications.queued}</div>
            <div className="text-3xl font-bold text-amber-600 mt-1">{stats.queued}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-[var(--muted)]">{t.notifications.sent}</div>
            <div className="text-3xl font-bold text-emerald-600 mt-1">{stats.sent}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-[var(--muted)]">{t.notifications.failed}</div>
            <div className="text-3xl font-bold text-red-600 mt-1">{stats.failed}</div>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/notifications/templates">
            <Button variant="outline">
              <FileText className="w-4 h-4" /> القوالب
            </Button>
          </Link>
          {canCreate && (
            <Link href="/notifications/broadcast">
              <Button variant="outline">
                <Users className="w-4 h-4" /> إرسال جماعي
              </Button>
            </Link>
          )}
          {canCreate && (
            <form action={queueExpiryReminders}>
              <Button type="submit" variant="outline">
                <Zap className="w-4 h-4" /> Auto-queue expiry reminders
              </Button>
            </form>
          )}
          <Link href="/notifications/new">
            <Button>
              <Plus className="w-4 h-4" /> {t.notifications.compose}
            </Button>
          </Link>
        </div>

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <h2 className="font-semibold">{t.notifications.title}</h2>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.common.status}</TH>
                <TH>Channel</TH>
                <TH>Member</TH>
                <TH>Recipient</TH>
                <TH>Message</TH>
                <TH>Created</TH>
                {(canCreate || canDelete) && <TH>{t.common.actions}</TH>}
              </TR>
            </THead>
            <TBody>
              {notifications.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                notifications.map((n) => (
                  <TR key={n.id}>
                    <TD label={t.common.status}>
                      <Badge variant={n.status === "SENT" ? "success" : n.status === "FAILED" ? "danger" : n.status === "QUEUED" ? "warning" : "outline"}>
                        {n.status}
                      </Badge>
                    </TD>
                    <TD label="Channel">
                      <Badge variant="outline">{n.channel}</Badge>
                    </TD>
                    <TD label="Member" className="text-sm">
                      {n.member ? (
                        <Link href={`/members/${n.member.id}`} className="text-[var(--primary)] hover:underline">
                          {n.member.firstName} {n.member.lastName}
                        </Link>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </TD>
                    <TD label="Recipient" className="font-mono text-xs">{n.recipient}</TD>
                    <TD label="Message" className="max-w-md truncate">{n.body}</TD>
                    <TD label="Created" className="text-xs text-[var(--muted)]">{formatDateTime(n.createdAt)}</TD>
                    {(canCreate || canDelete) && (
                      <TD label={t.common.actions}>
                        <div className="flex items-center gap-2">
                          {canCreate && (
                            <form action={updateNotificationStatus} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={n.id} />
                              <Select name="status" defaultValue={n.status} className="h-8 text-xs w-auto">
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                              <Button type="submit" size="sm" variant="outline">
                                {t.common.save}
                              </Button>
                            </form>
                          )}
                          {canDelete && <DeleteButton action={deleteNotification.bind(null, n.id)} iconOnly />}
                        </div>
                      </TD>
                    )}
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>

        <Card className="p-5 bg-blue-50 border-blue-200">
          <p className="text-sm text-[var(--muted)]">
            <strong className="text-[var(--foreground)]">Note:</strong> Messages stay in the queue. To actually send via WhatsApp Business API, set{" "}
            <code>WHATSAPP_API_URL</code> and <code>WHATSAPP_API_TOKEN</code> in <code>.env</code> and wire a sender worker. For now, mark sent manually
            after using WhatsApp Web/Business app.
          </p>
        </Card>
      </main>
    </>
  );
}
