import Link from "next/link";
import { Users, QrCode, DollarSign, AlertTriangle, Package, MessageCircle } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { materializeActiveSchedules } from "@/lib/actions/class-schedules";
import { formatCurrency, daysBetween, whatsAppLink, formatDate, fillTemplate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { YesterdayAbsentSection } from "@/components/yesterday-absent-section";

export default async function DashboardPage() {
  const session = await requireSession();
  const { t, locale } = await getT();
  await materializeActiveSchedules();
  const stats = await getDashboardStats();

  const cards = [
    { label: t.dashboard.activeMembers, value: stats.activeMembers, icon: Users, color: "text-blue-700 bg-blue-50 border border-blue-100" },
    {
      label: t.dashboard.todayCheckIns,
      value: stats.todayCheckIns,
      icon: QrCode,
      color: "text-emerald-700 bg-emerald-50 border border-emerald-100",
    },
    {
      label: t.dashboard.monthlyRevenue,
      value: formatCurrency(stats.monthlyRevenue, locale === "ar" ? "ar-EG" : "en-EG"),
      icon: DollarSign,
      color: "text-amber-700 bg-amber-50 border border-amber-100",
    },
    {
      label: t.dashboard.expiringSoon,
      value: stats.expiringSoon.length,
      icon: AlertTriangle,
      color: "text-red-700 bg-red-50 border border-red-100",
    },
  ];

  return (
    <>
      <Header title={t.dashboard.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-[var(--muted)]">{c.label}</div>
                    <div className="text-3xl font-bold mt-1">{c.value}</div>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> {t.dashboard.expiringSoon}
              </h3>
              <Link href="/subscriptions" className="text-xs text-[var(--primary)] hover:underline">
                {t.common.view}
              </Link>
            </div>
            <div className="p-2">
              {stats.expiringSoon.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted)] text-center">{t.common.noData}</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {stats.expiringSoon.map((s) => {
                    const days = daysBetween(new Date(), s.endDate);
                    const message = stats.expiryTemplate
                      ? fillTemplate(stats.expiryTemplate.body, {
                          name: s.member.firstName,
                          plan: s.plan.name,
                          days: String(days),
                          code: s.member.memberCode,
                          gym: "FX3",
                        })
                      : `أهلاً ${s.member.firstName}، اشتراكك في FX3 قرب يخلص، جدّد دلوقتي 💪`;
                    const link = whatsAppLink(s.member.phone, message);
                    return (
                      <li key={s.id} className="flex items-center justify-between p-3">
                        <div>
                          <Link href={`/members/${s.memberId}`} className="font-medium text-sm hover:text-[var(--primary)] hover:underline">
                            {s.member.firstName} {s.member.lastName}
                          </Link>
                          <div className="text-xs text-[var(--muted)]">{s.plan.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={days <= 3 ? "danger" : "warning"}>
                            {days} {t.subscriptions.daysLeft}
                          </Badge>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="تجديد عبر واتساب"
                            className="inline-flex items-center justify-center gap-1 h-7 px-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors active:scale-[0.98]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> تجديد
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <YesterdayAbsentSection
            members={stats.yesterdayAbsent.map((b) => ({
              memberId: b.member.id,
              firstName: b.member.firstName,
              lastName: b.member.lastName,
              phone: b.member.phone,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> {t.dashboard.recentPayments}
              </h3>
              <Link href="/payments" className="text-xs text-[var(--primary)] hover:underline">
                {t.common.view}
              </Link>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>{t.payments.member}</TH>
                  <TH>{t.payments.amount}</TH>
                  <TH>{t.payments.date}</TH>
                </TR>
              </THead>
              <TBody>
                {stats.recentPayments.length === 0 ? (
                  <TR>
                    <TD colSpan={3} className="text-center text-[var(--muted)]">
                      {t.common.noData}
                    </TD>
                  </TR>
                ) : (
                  stats.recentPayments.map((p) => (
                    <TR key={p.id}>
                      <TD label={t.payments.member}>{p.member ? `${p.member.firstName} ${p.member.lastName}` : "—"}</TD>
                      <TD label={t.payments.amount} className="font-medium">{formatCurrency(p.amount)}</TD>
                      <TD label={t.payments.date} className="text-[var(--muted)]">{formatDate(p.paidAt)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>

          <Card>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-red-600" /> {t.dashboard.lowStock}
              </h3>
              <Link href="/inventory" className="text-xs text-[var(--primary)] hover:underline">
                {t.common.view}
              </Link>
            </div>
            <div className="p-2">
              {stats.lowStock.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted)] text-center">{t.common.noData}</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {stats.lowStock.map((p) => (
                    <li key={p.id} className="flex items-center justify-between p-3">
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-[var(--muted)]">{p.sku}</div>
                      </div>
                      <Badge variant="danger">
                        {p.stock} {t.inventory.stock}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
