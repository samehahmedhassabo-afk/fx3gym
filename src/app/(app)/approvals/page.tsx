import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { listPendingChanges } from "@/lib/approvals";
import { approvePendingChange, rejectPendingChange } from "@/lib/actions/approvals";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RejectButton } from "@/components/reject-button";
import { EmptyState } from "@/components/empty-state";

const STATUS_VARIANT: Record<string, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};
const STATUS_LABELS_AR: Record<string, string> = { PENDING: "بانتظار المراجعة", APPROVED: "تمت الموافقة", REJECTED: "مرفوض" };

export default async function ApprovalsPage() {
  const session = await requirePermission("approvals.view");
  const { locale } = await getT();
  const perms = await getSessionPermissions();
  const canReview = perms.has("approvals.review");

  const changes = canReview
    ? await listPendingChanges({ reviewerAll: true })
    : await listPendingChanges({ requestedById: session.userId });

  return (
    <>
      <Header
        title={canReview ? "طلبات المراجعة" : "طلباتي"}
        subtitle={canReview ? "تعديلات وحذف بيانات الأعضاء والاشتراكات المقدّمة من الاستقبال" : "حالة الطلبات التي قدّمتها"}
        user={session}
        locale={locale}
      />
      <main className="p-4 sm:p-6 space-y-6">
        <Card>
          {changes.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={canReview ? "لا يوجد طلبات مراجعة حالياً" : "لم تقدّم أي طلبات بعد"}
              hint={canReview ? "تعديلات وحذف بيانات الأعضاء والاشتراكات من الاستقبال ستظهر هنا." : "تعديلات تقدّمها على الأعضاء أو الاشتراكات تظهر هنا بحالتها."}
            />
          ) : (
          <Table>
            <THead>
              <TR>
                <TH>النوع</TH>
                <TH>الإجراء</TH>
                <TH>الملخص</TH>
                <TH>مقدّم الطلب</TH>
                <TH>التاريخ</TH>
                <TH>الحالة</TH>
                {canReview && <TH>الإجراءات</TH>}
                {!canReview && <TH>ملاحظة الرفض</TH>}
              </TR>
            </THead>
            <TBody>
              {changes.map((c) => (
                  <TR key={c.id}>
                    <TD label="النوع">{c.entityLabel}</TD>
                    <TD label="الإجراء">{c.actionLabel}</TD>
                    <TD label="الملخص">
                      <div>{c.summary}</div>
                      {c.changedKeys.length > 0 && (
                        <div className="text-[11px] text-[var(--muted)] mt-1">
                          {c.changedKeys.map((k) => (
                            <div key={k}>
                              {k}: {String(c.previous[k] ?? "—")} ← {String(c.proposed?.[k] ?? "—")}
                            </div>
                          ))}
                        </div>
                      )}
                    </TD>
                    <TD label="مقدّم الطلب">{c.requestedByName}</TD>
                    <TD label="التاريخ" className="text-xs text-[var(--muted)]">{formatDateTime(c.createdAt)}</TD>
                    <TD label="الحالة">
                      <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABELS_AR[c.status] ?? c.status}</Badge>
                    </TD>
                    {canReview ? (
                      <TD label="الإجراءات">
                        {c.status === "PENDING" ? (
                          <div className="flex items-center gap-2">
                            <form action={approvePendingChange}>
                              <input type="hidden" name="id" value={c.id} />
                              <Button type="submit" variant="success" size="sm">
                                <CheckCircle2 className="w-4 h-4" /> موافقة
                              </Button>
                            </form>
                            <RejectButton action={rejectPendingChange} id={c.id} />
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">{c.reviewedByName}</span>
                        )}
                      </TD>
                    ) : (
                      <TD label="ملاحظة الرفض" className="text-xs text-[var(--muted)]">
                        {c.reviewNote || "—"}
                      </TD>
                    )}
                  </TR>
              ))}
            </TBody>
          </Table>
          )}
        </Card>
      </main>
    </>
  );
}
