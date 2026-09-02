import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateTestSession, listExercises } from "@/lib/actions/fitness-tests";
import { Header } from "@/components/header";
import { FitnessTestForm } from "@/components/fitness-test-form";

export default async function EditFitnessTestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("progress.edit");
  const { t, locale } = await getT();
  const { id } = await params;

  const testSession = await db.fitnessTestSession.findUnique({
    where: { id },
    include: { member: true, results: true },
  });
  if (!testSession) notFound();

  const exercises = await listExercises(testSession.testType);
  // Keep any exercise the session already scored even if it was later hidden,
  // so past results stay visible and editable.
  const resultExerciseIds = new Set(testSession.results.map((r) => r.exerciseId));
  const visible = exercises.filter((e) => e.isActive || resultExerciseIds.has(e.id));

  const defaultReps: Record<string, number> = {};
  for (const r of testSession.results) defaultReps[r.exerciseId] = r.reps;

  const action = updateTestSession.bind(null, id);

  return (
    <>
      <Header title={t.common.edit} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <FitnessTestForm
          action={action}
          members={[]}
          exercisesByType={{ [testSession.testType]: visible }}
          locale={locale}
          defaultTestType={testSession.testType}
          defaultDate={testSession.date.toISOString().slice(0, 10)}
          defaultNotes={testSession.notes ?? ""}
          defaultReps={defaultReps}
          lockMember
          lockType
          memberName={`${testSession.member.firstName} ${testSession.member.lastName}`}
          defaultMemberId={testSession.memberId}
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
