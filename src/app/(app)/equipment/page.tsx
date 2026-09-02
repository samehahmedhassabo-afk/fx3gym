import Link from "next/link";
import { Plus, Search, Edit, Wrench, CalendarClock, Boxes, Coins, TrendingDown, AlertTriangle } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteEquipment } from "@/lib/actions/equipment";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES, categoryLabel, equipmentMetrics, statusLabel } from "@/lib/equipment";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Label, Input, Select } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "danger";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--muted)]">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${tone === "danger" ? "text-[var(--danger)]" : ""}`}>{value}</p>
          {hint && <p className="text-[11px] text-[var(--muted)] mt-1">{hint}</p>}
        </div>
        <Icon className="w-5 h-5 text-[var(--muted)] shrink-0" />
      </div>
    </Card>
  );
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>;
}) {
  const session = await requirePermission("equipment.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const filters: object[] = [];
  if (q) filters.push({ OR: [{ name: { contains: q } }, { nameAr: { contains: q } }, { location: { contains: q } }] });
  if (category) filters.push({ category });
  if (status) filters.push({ status });

  const items = await db.equipment.findMany({
    where: filters.length ? { AND: filters } : {},
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const now = new Date();
  const rows = items.map((item) => ({ item, m: equipmentMetrics(item, now) }));
  const totals = rows.reduce(
    (acc, { item, m }) => ({
      pieces: acc.pieces + item.quantity,
      cost: acc.cost + m.totalCost,
      value: acc.value + m.currentValue,
      depreciation: acc.depreciation + m.depreciation,
      dueMaintenance: acc.dueMaintenance + (m.isMaintenanceDue ? 1 : 0),
      expired: acc.expired + (m.isExpired && !m.isRetired ? 1 : 0),
    }),
    { pieces: 0, cost: 0, value: 0, depreciation: 0, dueMaintenance: 0, expired: 0 }
  );
  const hasFilters = Boolean(q || category || status);

  return (
    <>
      <Header
        title="المعدات والأصول"
        subtitle="جرد معدات الجيم وقيمتها واستهلاكها"
        user={session}
        locale={locale}
        actions={
          <Link href="/equipment/plan">
            <Button variant="outline" size="sm">
              <CalendarClock className="w-3.5 h-3.5" /> خطة الصيانة والاستبدال
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            icon={Boxes}
            label="عدد القطع"
            value={String(totals.pieces)}
            hint={`${items.length} صنف`}
          />
          <StatTile icon={Coins} label="رأس المال (تكلفة الشراء)" value={formatCurrency(totals.cost)} />
          <StatTile
            icon={Wrench}
            label="القيمة الحالية للأصول"
            value={formatCurrency(totals.value)}
            hint={totals.cost > 0 ? `${Math.round((totals.value / totals.cost) * 100)}% من التكلفة` : undefined}
          />
          <StatTile
            icon={TrendingDown}
            label="الإهلاك التراكمي"
            value={formatCurrency(totals.depreciation)}
            hint={`${totals.dueMaintenance} صيانة مستحقة · ${totals.expired} انتهى عمرها`}
            tone={totals.expired > 0 ? "danger" : "default"}
          />
        </div>

        <Card className="p-4 space-y-3">
          <form className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1">
              <Label>{t.common.search}</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3 start-3 text-[var(--muted)]" />
                <Input name="q" placeholder="اسم المعدة أو المكان" defaultValue={q} className="ps-9" />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <Label>التصنيف</Label>
              <Select name="category" defaultValue={category}>
                <option value="">كل التصنيفات</option>
                {EQUIPMENT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.labelAr}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full lg:w-44">
              <Label>الحالة</Label>
              <Select name="status" defaultValue={status}>
                <option value="">الكل</option>
                {EQUIPMENT_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.labelAr}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                {t.common.search}
              </Button>
              {hasFilters && (
                <Link href="/equipment">
                  <Button type="button" variant="outline">
                    مسح
                  </Button>
                </Link>
              )}
            </div>
          </form>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="text-xs text-[var(--muted)]">{items.length} صنف</span>
            {perms.has("equipment.create") && (
              <Link href="/equipment/new">
                <Button>
                  <Plus className="w-4 h-4" /> إضافة معدة
                </Button>
              </Link>
            )}
          </div>
        </Card>

        <Card>
          <Table>
            <THead>
              <TR>
                <TH>المعدة</TH>
                <TH>التصنيف</TH>
                <TH>الكمية</TH>
                <TH>سعر القطعة</TH>
                <TH>إجمالي التكلفة</TH>
                <TH>الاستهلاك</TH>
                <TH>القيمة الحالية</TH>
                <TH>نهاية العمر</TH>
                <TH>الصيانة القادمة</TH>
                <TH>{t.common.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TR>
                  <TD colSpan={10} className="text-center text-[var(--muted)] py-10">
                    لسه مفيش معدات مسجلة. ابدأ بـ«إضافة معدة».
                  </TD>
                </TR>
              ) : (
                rows.map(({ item, m }) => (
                  <TR key={item.id}>
                    <TD label="المعدة">
                      <Link href={`/equipment/${item.id}`} className="font-medium hover:text-[var(--primary)]">
                        {item.nameAr || item.name}
                      </Link>
                      {item.location && <div className="text-[11px] text-[var(--muted)]">{item.location}</div>}
                    </TD>
                    <TD label="التصنيف" className="text-xs">{categoryLabel(item.category, locale)}</TD>
                    <TD label="الكمية" className="font-mono">{item.quantity}</TD>
                    <TD label="سعر القطعة" className="text-xs">{formatCurrency(item.unitPrice)}</TD>
                    <TD label="إجمالي التكلفة" className="font-medium">{formatCurrency(m.totalCost)}</TD>
                    <TD label="الاستهلاك">
                      <div className="flex items-center gap-2 min-w-28">
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(m.usagePct)}%`,
                              background: m.usagePct >= 85 ? "var(--danger)" : m.usagePct >= 60 ? "var(--warning)" : "var(--success)",
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-[var(--muted)]">{Math.round(m.usagePct)}%</span>
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">متبقي {Math.round(m.remainingPct)}%</div>
                    </TD>
                    <TD label="القيمة الحالية">{formatCurrency(m.currentValue)}</TD>
                    <TD label="نهاية العمر" className="text-xs">
                      {formatDate(m.expiry)}
                      <div>
                        {m.isRetired ? (
                          <Badge variant="outline">{statusLabel(item.status)}</Badge>
                        ) : m.isExpired ? (
                          <Badge variant="danger">انتهى العمر</Badge>
                        ) : m.monthsLeft <= 3 ? (
                          <Badge variant="warning">{m.monthsLeft} شهر متبقي</Badge>
                        ) : (
                          <Badge variant="success">{m.monthsLeft} شهر متبقي</Badge>
                        )}
                      </div>
                    </TD>
                    <TD label="الصيانة القادمة" className="text-xs">
                      {formatDate(m.nextMaintenanceAt)}
                      {m.isMaintenanceDue && (
                        <div className="flex items-center gap-1 text-[var(--danger)] text-[11px] mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> مستحقة
                        </div>
                      )}
                    </TD>
                    <TD label={t.common.actions}>
                      <div className="flex items-center gap-1">
                        <Link href={`/equipment/${item.id}`}>
                          <Button variant="ghost" size="sm">
                            {t.common.view}
                          </Button>
                        </Link>
                        {perms.has("equipment.edit") && (
                          <Link href={`/equipment/${item.id}/edit`}>
                            <Button variant="ghost" size="sm" title={t.common.edit}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                        {perms.has("equipment.delete") && <DeleteButton action={deleteEquipment} id={item.id} iconOnly />}
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
