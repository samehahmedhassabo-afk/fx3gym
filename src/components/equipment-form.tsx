import Link from "next/link";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES, EQUIPMENT_SUGGESTIONS } from "@/lib/equipment";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";

export type EquipmentDefaults = {
  name?: string;
  nameAr?: string | null;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  purchaseDate?: string;
  lifespanMonths?: number;
  expiryDate?: string;
  conditionPct?: number | null;
  maintenanceIntervalMonths?: number;
  maintenanceCost?: number;
  lastMaintenanceAt?: string;
  location?: string | null;
  supplier?: string | null;
  notes?: string | null;
  status?: string;
};

export function EquipmentForm({
  action,
  defaults,
  title,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: EquipmentDefaults;
  title: string;
}) {
  return (
    <form action={action}>
      <Card>
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            السعر والكمية بيحسبوا رأس المال، والعمر الافتراضي بيحسب الاستهلاك والقيمة الحالية للأصل.
          </p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>اسم المعدة *</Label>
            <Input name="name" required defaultValue={defaults?.name ?? ""} list="equipment-suggestions" />
            <datalist id="equipment-suggestions">
              {EQUIPMENT_SUGGESTIONS.map((s) => (
                <option key={s.name} value={s.name} />
              ))}
            </datalist>
            <p className="text-xs text-[var(--muted)] mt-1">اكتب حرف وهتلاقي اقتراحات لمعدات الجيم الشائعة.</p>
          </div>
          <div>
            <Label>اسم إضافي / موديل</Label>
            <Input name="nameAr" defaultValue={defaults?.nameAr ?? ""} />
          </div>
          <div>
            <Label>التصنيف</Label>
            <Select name="category" defaultValue={defaults?.category ?? "OTHER"}>
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.labelAr}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>الحالة</Label>
            <Select name="status" defaultValue={defaults?.status ?? "IN_USE"}>
              {EQUIPMENT_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.labelAr}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>الكمية *</Label>
            <Input name="quantity" type="number" min="0" required defaultValue={defaults?.quantity ?? 1} />
          </div>
          <div>
            <Label>سعر القطعة (جنيه) *</Label>
            <Input name="unitPrice" type="number" min="0" step="0.01" required defaultValue={defaults?.unitPrice ?? ""} />
          </div>
          <div>
            <Label>تاريخ الشراء</Label>
            <Input name="purchaseDate" type="date" defaultValue={defaults?.purchaseDate ?? ""} />
          </div>
          <div>
            <Label>العمر الافتراضي (بالشهور)</Label>
            <Input name="lifespanMonths" type="number" min="1" defaultValue={defaults?.lifespanMonths ?? 60} />
            <p className="text-xs text-[var(--muted)] mt-1">مثلاً: أرضية مطاطية 84 شهر، حبل نط 12 شهر.</p>
          </div>
          <div>
            <Label>تاريخ انتهاء الاستخدام (اختياري)</Label>
            <Input name="expiryDate" type="date" defaultValue={defaults?.expiryDate ?? ""} />
            <p className="text-xs text-[var(--muted)] mt-1">سيبه فاضي علشان يتحسب تلقائياً من تاريخ الشراء + العمر الافتراضي.</p>
          </div>
          <div>
            <Label>نسبة الحالة الحالية % (اختياري)</Label>
            <Input
              name="conditionPct"
              type="number"
              min="0"
              max="100"
              placeholder="تلقائي من الاستهلاك"
              defaultValue={defaults?.conditionPct ?? ""}
            />
            <p className="text-xs text-[var(--muted)] mt-1">لو قيّمت المعدة بنفسك، اكتب النسبة هنا وهتتحسب بيها القيمة.</p>
          </div>
          <div>
            <Label>دورية الصيانة (كل كام شهر)</Label>
            <Input
              name="maintenanceIntervalMonths"
              type="number"
              min="1"
              defaultValue={defaults?.maintenanceIntervalMonths ?? 6}
            />
          </div>
          <div>
            <Label>تكلفة الصيانة التقديرية للمرة</Label>
            <Input name="maintenanceCost" type="number" min="0" step="0.01" defaultValue={defaults?.maintenanceCost ?? 0} />
          </div>
          <div>
            <Label>آخر صيانة</Label>
            <Input name="lastMaintenanceAt" type="date" defaultValue={defaults?.lastMaintenanceAt ?? ""} />
          </div>
          <div>
            <Label>المكان داخل الجيم</Label>
            <Input name="location" placeholder="صالة الأوزان / الرينج / الاستقبال" defaultValue={defaults?.location ?? ""} />
          </div>
          <div>
            <Label>المورّد</Label>
            <Input name="supplier" defaultValue={defaults?.supplier ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea name="notes" rows={2} defaultValue={defaults?.notes ?? ""} />
          </div>
        </div>
        <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
          <Link href="/equipment">
            <Button variant="outline" type="button">
              إلغاء
            </Button>
          </Link>
          <Button type="submit">حفظ</Button>
        </div>
      </Card>
    </form>
  );
}
