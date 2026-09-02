import Link from "next/link";
import { Plus, Edit, Settings } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteTestSession } from "@/lib/actions/fitness-tests";
import { fitnessTestTypeLabel } from "@/lib/fitness-tests";
import { formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function FitnessTestsPage() {
  const session = await requirePermission("progress.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();
  const sessions = await db.fitnessTestSession.findMany({
    orderBy: { date: "desc" },
    take: 50,
    include: { member: true, results: true },
  });

  return (
    <>
      <Header title={t.fitnessTests.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card>
          <div className="p-5 border-b border-[var(--border)] flex flex-wrap justify-between items-center gap-2">
            <div>
              <h2 className="font-semibold">{t.fitnessTests.title}</h2>
              <p className="text-xs text-[var(--muted)] mt-1">{t.fitnessTests.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {perms.has("progress.edit") && (
                <Link href="/progress/tests/exercises">
                  <Button variant="outline">
                    <Settings className="w-4 h-4" /> {t.fitnessTests.manageExercises}
                  </Button>
                </Link>
              )}
              {perms.has("progress.create") && (
                <Link href="/progress/tests/new">
                  <Button>
                    <Plus className="w-4 h-4" /> {t.fitnessTests.newTest}
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.members.name}</TH>
                <TH>{t.fitnessTests.testType}</TH>
                <TH>{t.fitnessTests.totalReps}</TH>
                <TH>{t.payments.date}</TH>
                <TH>{t.common.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {sessions.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                sessions.map((s) => {
                  const totalReps = s.results.reduce((sum, r) => sum + r.reps, 0);
                  return (
                    <TR key={s.id}>
                      <TD label={t.members.name}>
                        <Link href={`/members/${s.memberId}`} className="hover:text-[var(--primary)]">
                          {s.member.firstName} {s.member.lastName}
                        </Link>
                      </TD>
                      <TD label={t.fitnessTests.testType}>
                        <Badge variant="outline">{fitnessTestTypeLabel(s.testType, locale)}</Badge>
                      </TD>
                      <TD label={t.fitnessTests.totalReps} className="font-semibold">
                        {totalReps}
                      </TD>
                      <TD label={t.payments.date} className="text-xs text-[var(--muted)]">
                        {formatDate(s.date)}
                      </TD>
                      <TD label={t.common.actions}>
                        <div className="flex items-center gap-1">
                          {perms.has("progress.edit") && (
                            <Link href={`/progress/tests/${s.id}/edit`}>
                              <Button variant="ghost" size="sm" title={t.common.edit}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          {perms.has("progress.delete") && <DeleteButton action={deleteTestSession} id={s.id} iconOnly />}
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
