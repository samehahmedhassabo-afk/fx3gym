"use client";

import { useState } from "react";
import Link from "next/link";
import { MemberPicker, type MemberOption } from "@/components/member-picker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { FITNESS_TEST_TYPES } from "@/lib/fitness-tests";

export type ExerciseOption = { id: string; name: string; nameAr?: string | null; category?: string | null };

export function FitnessTestForm({
  action,
  members,
  exercisesByType,
  locale,
  defaultMemberId,
  defaultTestType,
  defaultDate,
  defaultNotes,
  defaultReps,
  lockMember = false,
  lockType = false,
  memberName,
  labels,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => void;
  members: MemberOption[];
  exercisesByType: Record<string, ExerciseOption[]>;
  locale: "en" | "ar";
  defaultMemberId?: string;
  defaultTestType?: string;
  defaultDate?: string;
  defaultNotes?: string;
  defaultReps?: Record<string, number>;
  lockMember?: boolean;
  lockType?: boolean;
  memberName?: string;
  labels: { member: string; testType: string; date: string; notes: string; exercise: string; category: string; reps: string; save: string; cancel: string };
  submitLabel?: string;
  cancelHref: string;
}) {
  const [testType, setTestType] = useState(defaultTestType ?? FITNESS_TEST_TYPES[0].value);
  const exercises = exercisesByType[testType] ?? [];

  return (
    <form action={action}>
      <Card>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>{labels.member} *</Label>
            {lockMember ? (
              <>
                <Input value={memberName ?? ""} disabled />
                <input type="hidden" name="memberId" value={defaultMemberId} />
              </>
            ) : (
              <MemberPicker name="memberId" members={members} defaultValue={defaultMemberId} />
            )}
          </div>
          <div>
            <Label>{labels.date}</Label>
            <Input name="date" type="date" defaultValue={defaultDate} />
          </div>
          <div className="md:col-span-3">
            <Label>{labels.testType} *</Label>
            {lockType ? (
              <>
                <Input value={FITNESS_TEST_TYPES.find((t) => t.value === testType)?.[locale === "ar" ? "labelAr" : "labelEn"] ?? testType} disabled />
                <input type="hidden" name="testType" value={testType} />
              </>
            ) : (
              <Select name="testType" value={testType} onChange={(e) => setTestType(e.target.value)}>
                {FITNESS_TEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {locale === "ar" ? t.labelAr : t.labelEn}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--border)]">
          <div className="p-5 pb-0">
            <h3 className="font-semibold">{labels.exercise}</h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exercises.length === 0 ? (
              <p className="text-sm text-[var(--muted)] sm:col-span-2">—</p>
            ) : (
              exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{locale === "ar" && ex.nameAr ? ex.nameAr : ex.name}</div>
                    {ex.category && <div className="text-xs text-[var(--muted)]">{ex.category}</div>}
                  </div>
                  <Input
                    name={`reps_${ex.id}`}
                    type="number"
                    min={0}
                    step={1}
                    className="w-24"
                    placeholder={labels.reps}
                    defaultValue={defaultReps?.[ex.id] ?? ""}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-5 border-t border-[var(--border)]">
          <Label>{labels.notes}</Label>
          <Textarea name="notes" rows={2} defaultValue={defaultNotes} />
        </div>

        <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
          <Link href={cancelHref}>
            <Button variant="outline" type="button">
              {labels.cancel}
            </Button>
          </Link>
          <Button type="submit">{submitLabel ?? labels.save}</Button>
        </div>
      </Card>
    </form>
  );
}
