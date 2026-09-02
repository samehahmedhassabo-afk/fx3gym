import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { MemberQR } from "@/components/member-qr";
import { MemberBarcode } from "@/components/member-barcode";
import { PrintButton } from "@/components/print-button";
import { formatDate } from "@/lib/utils";

export default async function MemberQRLabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ w?: string; h?: string; format?: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const isBarcode = query.format === "barcode";
  const widthMm = Math.min(150, Math.max(20, Number(query.w) || 40));
  const heightMm = Math.min(150, Math.max(20, Number(query.h) || 30));
  const qrSize = Math.round(3.2 * Math.min(widthMm, heightMm - 8));
  const barcodeHeightMm = Math.max(8, heightMm * 0.35);

  const member = await db.member.findUnique({ where: { id } });
  if (!member) notFound();

  const activeSubscription = await db.subscription.findFirst({
    where: { memberId: member.id, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="label-root">
      <style>{`
        @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
        .label-root {
          width: ${widthMm}mm; height: ${heightMm}mm;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1mm; padding: 1.5mm; overflow: hidden;
          font-family: system-ui, sans-serif; color: #000; text-align: center;
        }
        .label-root .qr { line-height: 0; }
        .label-root .barcode { width: 90%; }
        .label-root .barcode svg { width: 100%; height: ${barcodeHeightMm}mm; }
        .label-root .code { font-family: monospace; font-weight: 700; font-size: 9pt; }
        .label-root .name { font-size: 7pt; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .label-root .sub-date { font-size: 6pt; color: #555; }
        .print-btn { margin-top: 8mm; }
        @media print { .print-btn, .no-print { display: none !important; } }
      `}</style>
      <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <PrintButton label="طباعة" />
        <a
          href={`/print/member-qr/${member.id}${isBarcode ? "" : "?format=barcode"}`}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black"
        >
          {isBarcode ? "عرض QR" : "عرض باركود"}
        </a>
        <a href="/members" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black">
          رجوع
        </a>
      </div>
      {isBarcode ? (
        <div className="barcode">
          <MemberBarcode code={member.memberCode} />
        </div>
      ) : (
        <div className="qr">
          <MemberQR code={member.memberCode} size={qrSize} />
        </div>
      )}
      <div className="name">
        {member.firstName} {member.lastName}
      </div>
      {activeSubscription && <div className="sub-date">{formatDate(activeSubscription.startDate)}</div>}
      <div className="code">{member.memberCode}</div>
      <PrintButton />
    </div>
  );
}
