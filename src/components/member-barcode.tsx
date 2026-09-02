"use client";

import { useEffect, useRef } from "react";

export function MemberBarcode({ code, height = 45 }: { code: string; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      if (cancelled || !svgRef.current) return;
      JsBarcode(svgRef.current, code, {
        format: "CODE128",
        height,
        width: 1.6,
        displayValue: false,
        margin: 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [code, height]);

  return <svg ref={svgRef} aria-label={code} />;
}
