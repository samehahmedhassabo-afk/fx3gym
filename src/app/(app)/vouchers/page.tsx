import Link from "next/link";
import { Pencil } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { listVouchers, createVoucher, toggleVoucher, deleteVoucher } from "@/lib/actions/vouchers";
import { formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Select } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";

export default async function VouchersPage() {
  const session = await requirePermission("vouchers.view");
  const { t, locale } = await getT();
  const perms = await getSessionPermissions();
  const canEdit = perms.has("vouchers.edit");
  const canDelete = perms.has("vouchers.delete");
  const canCreate = perms.has("vouchers.create");

  const vouchers = await listVouchers();

  return (
    <>
      <Header title="أكواد الخصم" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6 max-w-5xl">
        {canCreate && (
          <form action={createVoucher}>
            <Card>
              <div className="p-5 border-b border-[var(--border)]">
                <h2 className="font-semibold">إضافة كود خصم جديد</h2>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>الكود *</Label>
                  <Input name="code" required placeholder="SUMMER20" className="uppercase" />
                </div>
                <div>
                  <Label>النوع *</Label>
                  <Select name="type" defaultValue="PERCENT">
                    <option value="PERCENT">نسبة %</option>
                    <option value="FIXED">مبلغ ثابت</option>
                  </Select>
                </div>
                <div>
                  <Label>القيمة *</Label>
                  <Input name="value" type="number" step="any" min="0" required placeholder="20" />
                </div>
                <div>
                  <Label>الحد الأقصى للاستخدام</Label>
                  <Input name="maxUses" type="number" min="1" placeholder="بدون حد" />
                </div>
                <div>
                  <Label>صالح من</Label>
                  <Input name="validFrom" type="date" />
                </div>
                <div>
                  <Label>صالح حتى</Label>
                  <Input name="validUntil" type="date" />
                </div>
                <div className="md:col-span-2">
                  <Label>الوصف</Label>
                  <Input name="description" placeholder="خصم الصيف" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    {t.common.add}
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        )}

        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">كل الأكواد ({vouchers.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {vouchers.map((v) => (
              <div key={v.id} className="p-4 flex flex-wrap items-center gap-3">
                <span className="font-mono font-semibold tracking-wide">{v.code}</span>
                <Badge variant="info">{v.type === "PERCENT" ? `${v.value}%` : `${v.value} ج`}</Badge>
                <span className="text-sm text-[var(--muted)]">
                  {v.usedCount}/{v.maxUses ?? "∞"}
                </span>
                {(v.validFrom || v.validUntil) && (
                  <span className="text-xs text-[var(--muted)]">
                    {v.validFrom ? formatDate(v.validFrom) : "—"} → {v.validUntil ? formatDate(v.validUntil) : "—"}
                  </span>
                )}
                {v.description && <span className="text-sm text-[var(--muted)]">{v.description}</span>}
                {v.isActive ? <Badge variant="success">مفعّل</Badge> : <Badge variant="outline">غير مفعّل</Badge>}
                <div className="ms-auto flex items-center gap-2">
                  {canEdit && (
                    <>
                      <Link href={`/vouchers/${v.id}/edit`}>
                        <Button variant="outline" size="sm" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <form action={toggleVoucher}>
                        <input type="hidden" name="id" value={v.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          {v.isActive ? "إخفاء" : "تفعيل"}
                        </Button>
                      </form>
                    </>
                  )}
                  {canDelete && <DeleteButton action={deleteVoucher} id={v.id} iconOnly />}
                </div>
              </div>
            ))}
            {vouchers.length === 0 && <div className="p-8 text-center text-[var(--muted)]">لا توجد أكواد خصم بعد.</div>}
          </div>
        </Card>
      </main>
    </>
  );
}
