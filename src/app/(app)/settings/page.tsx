import Link from "next/link";
import { ShieldCheck, Database, Download, LayoutGrid, Wrench } from "lucide-react";
import { runAttendanceRecompute, runMemberCodeMigration } from "@/lib/actions/data-maintenance";
import { requireSession, assertPermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PERMISSION_MODULES } from "@/lib/permissions";
import { getNavVisibility } from "@/lib/nav-visibility";
import { updateNavVisibility } from "@/lib/actions/nav-visibility";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input } from "@/components/ui/input";
import { RestoreForm } from "@/components/restore-form";
import { SystemTimeCard } from "@/components/system-time-card";

async function updateSetting(formData: FormData) {
  "use server";
  await assertPermission("settings.view");
  const key = String(formData.get("key"));
  const value = String(formData.get("value") ?? "");
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  revalidatePath("/settings");
}

const RESTORE_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "تمت الاستعادة بنجاح ✓" },
  nofile: { ok: false, text: "لم يتم اختيار ملف." },
  badjson: { ok: false, text: "الملف مش JSON صالح." },
  invalid: { ok: false, text: "الملف مش نسخة احتياطية صحيحة لـ FX3." },
  error: { ok: false, text: "فشل الاستعادة — لم يتم تغيير البيانات." },
};

