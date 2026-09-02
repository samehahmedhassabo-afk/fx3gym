import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function SaleReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const sale = await db.sale.findUnique({ where: { id }, include: { items: { include: { product: true } }, member: true } });
  if (!sale) notFound();

  const memberName = sale.member ? `${sale.member.firstName} ${sale.member.lastName}` : null;

  return (
    <div className="receipt-root">
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
        .receipt-root {
          width: 80mm; padding: 3mm 4mm;
          font-family: system-ui, monospace, sans-serif; color: #000;
          font-size: 10pt; line-height: 1.35;
        }
        .receipt-root .center { text-align: center; }
        .receipt-root .gym { font-size: 13pt; font-weight: 800; }
        .receipt-root .muted { font-size: 8.5pt; color: #333; }
        .receipt-root hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
        .receipt-root .row { display: flex; justify-content: space-between; gap: 4mm; }
        .receipt-root .item-name { flex: 1; }
        .receipt-root .total-row { font-weight: 800; font-size: 12pt; }
        .receipt-root .stamp {
          margin: 3mm auto 0; text-align: center; border: 2px solid #000;
          font-weight: 800; padding: 1.5mm; letter-spacing: 1px;
        }
        .print-btn { margin-top: 6mm; }
        @media print { .print-btn, .no-print { display: none !important; } }
      `}</style>
      <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
        <PrintButton label="طباعة" />
        <a href="/inventory" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black">
          رجوع
        </a>
      </div>
      <div className="center gym">FX3 Fight & Fitness</div>
      <div className="center muted">{sale.saleNumber}</div>
      <div className="center muted">{formatDateTime(sale.createdAt)}</div>
      {memberName && <div className="center muted">{memberName}</div>}
      <hr />
      {sale.items.map((item) => (
        <div key={item.id} className="row">
          <span className="item-name">
            {item.product.name} x {item.quantity}
          </span>
          <span>{formatCurrency(item.subtotal)}</span>
        </div>
      ))}
      <hr />
      <div className="row">
        <span>Subtotal</span>
        <span>{formatCurrency(sale.subtotal)}</span>
      </div>
      {sale.discount > 0 && (
        <div className="row">
          <span>Discount</span>
          <span>-{formatCurrency(sale.discount)}</span>
        </div>
      )}
      <div className="row total-row">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>
      {sale.refundedAt && <div className="stamp">REFUNDED</div>}
      <hr />
      <div className="center muted">شكراً لتعاملكم معنا / Thank you!</div>
    </div>
  );
}
