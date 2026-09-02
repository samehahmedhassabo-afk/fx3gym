import Link from "next/link";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { listAllTemplates, createTemplate, updateTemplate, deleteTemplate } from "@/lib/actions/notification-templates";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";

const TEMPLATE_TYPES = ["SUBSCRIPTION_EXPIRY", "CLASS_REMINDER", "PAYMENT_DUE", "WELCOME", "PROMOTIONAL", "BIRTHDAY", "OTHER"];
const VARIABLES_HINT = "المتغيرات المتاحة: {name} {plan} {days} {code} {gym}";

export default async function NotificationTemplatesPage() {
  const session = await requirePermission("notifications.view");
  const perms = await getSessionPermissions();
  const canCreate = perms.has("notifications.create");
  const canDelete = perms.has("notifications.delete");
  const { t, locale } = await getT();
  const templates = await listAllTemplates();

  return (
    <>
      <Header title="قوالب الرسائل" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/notifications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> {t.common.back}
            </Button>
          </Link>
        </div>

        {canCreate && (
          <Card>
            <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <h2 className="font-semibold">قالب جديد</h2>
            </div>
            <form action={createTemplate}>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>الاسم *</Label>
                  <Input name="name" required placeholder="تذكير انتهاء الاشتراك" />
                </div>
                <div>
                  <Label>النوع</Label>
                  <Select name="type" defaultValue="OTHER">
                    {TEMPLATE_TYPES.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>النص *</Label>
                  <Textarea name="body" rows={4} required placeholder="أهلاً {name}، اشتراكك {plan} في {gym} قرب يخلص خلال {days} يوم 💪" />
                  <p className="text-xs text-[var(--muted)] mt-1">{VARIABLES_HINT}</p>
                </div>
                <div>
                  <Label>الترتيب</Label>
                  <Input name="sortOrder" type="number" defaultValue={0} />
                </div>
                <label className="flex items-center gap-2 text-sm mt-6">
                  <input type="checkbox" name="isActive" defaultChecked className="w-4 h-4" />
                  مُفعّل
                </label>
              </div>
              <div className="p-5 border-t border-[var(--border)] flex justify-end">
                <Button type="submit">
                  <Plus className="w-4 h-4" /> {t.common.save}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <h2 className="font-semibold">القوالب</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {templates.length === 0 ? (
              <p className="p-4 sm:p-6 text-center text-sm text-[var(--muted)]">{t.common.noData}</p>
            ) : (
              templates.map((tpl) =>
                canCreate ? (
                  <div key={tpl.id} className="p-5">
                    <form id={`tpl-form-${tpl.id}`} action={updateTemplate.bind(null, tpl.id)} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>الاسم</Label>
                          <Input name="name" defaultValue={tpl.name} required />
                        </div>
                        <div>
                          <Label>النوع</Label>
                          <Select name="type" defaultValue={tpl.type}>
                            {TEMPLATE_TYPES.map((tp) => (
                              <option key={tp} value={tp}>
                                {tp}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>النص</Label>
                        <Textarea name="body" rows={3} defaultValue={tpl.body} required />
                        <p className="text-xs text-[var(--muted)] mt-1">{VARIABLES_HINT}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <Label>الترتيب</Label>
                          <Input name="sortOrder" type="number" defaultValue={tpl.sortOrder} />
                        </div>
                        <label className="flex items-center gap-2 text-sm mt-6">
                          <input type="checkbox" name="isActive" defaultChecked={tpl.isActive} className="w-4 h-4" />
                          مُفعّل
                        </label>
                        {!tpl.isActive && <Badge variant="outline">غير مُفعّل</Badge>}
                      </div>
                    </form>
                    <div className="flex items-center gap-2 mt-3">
                      <Button type="submit" form={`tpl-form-${tpl.id}`} size="sm" variant="outline">
                        {t.common.save}
                      </Button>
                      {canDelete && <DeleteButton action={deleteTemplate} id={tpl.id} size="sm" />}
                    </div>
                  </div>
                ) : (
                  <div key={tpl.id} className="p-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {tpl.name}
                        <Badge variant="outline">{tpl.type}</Badge>
                        {!tpl.isActive && <Badge variant="outline">غير مُفعّل</Badge>}
                      </div>
                      <p className="text-sm text-[var(--muted)] mt-1 whitespace-pre-wrap">{tpl.body}</p>
                    </div>
                    {canDelete && <DeleteButton action={deleteTemplate} id={tpl.id} size="sm" />}
                  </div>
                )
              )
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
