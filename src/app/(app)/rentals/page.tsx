import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteRental } from "@/lib/actions/rentals";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function RentalsPage() {
  const session = await requirePermission("rentals.view");
  const { locale } = await getT();
  const perms = await getSessionPermissions();
  const canDelete = perms.has("rentals.delete");

  const rentals = await db.areaRental.findMany({
    include: { trainer: { include: { user: true } }, payment: true, duePayment: true },
    orderBy: { startTime: "desc" },
  });

  return (
    <>
      <Header
        title="إيجار المناطق"
        user={session}
        locale={locale}
        actions={
          <Link href="/rentals/new">
            <Button size="sm">
              <Plus className="w-4 h-4" /> إضافة إيجار
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6">
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>الكابتن</TH>
                <TH>المنطقة</TH>
                <TH>الوقت</TH>
                <TH>الأعضاء المتوقعين</TH>
                <TH>الإيجار</TH>
                <TH>الحالة</TH>
                <TH className="text-left">الإجراءات</TH>
              </TR>
            </THead>
            <TBody>
              {rentals.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center text-[var(--muted)] py-8">
                    لا يوجد إيجارات
                  </TD>
                </TR>
              ) : (
                rentals.map((r) => {
                  const statusLabel = r.paymentId ? "مدفوع" : r.duePayment?.status === "PAID" ? "مدفوع" : r.duePayment?.status === "CANCELLED" ? "ملغي" : "مستحق";
                  const statusVariant = statusLabel === "مدفوع" ? "success" : statusLabel === "ملغي" ? "default" : "warning";
                  return (
                    <TR key={r.id}>
                      <TD label="الكابتن" className="font-medium">
                        {r.trainer?.user.fullName ?? "—"}
                      </TD>
                      <TD label="المنطقة">{r.areaName}</TD>
                      <TD label="الوقت" className="text-xs text-[var(--muted)]">
                        {formatDate(r.startTime)} – {formatDate(r.endTime)}
                      </TD>
                      <TD label="الأعضاء المتوقعين">{r.expectedMembers ?? "—"}</TD>
                      <TD label="الإيجار" className="font-medium">
                        {formatCurrency(r.rentFee, locale)}
                      </TD>
                      <TD label="الحالة">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </TD>
                      <TD label="الإجراءات">{canDelete && <DeleteButton action={deleteRental} id={r.id} iconOnly />}</TD>
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
