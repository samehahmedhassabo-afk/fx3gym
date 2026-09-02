import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createTaskTemplate, deleteTaskTemplate } from "@/lib/actions/task-templates";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";
import { Settings2 } from "lucide-react";

export default async function TaskTemplatesPage() {
  const session = await requirePermission("tasks.view");
  const perms = await getSessionPermissions();
  const canManage = perms.has("tasks.create");
  const { t, locale } = await getT();

  const templates = await db.taskTemplate.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });

  return (
    <>
      <Header title="قوالب المهام اليومية" subtitle="المهام الثابتة اللي بتتكرر كل يوم لكل فئة وظيفية" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card>
          {templates.length === 0 ? (
            <EmptyState icon={Settings2} title="لا يوجد قوالب مهام بعد" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>الفئة</TH>
                  <TH>المهمة</TH>
                  <TH>الوقت المتوقع</TH>
                  <TH>عنصر الكمية</TH>
                  {canManage && <TH></TH>}
                </TR>
              </THead>
              <TBody>
                {templates.map((tpl) => (
                  <TR key={tpl.id}>
                    <TD label="الفئة">{t.tasks.categories[tpl.category as keyof typeof t.tasks.categories] ?? tpl.category}</TD>
                    <TD label="المهمة">
                      <div className="font-medium">{tpl.title}</div>
                      {tpl.description && <div className="text-xs text-[var(--muted)]">{tpl.description}</div>}
                    </TD>
                    <TD label="الوقت المتوقع">{tpl.expectedTime || "—"}</TD>
                    <TD label="عنصر الكمية">{tpl.quantityLabel || "—"}</TD>
                    {canManage && (
                      <TD>
                        <DeleteButton action={deleteTaskTemplate} id={tpl.id} size="sm" iconOnly />
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {canManage && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">إضافة قالب مهمة</h3>
            <form action={createTaskTemplate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">الفئة</label>
                <Select name="category" required>
                  {Object.entries(t.tasks.categories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <Input name="title" placeholder="اسم المهمة" required />
              <Input name="expectedTime" type="time" placeholder="الوقت المتوقع" />
              <Input name="quantityLabel" placeholder="عنصر الكمية (اختياري) — مثال: عدد الريلز" className="sm:col-span-2" />
              <Input name="sortOrder" type="number" placeholder="الترتيب" defaultValue={0} />
              <Button type="submit" size="sm" variant="secondary" className="sm:col-span-3 sm:w-fit">
                إضافة
              </Button>
            </form>
          </Card>
        )}
      </main>
    </>
  );
}