const GYM_FIELDS = [
  { key: "gym.name", label: "Gym Name" },
  { key: "gym.phone", label: "Gym Phone" },
  { key: "gym.address", label: "Address" },
  { key: "gym.registration_fee", label: "Registration Fee (EGP)" },
  { key: "gym.currency", label: "Currency" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ restore?: string; rows?: string; detail?: string; maint?: string; total?: string; updated?: string }>;
}) {
  const session = await requireSession();
  const { t, locale } = await getT();
  const params = await searchParams;
  const restoreMessage = params.restore ? RESTORE_MESSAGES[params.restore] : null;
  const settings = await db.setting.findMany({ orderBy: { key: "asc" } });
  const navVisibility = session.role === "ADMIN" ? await getNavVisibility() : {};

  return (
    <>
      <Header title={t.settings.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">{t.settings.gym}</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {GYM_FIELDS.map((field) => (
              <form key={field.key} action={updateSetting} className="flex flex-col">
                <Label>{field.label}</Label>
                <input type="hidden" name="key" value={field.key} />
                <div className="flex gap-2">
                  <Input name="value" defaultValue={settings.find((s) => s.key === field.key)?.value ?? ""} />
                  <Button type="submit" size="sm" variant="secondary">
                    {t.common.save}
                  </Button>
                </div>
              </form>
            ))}
          </div>
        </Card>

        {session.role === "ADMIN" && <SystemTimeCard />}

        {session.role === "ADMIN" && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" /> إظهار/إخفاء صفحات القائمة الجانبية
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">تحكم في الصفحات الظاهرة في القائمة الجانبية — للمدير أو لباقي المستخدمين. الإخفاء لا يلغي الصلاحية، بس بيشيل الصفحة من القائمة.</p>
            </div>
            <form action={updateNavVisibility} className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PERMISSION_MODULES.map((m) => (
                  <div key={m.key} className="border border-[var(--border)] rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">{m.labelAr}</div>
                    <label className="flex items-center gap-2 text-xs mb-1">
                      <input type="checkbox" name={`hideAdmin_${m.key}`} defaultChecked={navVisibility[m.key]?.hideFromAdmin} className="w-3.5 h-3.5" />
                      إخفاء عن المدير
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name={`hideOthers_${m.key}`} defaultChecked={navVisibility[m.key]?.hideFromOthers} className="w-3.5 h-3.5" />
                      إخفاء عن باقي المستخدمين
                    </label>
                  </div>
                ))}
              </div>
              <Button type="submit" size="sm" className="mt-4">
                {t.common.save}
              </Button>
            </form>
          </Card>
        )}

        {session.role === "ADMIN" && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {t.settings.users}
              </h2>
            </div>
            <div className="p-5 flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted)]">{t.users.title}</p>
              <Link href="/users">
                <Button variant="outline">{t.settings.manageUsers}</Button>
              </Link>
            </div>
          </Card>
        )}

        {session.role === "ADMIN" && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold flex items-center gap-2">
                <Database className="w-4 h-4" /> النسخ الاحتياطي والاستعادة
              </h2>
            </div>
            <div className="p-5 space-y-5">
              {restoreMessage && (
                <div className={`rounded-lg px-4 py-2.5 text-sm border ${restoreMessage.ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {restoreMessage.text}
                  {restoreMessage.ok && params.rows ? ` (${params.rows} سجل)` : ""}
                  {!restoreMessage.ok && params.detail && (
                    <div className="mt-1 font-mono text-xs opacity-80 break-all">{params.detail}</div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">تنزيل نسخة احتياطية</p>
                  <p className="text-xs text-[var(--muted)]">يحفظ كل البيانات (الأعضاء، المدفوعات، الاشتراكات… كله) في ملف JSON واحد.</p>
                </div>
                <a href="/api/backup/export">
                  <Button variant="secondary">
                    <Download className="w-4 h-4" /> تنزيل نسخة (Export)
                  </Button>
                </a>
              </div>
              <div className="border-t border-[var(--border)] pt-5">
                <p className="text-sm font-medium text-red-700">استعادة من ملف</p>
                <p className="text-xs text-[var(--muted)] mb-3">
                  استبدال كامل — يمسح البيانات الحالية ويحطّ بيانات الملف. اعمل Export الأول للأمان. (هتحتاج تسجّل دخول تاني بعد الاستعادة.)
                </p>
                <RestoreForm />
              </div>
            </div>
          </Card>
        )}

        {session.role === "ADMIN" && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4" /> صيانة البيانات
              </h2>
            </div>
            <div className="p-5 space-y-5">
              {params.maint === "attendance" && (
                <div className="rounded-lg px-4 py-2.5 text-sm border bg-emerald-50 text-emerald-800 border-emerald-200">
                  تم التحديث — الحضور والغياب محسوبين مباشرة من سجل الحضور الفعلي في كل مرة تفتح فيها صفحة العضو، فمفيش داعي لإعادة احتساب يدوي. الزرار ده بيحدّث الجداول المتكررة (الحصص الجديدة المستحقة) وحالة الاشتراكات المنتهية فورًا.
                </div>
              )}
              {params.maint === "codes" && (
                <div className="rounded-lg px-4 py-2.5 text-sm border bg-emerald-50 text-emerald-800 border-emerald-200">
                  تم تحديث {params.updated} من أصل {params.total} كود بالنظام القديم إلى النظام الرقمي الجديد.
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">تحديث الحضور والغياب</p>
                  <p className="text-xs text-[var(--muted)]">
                    الحضور والغياب محسوبين مباشرة من سجل الحضور الفعلي — مفيش بيانات مخزّنة تحتاج إعادة احتساب. الزرار ده بيحدّث فورًا الحصص المستحقة الجديدة وحالة الاشتراكات المنتهية بدل ما تستنى تحميل صفحة تانية.
                  </p>
                </div>
                <form action={runAttendanceRecompute}>
                  <Button type="submit" variant="secondary">
                    تشغيل الآن
                  </Button>
                </form>
              </div>
              <div className="border-t border-[var(--border)] pt-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">تحديث أكواد الأعضاء القديمة</p>
                  <p className="text-xs text-[var(--muted)]">يحوّل الأكواد بنظام FX3-00000 القديم إلى النظام الرقمي الجديد (مثال: FX3-00007 → 7). لا يؤثر على الأعضاء بأكواد رقمية بالفعل.</p>
                </div>
                <form action={runMemberCodeMigration}>
                  <Button type="submit" variant="secondary">
                    تشغيل الآن
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
