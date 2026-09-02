import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { submitTrialLead } from "@/lib/actions/leads";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FX3Logo } from "@/components/fx3-logo";

export default async function BookTrialPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  const disciplines = await db.discipline.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--surface)]">
      <div className="relative hidden lg:flex flex-col justify-between bg-[var(--brand-navy)] text-white p-12 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 80px, rgba(0,101,167,0.5) 80px 88px, transparent 88px 160px)",
          }}
        />
        <div className="relative z-10">
          <FX3Logo size={64} showTagline onDark />
        </div>
        <div className="relative z-10 space-y-4 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">احجز حصتك التجريبية مجاناً</h2>
          <p className="text-white/70 leading-relaxed">جرّب أي رياضة قتالية أو تمرين في FX3 قبل ما تشترك. هنتواصل معاك لتحديد أقرب ميعاد.</p>
        </div>
        <div className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} FX3 Fight & Fitness Centre</div>
      </div>

      <div className="flex flex-col">
        <div className="lg:hidden mb-4 flex justify-center bg-[var(--brand-navy)] px-6 py-8">
          <FX3Logo size={48} showTagline onDark />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            {sent === "1" ? (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold">تم استلام طلبك!</h1>
                <p className="text-[var(--muted)]">هيتصل بيك فريقنا قريب لتأكيد ميعاد حصتك التجريبية.</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight">احجز حصة تجريبية</h1>
                  <p className="text-[var(--muted)] mt-2 text-sm">خد بياناتك وهنتواصل معاك لتحديد الميعاد.</p>
                </div>
                <form action={submitTrialLead} className="space-y-4">
                  <div>
                    <Label>الاسم بالكامل *</Label>
                    <Input name="fullName" required />
                  </div>
                  <div>
                    <Label>رقم الهاتف *</Label>
                    <Input name="phone" required placeholder="01001234567" />
                  </div>
                  <div>
                    <Label>الرياضة المفضّلة</Label>
                    <Select name="preferredSport" defaultValue="">
                      <option value="">— اختر —</option>
                      {disciplines.map((d) => (
                        <option key={d.id} value={d.nameAr || d.name}>
                          {d.nameAr || d.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>الوقت المفضّل</Label>
                    <Input name="preferredTime" placeholder="مثال: مساءً بعد 6" />
                  </div>
                  <div>
                    <Label>ملاحظات (اختياري)</Label>
                    <Textarea name="message" rows={3} />
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    احجز الآن
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
