import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { refundSale, updateSaleNotes } from "@/lib/actions/inventory";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("inventory.view");
  const { id } = await params;
  const { t, locale } = await getT();
  const perms = await getSessionPermissions();

  const sale = await db.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, member: true, payments: true },
  });
  if (!sale) notFound();

  const memberName = sale.member ? `${sale.member.firstName} ${sale.member.lastName}` : null;

  return (
    <>
      <Header title={`${t.inventory.sale} — ${sale.saleNumber}`} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/inventory">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4" /> {t.common.back}
            </Button>
          </Link>
          <a href={`/print/receipt/${sale.id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <Printer className="w-4 h-4" /> طباعة إيصال
            </Button>
          </a>
        </div>

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-2">
            <div>
              <div className="font-mono text-sm font-semibold">{sale.saleNumber}</div>
              <div className="text-xs text-[var(--muted)]">{formatDateTime(sale.createdAt)}</div>
            </div>
            {sale.refundedAt && <Badge variant="danger">مسترجع / Refunded</Badge>}
          </div>
          <div className="p-5 space-y-1 text-sm">
            <div>
              <span className="text-[var(--muted)]">{t.members.name}: </span>
              {memberName ?? "—"}
            </div>
            {sale.refundedAt && (
              <div className="text-red-700">
                <div>
                  <span className="text-[var(--muted)]">Refunded: </span>
                  {formatDateTime(sale.refundedAt)}
                </div>
                {sale.refundReason && (
                  <div>
                    <span className="text-[var(--muted)]">Reason: </span>
                    {sale.refundReason}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">Items</h2>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.members.name}</TH>
                <TH>{t.subscriptions.price}</TH>
                <TH>Qty</TH>
                <TH>{t.inventory.total}</TH>
              </TR>
            </THead>
            <TBody>
              {sale.items.map((item) => (
                <TR key={item.id}>
                  <TD label={t.members.name} className="font-medium">{item.product.name}</TD>
                  <TD label={t.subscriptions.price}>{formatCurrency(item.unitPrice)}</TD>
                  <TD label="Qty">{item.quantity}</TD>
                  <TD label={t.inventory.total} className="font-medium">{formatCurrency(item.subtotal)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="p-5 border-t border-[var(--border)] space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Discount</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>{t.inventory.total}</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">{t.payments.title}</h2>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Invoice #</TH>
                <TH>Method</TH>
                <TH>Amount</TH>
                <TH>{t.payments.date}</TH>
              </TR>
            </THead>
            <TBody>
              {sale.payments.map((p) => (
                <TR key={p.id}>
                  <TD label={t.members.name} className="font-mono text-xs">{p.invoiceNumber}</TD>
                  <TD label={t.subscriptions.price}>{p.method}</TD>
                  <TD label="Qty" className={p.amount < 0 ? "text-red-700 font-medium" : "font-medium"}>{formatCurrency(p.amount)}</TD>
                  <TD label={t.inventory.total} className="text-xs text-[var(--muted)]">{formatDateTime(p.paidAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        {!sale.refundedAt && perms.has("inventory.delete") && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold text-red-700">استرجاع البيع / Refund</h2>
            </div>
            <form action={refundSale} className="p-5 space-y-3">
              <input type="hidden" name="saleId" value={sale.id} />
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">سبب الاسترجاع / Reason</label>
                <input
                  type="text"
                  name="reason"
                  placeholder="سبب الاسترجاع (اختياري)"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm"
                />
              </div>
              <p className="text-xs text-[var(--muted)]">سيتم إرجاع المخزون وتسجيل دفعة عكسية. لا يمكن التراجع عن هذا الإجراء.</p>
              <Button type="submit" variant="danger">
                تأكيد الاسترجاع / Confirm Refund
              </Button>
            </form>
          </Card>
        )}

        {perms.has("inventory.edit") && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">ملاحظات / Notes</h2>
            </div>
            <form action={updateSaleNotes.bind(null, sale.id)} className="p-5 space-y-3">
              <textarea
                name="notes"
                defaultValue={sale.notes ?? ""}
                rows={3}
                placeholder="ملاحظات..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm"
              />
              <Button type="submit" variant="outline">
                {t.common.save}
              </Button>
            </form>
          </Card>
        )}
      </main>
    </>
  );
}
