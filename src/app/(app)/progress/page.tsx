import Link from "next/link";
import { Plus, Edit, Dumbbell } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteMeasurement } from "@/lib/actions/progress";
import { formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function ProgressPage() {
  const session = await requirePermission("progress.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();
  const measurements = await db.measurement.findMany({ orderBy: { date: "desc" }, take: 50, include: { member: true } });

  return (
    <>
      <Header title={t.progress.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-[var(--brand-blue)]" />
            </div>
            <div>
              <h2 className="font-semibold">{t.fitnessTests.title}</h2>
              <p className="text-xs text-[var(--muted)]">{t.fitnessTests.subtitle}</p>
            </div>
          </div>
          <Link href="/progress/tests">
            <Button variant="secondary">{t.fitnessTests.title}</Button>
          </Link>
        </Card>

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-semibold">{t.progress.measurements}</h2>
            <Link href="/progress/new">
              <Button>
                <Plus className="w-4 h-4" /> {t.common.add}
              </Button>
            </Link>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.members.name}</TH>
                <TH>{t.progress.weight}</TH>
                <TH>{t.progress.bodyFat}</TH>
                <TH>{t.progress.muscle}</TH>
                <TH>{t.payments.date}</TH>
                <TH>{t.common.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {measurements.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                measurements.map((m) => (
                  <TR key={m.id}>
                    <TD label={t.members.name}>
                      <Link href={`/members/${m.memberId}`} className="hover:text-[var(--primary)]">
                        {m.member.firstName} {m.member.lastName}
                      </Link>
                    </TD>
                    <TD label={t.progress.weight}>{m.weightKg ?? "—"}</TD>
                    <TD label={t.progress.bodyFat}>{m.bodyFatPct ?? "—"}</TD>
                    <TD label={t.progress.muscle}>{m.musclePct ?? "—"}</TD>
                    <TD label={t.payments.date} className="text-xs text-[var(--muted)]">{formatDate(m.date)}</TD>
                    <TD label={t.common.actions}>
                      <div className="flex items-center gap-1">
                        {perms.has("progress.edit") && (
                          <Link href={`/progress/${m.id}/edit`}>
                            <Button variant="ghost" size="sm" title={t.common.edit}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                        {perms.has("progress.delete") && <DeleteButton action={deleteMeasurement} id={m.id} iconOnly />}
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
