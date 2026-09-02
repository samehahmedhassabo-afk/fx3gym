"use client";

import { useState } from "react";
import { Label, Select } from "@/components/ui/input";
import { MemberPicker, type MemberOption } from "@/components/member-picker";

export function DuePayerPicker({
  members,
  trainers,
  employees,
  defaultPayerType = "MEMBER",
}: {
  members: MemberOption[];
  trainers: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  defaultPayerType?: string;
}) {
  const [payerType, setPayerType] = useState(defaultPayerType);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>نوع الطرف المدين *</Label>
        <Select name="payerType" value={payerType} onChange={(e) => setPayerType(e.target.value)}>
          <option value="MEMBER">عضو</option>
          <option value="TRAINER">كابتن</option>
          <option value="EMPLOYEE">موظف</option>
        </Select>
      </div>
      {payerType === "MEMBER" && (
        <div>
          <Label>العضو *</Label>
          <MemberPicker name="memberId" members={members} placeholder="ابحث عن عضو" />
        </div>
      )}
      {payerType === "TRAINER" && (
        <div>
          <Label>الكابتن *</Label>
          <Select name="trainerId" required>
            <option value="">— اختر —</option>
            {trainers.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {payerType === "EMPLOYEE" && (
        <div>
          <Label>الموظف *</Label>
          <Select name="employeeId" required>
            <option value="">— اختر —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
