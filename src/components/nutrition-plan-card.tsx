"use client";

import { useState } from "react";
import { Apple, Plus, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { formatDate } from "@/lib/utils";
import type { NutritionPlan } from "@prisma/client";

export function NutritionPlanCard({
  memberId,
  plans,
  canManage,
  createAction,
  deleteAction,
  toggleAction,
}: {
  memberId: string;
  plans: NutritionPlan[];
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
          <Apple className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold">الخطة الغذائية</h3>
        </div>
        {canManage && !showForm && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> خطة جديدة
          </Button>
        )}
      </div>

      {showForm && (
        <form
          action={(fd) => {
            createAction(fd);
            setShowForm(false);
          }}
          className="mb-4 pb-4 border-b border-[var(--border)] space-y-3"
        >
          <input type="hidden" name="memberId" value={memberId} />
          <div>
            <Label>عنوان الخطة</Label>
            <Input name="title" defaultValue="الخطة الغذائية" required />
          </div>
          <div>
            <Label>رابط الخطة (PDF أو صفحة خارجية)</Label>
            <Input name="linkUrl" type="url" placeholder="https://…" />
          </div>
          <div>
            <Label>ملاحظات (اختياري)</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <Button type="submit" size="sm">
            حفظ الخطة
          </Button>
        </form>
      )}

      {plans.length === 0 && !showForm ? (
        <p className="text-sm text-[var(--muted)]">لا يوجد خطة غذائية بعد</p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="border border-[var(--border)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{plan.title}</span>
                  <Badge variant={plan.isActive ? "success" : "outline"}>{plan.isActive ? "نشطة" : "غير نشطة"}</Badge>
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
              {plan.linkUrl && (
                <a href={plan.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] inline-flex items-center gap-1 text-xs">
                  <ExternalLink className="w-3 h-3" /> فتح الخطة
                </a>
              )}
              {plan.notes && <p className="text-xs text-[var(--muted)] mt-1">{plan.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
