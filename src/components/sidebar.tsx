"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  QrCode,
  Banknote,
  Users,
  CreditCard,
  Dumbbell,
  Receipt,
  TrendingUp,
  Package,
  UserCog,
  DollarSign,
  ClipboardList,
  MessageCircle,
  ChartColumn,
  ChartPie,
  Gauge,
  Landmark,
  Ticket,
  Layers,
  Repeat,
  Wrench,
  Swords,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Award,
  ClipboardCheck,
  UserPlus,
  MessageSquareWarning,
  FileSpreadsheet,
} from "lucide-react";
import { navPermissionForHref, moduleKeyForHref } from "@/lib/permissions";
import { isNavItemHidden, type NavVisibility } from "@/lib/nav-visibility-types";
import { cn } from "@/lib/utils";
import { FX3Logo } from "@/components/fx3-logo";
import type { Dictionary } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/checkin", key: "checkIn", icon: QrCode },
  { href: "/cashier", key: "cashier", icon: Banknote },
  { href: "/members", key: "members", icon: Users },
  { href: "/subscriptions", key: "subscriptions", icon: CreditCard },
  { href: "/subscriptions/plans", key: "plans", icon: Layers },
  { href: "/classes/schedules", key: "schedules", icon: Repeat },
  { href: "/trainers", key: "trainers", icon: Dumbbell },
  { href: "/payments", key: "payments", icon: Receipt },
  { href: "/rentals", key: "rentals", icon: Landmark },
  { href: "/progress", key: "progress", icon: TrendingUp },
  { href: "/inventory", key: "inventory", icon: Package },
  { href: "/equipment", key: "equipment", icon: Wrench },
  { href: "/employees", key: "employees", icon: UserCog },
  { href: "/payroll", key: "payroll", icon: DollarSign },
  { href: "/tasks", key: "tasks", icon: ClipboardList },
  { href: "/notifications", key: "notifications", icon: MessageCircle },
  { href: "/reports", key: "reports", icon: ChartColumn },
  { href: "/analysis", key: "analysis", icon: ChartPie },
  { href: "/kpis", key: "kpis", icon: Gauge },
  { href: "/growth", key: "growth", icon: Award },
  { href: "/approvals", key: "approvals", icon: ClipboardCheck },
  { href: "/leads", key: "leads", icon: UserPlus },
  { href: "/feedback-admin", key: "feedback", icon: MessageSquareWarning },
  { href: "/payments/revenue-import", key: "revenueImport", icon: FileSpreadsheet },
  { href: "/vouchers", key: "vouchers", icon: Ticket },
  { href: "/disciplines", key: "disciplines", icon: Swords },
  { href: "/users", key: "users", icon: ShieldCheck },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function Sidebar({
  t,
  dir,
  role,
  perms,
  navVisibility = {},
}: {
  t: Dictionary;
  dir: "rtl" | "ltr";
  role: string;
  perms: string[];
  navVisibility?: NavVisibility;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Navigating on a phone should dismiss the drawer, otherwise it covers the
  // page you just opened.
  useEffect(() => setOpen(false), [pathname]);

  // Stop the page behind the drawer from scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const permSet = new Set(perms);
  const items = NAV_ITEMS.filter((item) => {
    const key = navPermissionForHref(item.href);
    if (key && !permSet.has(key)) return false;
    const moduleKey = moduleKeyForHref(item.href);
    if (moduleKey && isNavItemHidden(navVisibility, moduleKey, role)) return false;
    return true;
  });

  // the most specific matching entry wins, so /subscriptions/plans doesn't also light up /subscriptions
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      {/* Phone-only launcher. Sits above the sticky header so it stays reachable. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.nav.menu}
        aria-expanded={open}
        className={cn(
          "lg:hidden fixed top-2.5 z-40 w-11 h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm",
          "flex items-center justify-center text-[var(--foreground)] active:scale-95 transition-transform",
          dir === "rtl" ? "right-3" : "left-3"
        )}
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed top-0 h-screen w-64 max-w-[85vw] bg-[var(--surface)] border-[var(--border)] flex flex-col z-50",
          "transition-transform duration-200 ease-out lg:transition-none",
          dir === "rtl" ? "right-0 border-l" : "left-0 border-r",
          // off-canvas on phones until opened; always docked from lg up
          open ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="px-4 py-5 flex items-center justify-center border-b border-[var(--border)] relative">
          <FX3Logo size={44} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t.common.cancel}
            className={cn(
              "lg:hidden absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg hover:bg-[var(--surface-2)] flex items-center justify-center",
              dir === "rtl" ? "left-3" : "right-3"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] shadow-sm"
                  : "text-[var(--foreground)]/80 hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1.5 bottom-1.5 w-1 bg-[var(--brand-blue)] rounded-full",
                    dir === "rtl" ? "right-0" : "left-0"
                  )}
                />
              )}
              <Icon className={cn("w-5 h-5 shrink-0", active && "text-[var(--brand-blue)]")} />
              <span>{t.nav[item.key]}</span>
            </Link>
          );
        })}
      </nav>
        <form action="/api/signout" method="post" className="p-3 border-t border-[var(--border)]">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--foreground)]/80 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.nav.logout}</span>
          </button>
        </form>
      </aside>
    </>
  );
}
