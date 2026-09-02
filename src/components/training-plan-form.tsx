"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { WorkoutExercise } from "@/lib/actions/training-plans";

const MAX_EXERCISES = 12;

export function TrainingPlanForm({
  action,
  memberId,
  initial,
  onDone,
}: {
  action: (formData: FormData) => void;
  memberId: string;
  initial?: { title: string; goal?: string | null; notes?: string | null; exercises: WorkoutExercise[] };
  onDone?: () => void;
}) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    initial?.exercises?.length ? initial.exercises : [{ name: "", sets: "", reps: "", videoUrl: "" }]
  );

  function updateExercise(i: number, field: keyof WorkoutExercise, value: string) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)));
  }

  function addExercise() {
    if (exercises.length >= MAX_EXERCISES) return;
    setExercises((prev) => [...prev, { name: "", sets: "", reps: "", videoUrl: "" }]);
  }

  function removeExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <form
      action={(formData) => {
        action(formData);
        onDone?.();
      }}
      className="space-y-4"
    >
      <input type="hidden" name="memberId" value={memberId} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>عنوان البرنامج</Label>
          <Input name="title" defaultValue={initial?.title ?? "برنامج تدريب اليوم"} required />
        </div>
        <div>
          <Label>الهدف (اختياري)</Label>
          <Input name="goal" defaultValue={initial?.goal ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>التمارين ({exercises.length}/{MAX_EXERCISES})</Label>
          {exercises.length < MAX_EXERCISES && (
            <Button type="button" size="sm" variant="outline" onClick={addExercise}>
              <Plus className="w-3.5 h-3.5" /> إضافة تمرين
            </Button>
          )}
        </div>
        {exercises.map((ex, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-2 items-center border border-[var(--border)] rounded-lg p-2">
            <Input
              placeholder="اسم التمرين"
              value={ex.name}
              onChange={(e) => updateExercise(i, "name", e.target.value)}
              name="exerciseName"
              required
            />
            <Input placeholder="مجموعات" value={ex.sets ?? ""} onChange={(e) => updateExercise(i, "sets", e.target.value)} name="exerciseSets" />
            <Input placeholder="تكرارات" value={ex.reps} onChange={(e) => updateExercise(i, "reps", e.target.value)} name="exerciseReps" required />
            <Input
              placeholder="رابط فيديو الشرح (يوتيوب مثلاً)"
              value={ex.videoUrl ?? ""}
              onChange={(e) => updateExercise(i, "videoUrl", e.target.value)}
              name="exerciseVideoUrl"
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => removeExercise(i)} title="حذف التمرين">
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <Label>ملاحظات (اختياري)</Label>
        <Input name="notes" defaultValue={initial?.notes ?? ""} />
      </div>

      <Button type="submit" size="sm">
        حفظ البرنامج
      </Button>
    </form>
  );
}
