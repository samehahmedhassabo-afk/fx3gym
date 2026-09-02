"use client";

import { useState } from "react";
import { Label, Select, Input } from "@/components/ui/input";

export function RentalPaymentChoice() {
  const [choice, setChoice] = useState("DUE");

  return (
    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40">
      <div className="md:col-span-2">
        <Label>حالة الدفع *</Label>
        <Select name="paymentChoice" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="DUE">مستحق لاحقاً</option>
          <option value="PAY_NOW">دفع الآن</option>
        </Select>
      </div>
      {choice === "PAY_NOW" ? (
        <div>
          <Label>طريقة الدفع</Label>
          <Select name="method" defaultValue="CASH">
            <option value="CASH">كاش</option>
            <option value="CARD">كارت</option>
            <option value="INSTAPAY">InstaPay</option>
            <option value="VODAFONE_CASH">فودافون كاش</option>
            <option value="BANK_TRANSFER">تحويل بنكي</option>
          </Select>
        </div>
      ) : (
        <div>
          <Label>تاريخ استحقاق الدفع</Label>
          <Input name="dueDate" type="date" />
        </div>
      )}
    </div>
  );
}
