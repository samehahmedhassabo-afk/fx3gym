import { ArrowUp, ArrowDown } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { createExercise, updateExercise, toggleExercise, deleteExercise, moveExercise, listExercises } from "@/lib/actions/fitness-tests";
import { FITNESS_TEST_TYPES } from "@/lib/fitness-tests";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Select } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";

export default async function FitnessTestExercisesPage() {
  const session = await requirePermission("progress.edit");
  const { t, locale } = await getT();
  const exercises = await listExercises();

  return (
    <>
      <Header title={t.fitnessTests.manageExercises} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6 max-w-4xl">
        <form action={createExercise}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.fitnessTests.addExercise}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>{t.fitnessTests.testType} *</Label>
                <Select name="testType" defaultValue={FITNESS_TEST_TYPES[0].value}>
                  {FITNESS_TEST_TYPES.map((tt) => (
                    <option key={tt.value} value={tt.value}>
                      {locale === "ar" ? tt.labelAr : tt.labelEn}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t.fitnessTests.exerciseName} *</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>{t.fitnessTests.exerciseNameAr}</Label>
                <Input name="nameAr" />
              </div>
              <div>
                <Label>{t.fitnessTests.category}</Label>
                <Input name="category" />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button type="submit">{t.common.add}</Button>
              </div>
            </div>
          </Card>
        </form>

        {FITNESS_TEST_TYPES.map((type) => {
          const group = exercises.filter((e) => e.testType === type.value);
          return (
            <Card key={type.value}>
              <div className="p-5 border-b border-[var(--border)]">
                <h2 className="font-semibold">{locale === "ar" ? type.labelAr : type.labelEn}</h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {group.length === 0 ? (
                  <div className="p-8 text-center text-[var(--muted)]">{t.fitnessTests.noExercises}</div>
                ) : (
                  group.map((ex, idx) => (
                    <div key={ex.id} className="p-4 flex flex-wrap items-center gap-3">
                      <div className="flex flex-col">
                        <form action={moveExercise}>
                          <input type="hidden" name="id" value={ex.id} />
                          <input type="hidden" name="direction" value="up" />
                          <Button type="submit" variant="ghost" size="sm" disabled={idx === 0} title={t.common.previous}>
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                        </form>
                        <form action={moveExercise}>
                          <input type="hidden" name="id" value={ex.id} />
                          <input type="hidden" name="direction" value="down" />
                          <Button type="submit" variant="ghost" size="sm" disabled={idx === group.length - 1} title={t.common.next}>
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </form>
                      </div>
                      <form action={updateExercise.bind(null, ex.id)} className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[280px]">
                        <Input name="name" defaultValue={ex.name} required />
                        <Input name="nameAr" defaultValue={ex.nameAr ?? ""} placeholder={t.fitnessTests.exerciseNameAr} />
                        <div className="flex gap-2">
                          <Input name="category" defaultValue={ex.category ?? ""} placeholder={t.fitnessTests.category} />
                          <Button type="submit" size="sm" variant="outline">
                            {t.common.save}
                          </Button>
                        </div>
                      </form>
                      {!ex.isActive && <Badge variant="outline">{t.fitnessTests.hidden}</Badge>}
                      <div className="ms-auto flex items-center gap-2">
                        <form action={toggleExercise}>
                          <input type="hidden" name="id" value={ex.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            {ex.isActive ? t.common.inactive : t.common.active}
                          </Button>
                        </form>
                        <DeleteButton action={deleteExercise} id={ex.id} iconOnly />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </main>
    </>
  );
}
