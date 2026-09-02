import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateTrainer } from "@/lib/actions/trainers";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea } from "@/components/ui/input";

export default async function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("trainers.edit");
  const { t, locale } = await getT();
  const { id } = await params;

  const [trainer, disciplines] = await Promise.all([
    db.trainer.findUnique({ where: { id }, include: { user: true } }),
    db.discipline.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!trainer) notFound();

  const selected = new Set(
    trainer.specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const action = updateTrainer.bind(null, id);

  return (
    <>
      <Header title={`${t.common.edit} ${t.classes.trainer}`} user={session} locale={locale} />
      <main className="p-4 sm:p-6 max-w-4xl mx-auto">
        <form action={action}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold text-lg">
                {t.common.edit} {t.classes.trainer}
              </h2>
            </div>
            <div className="p-5 space-y-6">
              <section>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-[var(--muted)]">
                  {locale === "ar" ? "حساب الدخول" : "Login Account"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t.members.name} *</Label>
                    <Input name="fullName" required defaultValue={trainer.user.fullName} placeholder="Coach Mohamed" />
                  </div>
                  <div>
                    <Label>{t.members.phone}</Label>
                    <Input name="phone" defaultValue={trainer.user.phone ?? ""} placeholder="01001234567" />
                  </div>
                </div>
              </section>
              <section>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-[var(--muted)]">
                  {locale === "ar" ? "بيانات المدرب" : "Trainer Profile"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>
                      {t.classes.discipline} * <span className="text-[var(--muted)] font-normal">(اختر واحدة أو أكتر)</span>
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                      {disciplines.map((d) => (
                        <label key={d.id} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--surface)] rounded-md p-2 transition-colors">
                          <input
                            type="checkbox"
                            name="specialties"
                            value={d.name}
                            defaultChecked={selected.has(d.name) || (!!d.legacyKey && selected.has(d.legacyKey))}
                            className="w-4 h-4 accent-[var(--primary)]"
                          />
                          <span className="text-sm">
                            {d.name} <span className="text-[var(--muted)] text-xs">{d.nameAr}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>{locale === "ar" ? "سنوات الخبرة" : "Years of Experience"}</Label>
                    <Input name="yearsExperience" type="number" min="0" defaultValue={trainer.yearsExperience ?? ""} />
                  </div>
                  <div>
                    <Label>{locale === "ar" ? "أجر الساعة (EGP)" : "Hourly Rate (EGP)"}</Label>
                    <Input name="hourlyRate" type="number" step="0.01" defaultValue={trainer.hourlyRate ?? ""} />
                  </div>
                  <div>
                    <Label>{locale === "ar" ? "العمولة %" : "Commission %"}</Label>
                    <Input name="commissionPct" type="number" step="0.1" defaultValue={trainer.commissionPct ?? ""} placeholder="50" />
                  </div>
                  <div>
                    <Label>{locale === "ar" ? "الشهادات" : "Certifications"}</Label>
                    <Input name="certifications" defaultValue={trainer.certifications ?? ""} placeholder="IBF Level 2, MMA Cert…" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>{locale === "ar" ? "نبذة" : "Bio"}</Label>
                    <Textarea name="bio" rows={3} defaultValue={trainer.bio ?? ""} placeholder={locale === "ar" ? "خبرات ومسيرة الكابتن…" : "Background and bio…"} />
                  </div>
                </div>
              </section>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/trainers">
                <Button variant="outline" type="button">
                  {t.common.cancel}
                </Button>
              </Link>
              <Button type="submit">{t.common.save}</Button>
            </div>
          </Card>
        </form>
      </main>
    </>
  );
}
