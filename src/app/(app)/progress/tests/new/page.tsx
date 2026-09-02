import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createTestSession, listExercises } from "@/lib/actions/fitness-tests";
import { FITNESS_TEST_TYPES } from "@/lib/fitness-tests";
import { Header } from "@/components/header";
import { FitnessTestForm } from "@/components/fitness-test-form";

export default async function NewFitnessTestPage() {
  const session = await requirePermission("progress.create");
  const { t, locale } = await getT();
  const [members, exercises] = await Promise.all([db.member.findMany({ orderBy: { firstName: "asc" } }), listExercises()]);

  const exercisesByType: Record<string, { id: string; name: string; nameAr: string | null; category: string | null }[]> = {};
  for (const type of FITNESS_TEST_TYPES) {
    exercisesByType[type.value] = exercises.filter((e) => e.testType === type.value && e.isActive);
  }

  return (
    <>
      <Header title={t.fitnessTests.newTest} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <FitnessTestForm
          action={createTestSession}
          members={members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}`, sublabel: `${m.memberCode} — ${m.phone}` }))}
          exercisesByType={exercisesByType}
          locale={locale}
          defaultDate={new Date().toISOString().slice(0, 10)}
          labels={{
            member: t.members.name,
            testType: t.fitnessTests.testType,
            date: t.payments.date,
            notes: "Notes",
            exercise: t.fitnessTests.exercise,
            category: t.fitnessTests.category,
            reps: t.fitnessTests.reps,
            save: t.common.save,
            cancel: t.common.cancel,
          }}
          cancelHref="/progress/tests"
        />
      </main>
    </>
  );
}
