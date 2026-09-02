import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteTrainer } from "@/lib/actions/trainers";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";

export default async function TrainersPage() {
  const session = await requirePermission("trainers.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();

  const trainers = await db.trainer.findMany({
    where: { isActive: true },
    include: {
      user: true,
      _count: { select: { trainingPlans: true } },
      classSchedules: { select: { id: true } },
    },
  });

  return (
    <>
      <Header title={t.nav.trainers} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--muted)]">
            {trainers.length} {locale === "ar" ? "كابتن نشط" : "active trainers"}
          </div>
          <Link href="/trainers/new">
            <Button>
              <Plus className="w-4 h-4" />
              {locale === "ar" ? "إضافة كابتن" : "Add Trainer"}
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.length === 0 ? (
            <Card className="p-10 col-span-full text-center">
              <Dumbbell className="w-10 h-10 mx-auto text-[var(--muted)]" />
              <p className="mt-3 text-[var(--muted)]">{locale === "ar" ? "لا يوجد مدربين بعد" : "No trainers yet"}</p>
              <Link href="/trainers/new" className="inline-block mt-4">
                <Button>
                  <Plus className="w-4 h-4" />
                  {locale === "ar" ? "أضف أول كابتن" : "Add your first trainer"}
                </Button>
              </Link>
            </Card>
          ) : (
            trainers.map((tr) => {
              const scheduleCount = tr.classSchedules?.length ?? 0;
              return (
                <Card key={tr.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xl font-bold">
                      {tr.user.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{tr.user.fullName}</h3>
                      <p className="text-xs text-[var(--muted)] truncate">{tr.user.phone ?? tr.user.username}</p>
                      {tr.yearsExperience !== null && tr.yearsExperience > 0 && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {tr.yearsExperience} {locale === "ar" ? "سنة خبرة" : "yrs exp"}
                        </p>
                      )}
                    </div>
                  </div>
                  {tr.bio && <p className="text-sm mt-3 text-[var(--muted)] line-clamp-3">{tr.bio}</p>}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {tr.specialties
                      .split(",")
                      .filter(Boolean)
                      .map((s) => (
                        <Badge key={s} variant="outline">
                          {s.trim()}
                        </Badge>
                      ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-2 text-xs text-center">
                    <div>
                      <div className="font-bold text-base">{scheduleCount}</div>
                      <div className="text-[var(--muted)]">{locale === "ar" ? "جداول" : "Schedules"}</div>
                    </div>
                    <div>
                      <div className="font-bold text-base">{tr._count.trainingPlans}</div>
                      <div className="text-[var(--muted)]">{locale === "ar" ? "خطط" : "Plans"}</div>
                    </div>
                    <div>
                      <div className="font-bold text-base">{tr.commissionPct ?? "—"}%</div>
                      <div className="text-[var(--muted)]">{locale === "ar" ? "عمولة" : "Comm."}</div>
                    </div>
                  </div>
                  {(perms.has("trainers.edit") || perms.has("trainers.delete")) && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
                      {perms.has("trainers.edit") && (
                        <Link href={`/trainers/${tr.id}/edit`}>
                          <Button variant="outline" size="sm">
                            {t.common.edit}
                          </Button>
                        </Link>
                      )}
                      {perms.has("trainers.delete") && <DeleteButton action={deleteTrainer} id={tr.id} iconOnly />}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
