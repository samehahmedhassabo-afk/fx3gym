import { MessageSquareWarning } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { markFeedbackReviewed, deleteFeedback } from "@/lib/actions/feedback";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";

const CATEGORY_LABELS_AR: Record<string, string> = { GENERAL: "عامة", COMPLAINT: "شكوى", SUGGESTION: "اقتراح", PRAISE: "إشادة" };
const CATEGORY_VARIANT: Record<string, "outline" | "danger" | "warning" | "success"> = {
  GENERAL: "outline",
  COMPLAINT: "danger",
  SUGGESTION: "warning",
  PRAISE: "success",
};

export default async function FeedbackAdminPage() {
  const session = await requirePermission("feedback.view");
  const perms = await getSessionPermissions();
  const canManage = perms.has("feedback.manage");
  const { locale } = await getT();

  const items = await db.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const newCount = items.filter((f) => f.status === "NEW").length;

  return (
    <>
      <Header
        title="آراء وشكاوى العملاء"
        subtitle="ملاحظات مقدَّمة من صفحة الرأي العامة — بدون أسماء"
        user={session}
        locale={locale}
        actions={
          <a href="/feedback" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">رابط صفحة الرأي</Button>
          </a>
        }
      />
      <main className="p-4 sm:p-6 space-y-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm">
            رابط الصفحة العامة: <code className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-blue-200">/feedback</code>
            {newCount > 0 && <span className="ms-2 font-medium text-amber-700">— {newCount} ملاحظة جديدة</span>}
          </p>
        </Card>
        {items.length === 0 ? (
          <Card>
            <EmptyState icon={MessageSquareWarning} title="لا يوجد ملاحظات حتى الآن" />
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={CATEGORY_VARIANT[f.category]}>{CATEGORY_LABELS_AR[f.category] ?? f.category}</Badge>
                    {f.status === "NEW" && <Badge variant="warning">جديدة</Badge>}
                    <span className="text-xs text-[var(--muted)]">{formatDateTime(f.createdAt)}</span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      {f.status === "NEW" && (
                        <form action={markFeedbackReviewed}>
                          <input type="hidden" name="id" value={f.id} />
                          <Button type="submit" size="sm" variant="outline">
                            تمت المراجعة
                          </Button>
                        </form>
                      )}
                      <DeleteButton action={deleteFeedback} id={f.id} size="sm" iconOnly />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{f.body}</p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
