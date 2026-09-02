"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

export function SettleDueButton({ id, action }: { id: string; action: (formData: FormData) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="success" onClick={() => setOpen(true)}>
        تحصيل
      </Button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <Select name="method" defaultValue="CASH" className="h-8 text-xs w-28">
        <option value="CASH">كاش</option>
        <option value="CARD">كارت</option>
        <option value="INSTAPAY">InstaPay</option>
        <option value="VODAFONE_CASH">فودافون كاش</option>
        <option value="BANK_TRANSFER">تحويل بنكي</option>
      </Select>
      <Button type="submit" size="sm" variant="success">
        تأكيد
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
        إلغاء
      </Button>
    </form>
  );
}
