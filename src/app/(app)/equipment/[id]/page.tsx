import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Edit } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { logMaintenance, deleteMaintenanceLog } from "@/lib/actions/equipment";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MAINTENANCE_TYPES, categoryLabel, equipmentMetrics, maintenanceTypeLabel, statusLabel } from "@/lib/equipment";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="text-sm font-medium text-end">{value}</span>
    </div>
  );
}

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("equipment.view");
  const perms = await getSessionPermissions();
  const { locale } = await getT();
  const { id } = await params;

  const item = await db.equipment.findUnique({
    where: { id },
    include: { maintenanceLogs: { orderBy: { performedAt: "desc" } } },
  });
  if (!item) notFound();

  const m = equipmentMetrics(item);
  const spent = item.maintenanceLogs.reduce((sum, log) => sum + log.cost, 0);
  const today = new Date().toISOString().slice(0, 10);
  const canEdit = perms.has("equipment.edit");

  return (
    <>
      <Header
        title={item.nameAr || item.name}
        subtitle={`${categoryLabel(item.category, locale)} · ${statusLabel(item.status)}`}
        user={session}
        locale={locale}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/equipment">
              <Button variant="outline" size="sm">
                <ArrowRight className="w-3.5 h-3.5" /> كل المعدات
              </Button>
            </Link>
            {canEdit && (
              <Link href={`/equipment/${item.id}/edit`}>
                <Button size="sm">
                  <Edit className="w-3.5 h-3.5" /> تعديل
                </Button>
              </Link>
            )}
          </div>
        }
      />
      <main className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-semibold mb-3">بيانات الأصل</h2>
          <Row label="الكمية" value={item.quantity} />
          <Row label="سعر القطعة" value={formatCurrency(item.unitPrice)} />
          <Row label="إجمالي التكلفة (رأس المال)" value={formatCurrency(m.totalCost)} />
          <Row label="القيمة الحالية" value={formatCurrency(m.currentValue)} />
          <Row label="الإهلاك" value={formatCurrency(m.depreciation)} />
          <Row label="تاريخ الشراء" value={formatDate(item.purchaseDate)} />
          <Row label="العمر الافتراضي" value={`${item.lifespanMonths} شهر`} />
          <Row label="مدة الاستخدام حتى الآن" value={`${m.monthsUsed} شهر`} />
          <Row
            label="نسبة الاستهلاك"
            value={
              <Badge variant={m.usagePct >= 85 ? "danger" : m.usagePct >= 60 ? "warning" : "success"}>
                {Math.round(m.usagePct)}%
              </Badge>
            }
          />
          <Row label="النسبة المتبقية" value={`${Math.round(m.remainingPct)}%`} />
          <Row
            label="نهاية العمر الافتراضي"
            value={
              <>
                {formatDate(m.expiry)}{" "}
                {m.isExpired && !m.isRetired && <Badge variant="danger">منتهي</Badge>}
              </>
            }
          />
          <Row
            label="الصيانة القادمة"
            value={
              <>
                {formatDate(m.nextMaintenanceAt)} {m.isMaintenanceDue && <Badge variant="danger">مستحقة</Badge>}
              </>
            }
          />
          <Row label="دورية الصيانة" value={`كل ${item.maintenanceIntervalMonths} شهر`} />
          <Row label="تكلفة الصيانة التقديرية" value={formatCurrency(item.maintenanceCost)} />
          <Row label="إجمالي المصروف على الصيانة" value={formatCurrency(spent)} />
          {item.location && <Row label="المكان" value={item.location} />}
          {item.supplier && <Row label="المورّد" value={item.supplier} />}
          {item.notes && <Row label="ملاحظات" value={item.notes} />}
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {canEdit && (
            <Card>
              <div className="p-5 border-b border-[var(--border)]">
                <h2 className="font-semibold">تسجيل صيانة أو استبدال</h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  الصيانة بتحدّث ميعاد الصيانة الجاية. الاستبدال بيبدأ عمر افتراضي جديد من تاريخ الاستبدال.
                </p>
              </div>
              <form action={logMaintenance}>
                <input type="hidden" name="equipmentId" value={item.id} />
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>النوع</Label>
                    <Select name="type" defaultValue="MAINTENANCE">
                      {MAINTENANCE_TYPES.map((mt) => (
                        <option key={mt.key} value={mt.key}>
                          {mt.labelAr}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>التاريخ</Label>
                    <Input name="performedAt" type="date" defaultValue={today} />
                  </div>
                  <div>
                    <Label>التكلفة</Label>
                    <Input name="cost" type="number" min="0" step="0.01" defaultValue={item.maintenanceCost} />
                  </div>
                  <div>
                    <Label>عدد القطع</Label>
                    <Input name="quantity" type="number" min="0" defaultValue={0} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>ملاحظات</Label>
                    <Textarea name="notes" rows={2} />
                  </div>
                </div>
                <div className="p-5 border-t border-[var(--border)] flex justify-end">
                  <Button type="submit">تسجيل</Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">سجل الصيانة والاستبدال</h2>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>التاريخ</TH>
                  <TH>النوع</TH>
                  <TH>عدد القطع</TH>
                  <TH>التكلفة</TH>
                  <TH>ملاحظات</TH>
                  {canEdit && <TH>إجراءات</TH>}
                </TR>
              </THead>
              <TBody>
                {item.maintenanceLogs.length === 0 ? (
                  <TR>
                    <TD colSpan={canEdit ? 6 : 5} className="text-center text-[var(--muted)] py-8">
                      لا يوجد سجل صيانة بعد.
                    </TD>
                  </TR>
                ) : (
                  item.maintenanceLogs.map((log) => (
                    <TR key={log.id}>
                      <TD label="التاريخ" className="text-xs">{formatDate(log.performedAt)}</TD>
                      <TD label="النوع">
                        <Badge variant={log.type === "REPLACEMENT" ? "warning" : "info"}>{maintenanceTypeLabel(log.type)}</Badge>
                      </TD>
                      <TD label="عدد القطع" className="font-mono text-xs">{log.quantity || "—"}</TD>
                      <TD label="التكلفة">{formatCurrency(log.cost)}</TD>
                      <TD label="ملاحظات" className="text-xs text-[var(--muted)]">{log.notes ?? "—"}</TD>
                      {canEdit && (
                        <TD label="إجراءات">
                          <DeleteButton action={deleteMaintenanceLog} id={log.id} iconOnly />
                        </TD>
                      )}
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </div>
      </main>
    </>
  );
}
