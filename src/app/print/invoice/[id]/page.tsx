import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getGymSettings } from "@/lib/settings";
import { PrintButton } from "@/components/print-button";

const METHOD_LABELS: Record<string, string> = {
  CASH: "كاش",
  CARD: "بطاقة",
  INSTAPAY: "انستاباي",
  VODAFONE_CASH: "فودافون كاش",
  BANK_TRANSFER: "تحويل بنكي",
  OTHER: "أخرى",
};

const TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "اشتراك",
  PERSONAL_TRAINING: "تدريب خاص",
  PRODUCT_SALE: "مبيعات",
  REGISTRATION_FEE: "رسوم تسجيل",
  AREA_RENTAL: "إيجار مناطق",
  OTHER: "أخرى",
};

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const payment = await db.payment.findUnique({
    where: { id },
    include: { member: true, subscription: { include: { plan: true } } },
  });
  if (!payment) notFound();

  const gym = await getGymSettings();
  const description = payment.subscription?.plan?.name ?? TYPE_LABELS[payment.type] ?? "دفعة";
  const backHref = payment.member?.id ? `/members/${payment.member.id}` : "/subscriptions";

  return (
    <div className="receipt">
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000; }
        .receipt {
          width: 80mm; padding: 4mm 5mm; font-family: system-ui, sans-serif;
          direction: rtl; text-align: center; font-size: 12px;
        }
        .receipt h1 { font-size: 18px; margin: 0; }
        .receipt .subtitle { font-size: 11px; color: #444; margin-top: 2px; }
        .receipt .contact { font-size: 10px; color: #555; margin-top: 2px; }
        .receipt hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .receipt .row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; text-align: start; }
        .receipt .total { font-size: 16px; font-weight: 700; margin-top: 4px; }
        .receipt .footer { margin-top: 8px; font-size: 11px; }
        .no-print { margin-top: 10px; }
        @media print { .no-print { display: none !important; } }
      `}</style>
      <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
        <PrintButton label="طباعة" />
        <a href={backHref} className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black">
          رجوع
        </a>
      </div>
      <h1>{gym.name}</h1>
      {gym.address && <div className="contact">{gym.address}</div>}
      {gym.phone && <div className="contact">{gym.phone}</div>}
      <hr />
      <div className="row">
        <span>فاتورة</span>
        <span>{payment.invoiceNumber}</span>
      </div>
      <div className="row">
        <span>التاريخ</span>
        <span>{formatDateTime(payment.paidAt, "ar-EG")}</span>
      </div>
      {payment.member && (
        <div className="row">
          <span>العميل</span>
          <span>
            {payment.member.firstName} {payment.member.lastName}
          </span>
        </div>
      )}
      <div className="row">
        <span>البيان</span>
        <span>{description}</span>
      </div>
      <div className="row">
        <span>طريقة الدفع</span>
        <span>{METHOD_LABELS[payment.method] ?? payment.method}</span>
      </div>
      <hr />
      <div className="row total">
        <span>الإجمالي</span>
        <span>{formatCurrency(payment.amount, "ar-EG")}</span>
      </div>
      <div className="footer">شكراً لاشتراكك في FX3 💪</div>
    </div>
  );
}
