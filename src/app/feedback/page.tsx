import { CheckCircle2 } from "lucide-react";
import { submitFeedback } from "@/lib/actions/feedback";
import { Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FX3Logo } from "@/components/fx3-logo";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <FX3Logo size={56} showTagline />
        </div>
        {sent === "1" ? (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">شكراً لرأيك!</h1>
            <p className="text-[var(--muted)]">وصلنا ملاحظتك وهنراجعها.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight">رأيك يهمنا</h1>
              <p className="text-[var(--muted)] mt-2 text-sm">شارك ملاحظاتك أو شكواك عن FX3 — بدون ما تكتب اسمك.</p>
            </div>
            <form action={submitFeedback} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">نوع الملاحظة</label>
                <Select name="category" defaultValue="GENERAL">
                  <option value="GENERAL">ملاحظة عامة</option>
                  <option value="COMPLAINT">شكوى</option>
                  <option value="SUGGESTION">اقتراح</option>
                  <option value="PRAISE">إشادة</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">رسالتك</label>
                <Textarea name="body" rows={5} required placeholder="اكتب ملاحظتك هنا…" />
              </div>
              <Button type="submit" className="w-full" size="lg">
                إرسال
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
