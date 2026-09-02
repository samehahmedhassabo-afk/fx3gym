import Link from "next/link";
import { ArrowRight, Printer, Wrench, RefreshCcw } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildMaintenancePlan, equipmentMetrics } from "@/lib/equipment";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default async function EquipmentPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; horizon?: string }>;
}) {
  const session = await requirePermission("equipment.view");
  const { locale } = await getT();

  const params = await searchParams;
  const periodMonths: 6 | 12 = params.period === "12" ? 12 : 6;
  const horizonMonths = params.horizon === "24" ? 24 : params.horizon === "36" ? 36 : 12;

  const items = await db.equipment.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const periods = buildMaintenancePlan(items, { periodMonths, horizonMonths });

  const now = new Date();
  const overdue = items
    .map((item) => ({ item, m: equipmentMetrics(item, now) }))
    .filter(({ m }) => !m.isRetired && (m.isMaintenanceDue || m.isExpired));

  const grandTotal = periods.reduce((sum, p) => sum + p.totalCost, 0);
  const grandMaintenance = periods.reduce((sum, p) => sum + p.maintenanceCost, 0);
  const grandReplacement = periods.reduce((sum, p) => sum + p.replacementCost, 0);

  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "h-8 px-3 text-xs font-medium inline-flex items-center transition-colors",
        active ? "bg-[var(--brand-blue)] text-white" : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <Header
        title="خطة الصيانة والاستبدال"
        subtitle={`${periodMonths === 6 ? "خطة نصف سنوية" : "خطة سنوية"} على مدى ${horizonMonths} شهر`}
        user={session}
        locale={locale}
        actions={
          <Link href="/equipment">
            <Button variant="outline" size="sm">
              <ArrowRight className="w-3.5 h-3.5" /> المعدات
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-xs text-[var(--muted)] block mb-1">نوع الخطة</span>
              <div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
                {tab("نصف سنوية", `/equipment/plan?period=6&horizon=${horizonMonths}`, periodMonths === 6)}
                {tab("سنوية", `/equipment/plan?period=12&horizon=${horizonMonths}`, periodMonths === 12)}
              </div>
            </div>
            <div>
              <span className="text-xs text-[var(--muted)] block mb-1">المدة</span>
              <div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
                {tab("سنة", `/equipment/plan?period=${periodMonths}&horizon=12`, horizonMonths === 12)}
                {tab("سنتين", `/equipment/plan?period=${periodMonths}&horizon=24`, horizonMonths === 24)}
                {tab("3 سنوات", `/equipment/plan?period=${periodMonths}&horizon=36`, horizonMonths === 36)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-end">
              <span className="text-xs text-[var(--muted)] block">إجمالي الميزانية المتوقعة</span>
              <span className="text-xl font-bold">{formatCurrency(grandTotal)}</span>
              <span className="text-[11px] text-[var(--muted)] block">
                صيانة {formatCurrency(grandMaintenance)} · استبدال {formatCurrency(grandReplacement)}
              </span>
            </div>
            <Link href={`/print/equipment-plan?period=${periodMonths}&horizon=${horizonMonths}`} target="_blank">
              <Button variant="outline" size="sm">
                <Printer className="w-3.5 h-3.5" /> طباعة
              </Button>
            </Link>
          </div>
        </Card>

        {overdue.length > 0 && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--danger)]">متأخر — محتاج تدخّل دلوقتي</h2>
              <p className="text-xs text-[var(--muted)] mt-1">دي معدات فات ميعاد صيانتها أو خلص عمرها الافتراضي.</p>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>المعدة</TH>
                  <TH>الكمية</TH>
                  <TH>السبب</TH>
                  <TH>التاريخ</TH>
                  <TH>التكلفة التقديرية</TH>
                </TR>
              </THead>
              <TBody>
                {overdue.map(({ item, m }) => (
                  <TR key={item.id}>
                    <TD label="المعدة">
                      <Link href={`/equipment/${item.id}`} className="font-medium hover:text-[var(--primary)]">
                        {item.nameAr || item.name}
                      </Link>
                    </TD>
                    <TD label="الكمية" className="font-mono">{item.quantity}</TD>
                    <TD label="السبب">
                      {m.isExpired ? <Badge variant="danger">انتهى العمر — استبدال</Badge> : <Badge variant="warning">صيانة متأخرة</Badge>}
                    </TD>
                    <TD label="التاريخ" className="text-xs">{formatDate(m.isExpired ? m.expiry : m.nextMaintenanceAt)}</TD>
                    <TD label="التكلفة التقديرية">{formatCurrency(m.isExpired ? m.totalCost : item.maintenanceCost)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        )}

        {items.length === 0 && (
          <Card className="p-8 text-center text-[var(--muted)]">
            سجّل معداتك الأول من صفحة «المعدات والأصول» علشان نقدر نطلع لك خطة الصيانة.
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {periods.map((p) => (
            <Card key={p.label}>
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold">{p.label}</h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {p.maintenance.length} صيانة · {p.replacement.length} استبدال
                  </p>
                </div>
                <div className="text-end">
                  <span className="text-lg font-bold">{formatCurrency(p.totalCost)}</span>
                  <span className="text-[11px] text-[var(--muted)] block">
                    صيانة {formatCurrency(p.maintenanceCost)} · استبدال {formatCurrency(p.replacementCost)}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> الصيانة
                  </h3>
                  {p.maintenance.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">لا يوجد.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {p.maintenance.map((entry, i) => (
                        <li key={`${entry.id}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                          <Link href={`/equipment/${entry.id}`} className="hover:text-[var(--primary)] truncate">
                            {entry.name} <span className="text-[11px] text-[var(--muted)]">×{entry.quantity}</span>
                          </Link>
                          <span className="text-xs text-[var(--muted)] shrink-0">
                            {formatDate(entry.dueAt)} · {formatCurrency(entry.cost)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border-t border-[var(--border)] pt-4">
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <RefreshCcw className="w-3.5 h-3.5" /> الاستبدال
                  </h3>
                  {p.replacement.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">لا يوجد.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {p.replacement.map((entry, i) => (
                        <li key={`${entry.id}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                          <Link href={`/equipment/${entry.id}`} className="hover:text-[var(--primary)] truncate">
                            {entry.name} <span className="text-[11px] text-[var(--muted)]">×{entry.quantity}</span>
                          </Link>
                          <span className="text-xs text-[var(--muted)] shrink-0">
                            {formatDate(entry.dueAt)} · {formatCurrency(entry.cost)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
