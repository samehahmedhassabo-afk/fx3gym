"use client";

import { useState } from "react";
import { Dumbbell, Plus, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { TrainingPlanForm } from "@/components/training-plan-form";
import { formatDate } from "@/lib/utils";
import type { WorkoutExercise } from "@/lib/actions/training-plans";
import type { TrainingPlan } from "@prisma/client";

export function TrainingProgramCard({
  memberId,
  plans,
  canManage,
  createAction,
  deleteAction,
  toggleAction,
}: {
  memberId: string;
  plans: TrainingPlan[];
  canManage: boolean;
  createAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  toggleAction: (formData: FormData) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-[var(--brand-blue)]" />
          <h3 className="font-semibold">برنامج تدريب اليوم</h3>
        </div>
        {canManage && !showForm && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> برنامج جديد
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 pb-4 border-b border-[var(--border)]">
          <TrainingPlanForm action={createAction} memberId={memberId} onDone={() => setShowForm(false)} />
        </div>
      )}

      {plans.length === 0 && !showForm ? (
        <p className="text-sm text-[var(--muted)]">لا يوجد برنامج تدريبي بعد</p>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const exercises: WorkoutExercise[] = (() => {
              try {
                return JSON.parse(plan.exercises);
              } catch {
                return [];
              }
            })();
            return (
              <div key={plan.id} className="border border-[var(--border)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{plan.title}</span>
                    <Badge variant={plan.isActive ? "success" : "outline"}>{plan.isActive ? "نشط" : "غير نشط"}</Badge>
                    <span className="text-[11px] text-[var(--muted)]">{formatDate(plan.createdAt)}</span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <form action={toggleAction}>
                        <input type="hidden" name="id" value={plan.id} />
                        <input type="hidden" name="isActive" value={plan.isActive ? "" : "on"} />
                        <Button type="submit" size="sm" variant="ghost">
                          {plan.isActive ? "إيقاف" : "تفعيل"}
                        </Button>
                      </form>
                      <DeleteButton action={deleteAction} id={plan.id} size="sm" iconOnly />
                    </div>
                  )}
                </div>
                {plan.goal && <p className="text-xs text-[var(--muted)] mb-2">الهدف: {plan.goal}</p>}
                <ul className="space-y-1">
                  {exercises.map((ex, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="w-5 text-[var(--muted)] text-xs">{i + 1}.</span>
                      <span className="font-medium">{ex.name}</span>
                      {ex.sets && <span className="text-xs text-[var(--muted)]">{ex.sets} مجموعات</span>}
                      <span className="text-xs text-[var(--muted)]">× {ex.reps}</span>
                      {ex.videoUrl && (
                        <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] inline-flex items-center gap-0.5 text-xs">
                          <ExternalLink className="w-3 h-3" /> فيديو الشرح
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
                {plan.notes && <p className="text-xs text-[var(--muted)] mt-2">{plan.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
