import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { settleDue, cancelDue, deleteDue } from "@/lib/actions/dues";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { SettleDueButton } from "@/components/settle-due-button";

const PAYER_LABELS: Record<string, string> = { MEMBER: "عضو", TRAINER: "كابتن", EMPLOYEE: "موظف" };
const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION_BALANCE: "رصيد اشتراك",
  TRAINER_RENTAL: "إيجار مكان",
  SALARY_ADVANCE: "سلفة راتب",
  OTHER: "أخرى",
};
const STATUS_LABELS: Record<string, string> = { PENDING: "معلّق", PAID: "مدفوع", CANCELLED: "ملغي" };

function duePayerName(d: {
  payerType: string;
  member: { firstName: string; lastName: string } | null;
  trainer: { user: { fullName: string } } | null;
  employee: { fullName: string } | null;
}) {
  if (d.payerType === "MEMBER" && d.member) return `${d.member.firstName} ${d.member.lastName}`;
  if (d.payerType === "TRAINER" && d.trainer) return d.trainer.user.fullName;
  if (d.payerType === "EMPLOYEE" && d.employee) return d.employee.fullName;
  return "—";
}

export default async function DuesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payerType?: string; highlight?: string }>;
}) {
  const session = await requirePermission("dues.view");
  const { locale } = await getT();
  const perms = await getSessionPermissions();
  const canEdit = perms.has("dues.edit");
  const canDelete = perms.has("dues.delete");
  const params = await searchParams;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.payerType) where.payerType = params.payerType;

  const dues = await db.duePayment.findMany({
    where,
    include: { member: true, trainer: { include: { user: true } }, employee: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  const now = new Date();

  return (
    <>
      <Header
        title="المستحقات"
        user={session}
        locale={locale}
        actions={
          <Link href="/payments/dues/new">
            <Button size="sm">
              <Plus className="w-4 h-4" /> إضافة مستحق
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 space-y-4">
        <Link href="/payments" className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline">
          <ArrowRight className="w-4 h-4" /> رجوع للمدفوعات
        </Link>
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>الطرف</TH>
                <TH>النوع</TH>
                <TH>الفئة</TH>
                <TH>المبلغ</TH>
                <TH>تاريخ الاستحقاق</TH>
                <TH>الحالة</TH>
                <TH className="text-left">الإجراءات</TH>
              </TR>
            </THead>
            <TBody>
              {dues.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center text-[var(--muted)] py-8">
                    لا يوجد مستحقات
                  </TD>
                </TR>
              ) : (
                dues.map((d) => {
                  const overdue = d.status === "PENDING" && d.dueDate < now;
                  const badgeVariant = d.status === "PAID" ? "success" : d.status === "CANCELLED" ? "default" : overdue ? "danger" : "warning";
                  return (
                    <TR key={d.id} className={cn(params.highlight === d.id && "ring-2 ring-[var(--brand-blue)]")}>
                      <TD label="الطرف" className="font-medium">
                        {duePayerName(d)}
                      </TD>
                      <TD label="النوع">{PAYER_LABELS[d.payerType] ?? d.payerType}</TD>
                      <TD label="الفئة" className="text-xs text-[var(--muted)]">
                        {CATEGORY_LABELS[d.category] ?? d.category}
                      </TD>
                      <TD label="المبلغ" className="font-medium">
                        {formatCurrency(d.amount, locale)}
                      </TD>
                      <TD label="تاريخ الاستحقاق" className={cn("text-xs", overdue && "text-red-600 font-semibold")}>
                        {formatDate(d.dueDate)}
                      </TD>
                      <TD label="الحالة">
                        <Badge variant={badgeVariant}>{STATUS_LABELS[d.status] ?? d.status}</Badge>
                      </TD>
                      <TD label="الإجراءات">
                        <div className="flex items-center gap-2">
                          {d.status === "PENDING" && canEdit && <SettleDueButton id={d.id} action={settleDue} />}
                          {d.status === "PENDING" && canDelete && (
                            <form action={cancelDue}>
                              <input type="hidden" name="id" value={d.id} />
                              <Button type="submit" variant="outline" size="sm">
                                إلغاء
                              </Button>
                            </form>
                          )}
                          {canDelete && <DeleteButton action={deleteDue} id={d.id} iconOnly />}
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
