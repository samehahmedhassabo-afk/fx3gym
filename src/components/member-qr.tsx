"use client";

import QRCode from "react-qr-code";

export function MemberQR({ code, size = 180 }: { code: string; size?: number }) {
  return <QRCode value={code} size={size} level="M" />;
}
