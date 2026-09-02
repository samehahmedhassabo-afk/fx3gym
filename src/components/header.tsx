import type { ReactNode } from "react";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { NotificationBell } from "@/components/notification-bell";
import { AdminNotificationBell } from "@/components/admin-notification-bell";
import { overdueDuesForBell, queueDueReminders } from "@/lib/dues";
import { pendingApprovalsForBell } from "@/lib/approvals";
import { getSessionPermissions } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

export async function Header({
  title,
  subtitle,
  user,
  locale,
  actions,
}: {
  title: string;
  subtitle?: string;
  user: { fullName: string; role: string };
  locale: Locale;
  actions?: ReactNode;
}) {
  const perms = await getSessionPermissions();
  const canViewDues = perms.has("dues.view");
  let bellItems: Awaited<ReturnType<typeof overdueDuesForBell>>["items"] = [];
  let bellCount = 0;
  if (canViewDues) {
    queueDueReminders().catch(() => {});
    const { items, count } = await overdueDuesForBell();
    bellItems = items;
    bellCount = count;
  }

  const canReviewApprovals = perms.has("approvals.review");
  let approvalItems: Awaited<ReturnType<typeof pendingApprovalsForBell>>["items"] = [];
  let approvalCount = 0;
  if (canReviewApprovals) {
    const { items, count } = await pendingApprovalsForBell();
    approvalItems = items;
    approvalCount = count;
  }
  return (
    <header className="sticky top-0 z-20 bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)]">
      {/* ps-16 on phones clears the fixed hamburger button the sidebar renders */}
      <div className="min-h-16 py-2 px-3 sm:px-6 ps-16 lg:ps-6 flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-xl font-bold text-[var(--brand-navy)] truncate">{title}</h1>
          {subtitle && <p className="text-[11px] sm:text-xs text-[var(--muted)] truncate">{subtitle}</p>}
        </div>
        {/* wraps instead of forcing the row wider than a phone screen */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end">
          {actions}
          {canViewDues && <NotificationBell count={bellCount} items={bellItems} />}
          {canReviewApprovals && <AdminNotificationBell count={approvalCount} items={approvalItems} />}
          <ThemeSwitch locale={locale} />
          <LocaleSwitch currentLocale={locale} />
          <div className="flex items-center gap-2.5 ps-1 sm:ps-3 sm:border-s border-[var(--border)]">
            <div className="hidden md:block text-end">
              <div className="text-sm font-semibold leading-tight">{user.fullName}</div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{user.role}</div>
            </div>
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-red)] flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-[var(--surface)]"
              title={user.fullName}
            >
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
