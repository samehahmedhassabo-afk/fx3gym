import Link from "next/link";
import { Users } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { resolveSegmentMembers, sendBroadcast } from "@/lib/actions/broadcast";
import { SEGMENT_LABELS_AR, type BroadcastSegment } from "@/lib/broadcast-segments";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

const SEGMENT_OPTIONS: BroadcastSegment[] = ["EXPIRING_7", "CHURN_RISK", "FROZEN", "NO_ACTIVE", "TOP_TIER"];

export default async function BroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string }>;
}) {
  const session = await requirePermission("notifications.create");
  const { locale } = await getT();
  const params = await searchParams;
  const segment: BroadcastSegment = SEGMENT_OPTIONS.includes(params.segment as BroadcastSegment) ? (params.segment as BroadcastSegment) : "EXPIRING_7";

  const [members, templates] = await Promise.all([
    resolveSegmentMembers(segment),
    db.messageTemplate.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <>
      <Header title="إرسال جماعي" subtitle="اختر مجموعة أعضاء وقالب رسالة لإرسالها للجميع دفعة واحدة" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-64">
              <Label>المجموعة</Label>
              <Select name="segment" defaultValue={segment}>
                {SEGMENT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SEGMENT_LABELS_AR[s]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              عرض
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[var(--muted)]" />
            <h3 className="font-semibold text-sm">
              {SEGMENT_LABELS_AR[segment]} — {members.length} عضو
            </h3>
          </div>
          {members.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد أعضاء في هذه المجموعة حالياً" />
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {members.slice(0, 60).map((m) => (
                <Badge key={m.id} variant="outline">
                  {m.firstName} {m.lastName}
                </Badge>
              ))}
              {members.length > 60 && <Badge variant="outline">+{members.length - 60} آخرين</Badge>}
            </div>
          )}
        </Card>

        {members.length > 0 && (
          <form action={sendBroadcast}>
            <input type="hidden" name="segment" value={segment} />
            <Card className="p-4 space-y-4">
              <div>
                <Label>القالب (اختياري)</Label>
                <Select name="templateId" defaultValue="">
                  <option value="">— بدون قالب، اكتب رسالة مخصصة —</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>رسالة مخصصة (تُستخدم لو لم يُختر قالب)</Label>
                <Textarea name="body" rows={4} placeholder="أهلاً {name}، ..." />
                <p className="text-xs text-[var(--muted)] mt-1">
                  المتغيرات المتاحة: {"{name}"} الاسم، {"{plan}"} الباقة، {"{days}"} الأيام المتبقية.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Link href="/notifications">
                  <Button variant="outline" type="button">
                    إلغاء
                  </Button>
                </Link>
                <Button type="submit">إرسال إلى {members.length} عضو</Button>
              </div>
            </Card>
          </form>
        )}
      </main>
    </>
  );
}
