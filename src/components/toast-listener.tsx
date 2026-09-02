"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, { text: string; type: "success" | "error" }> = {
  approved: { text: "تمت الموافقة على الطلب", type: "success" },
  rejected: { text: "تم رفض الطلب", type: "success" },
  points_adjusted: { text: "تم تعديل رصيد النقاط", type: "success" },
  reward_redeemed: { text: "تم استبدال المكافأة", type: "success" },
  tier_saved: { text: "تم حفظ الفئة", type: "success" },
  reward_saved: { text: "تم حفظ المكافأة", type: "success" },
  config_saved: { text: "تم حفظ إعدادات برنامج الولاء", type: "success" },
  broadcast_sent: { text: "تم إرسال الرسائل بنجاح", type: "success" },
  code_updated: { text: "تم تحديث كود العضو", type: "success" },
  code_duplicate: { text: "الكود ده مستخدم بالفعل لعضو تاني", type: "error" },
  code_invalid: { text: "اكتب كود صالح", type: "error" },
};

export function ToastListener() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = searchParams.get("toast");

  useEffect(() => {
    if (!key) return;
    const entry = MESSAGES[key];
    if (entry) toast[entry.type](entry.text);
    const params = new URLSearchParams(searchParams);
    params.delete("toast");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
