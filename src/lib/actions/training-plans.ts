"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { currentTrainerId } from "@/lib/trainer-context";

export type WorkoutExercise = { name: string; sets?: string; reps: string; videoUrl?: string };

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.string().optional(),
  reps: z.string().min(1),
  videoUrl: z.string().url().optional().or(z.literal("")),
});

const planSchema = z.object({
  memberId: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().optional(),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1).max(12),
});

function parseExercisesFromForm(formData: FormData): WorkoutExercise[] {
  const names = formData.getAll("exerciseName") as string[];
  const sets = formData.getAll("exerciseSets") as string[];
  const reps = formData.getAll("exerciseReps") as string[];
  const links = formData.getAll("exerciseVideoUrl") as string[];
  const exercises: WorkoutExercise[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = (names[i] ?? "").trim();
    const rep = (reps[i] ?? "").trim();
    if (!name || !rep) continue;
    exercises.push({ name, sets: (sets[i] ?? "").trim() || undefined, reps: rep, videoUrl: (links[i] ?? "").trim() || undefined });
  }
  return exercises;
}

export async function createTrainingPlan(formData: FormData) {
  const session = await assertPermission("progress.create");
  const memberId = String(formData.get("memberId") ?? "");
  const exercises = parseExercisesFromForm(formData);
  const data = planSchema.parse({
    memberId,
    title: String(formData.get("title") ?? "برنامج تدريب اليوم"),
    goal: (formData.get("goal") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    exercises,
  });
  const trainerId = await currentTrainerId(session);
  await db.trainingPlan.create({
    data: {
      memberId: data.memberId,
      trainerId,
      title: data.title,
      goal: data.goal || null,
      notes: data.notes || null,
      exercises: JSON.stringify(data.exercises),
    },
  });
  revalidatePath(`/members/${data.memberId}`);
}

export async function updateTrainingPlan(id: string, formData: FormData) {
  await assertPermission("progress.edit");
  const memberId = String(formData.get("memberId") ?? "");
  const exercises = parseExercisesFromForm(formData);
  const data = planSchema.parse({
    memberId,
    title: String(formData.get("title") ?? "برنامج تدريب اليوم"),
    goal: (formData.get("goal") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    exercises,
  });
  await db.trainingPlan.update({
    where: { id },
    data: {
      title: data.title,
      goal: data.goal || null,
      notes: data.notes || null,
      exercises: JSON.stringify(data.exercises),
    },
  });
  revalidatePath(`/members/${data.memberId}`);
}

export async function deleteTrainingPlan(formData: FormData) {
  await assertPermission("progress.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing training plan id");
  const plan = await db.trainingPlan.delete({ where: { id } });
  revalidatePath(`/members/${plan.memberId}`);
}

export async function setTrainingPlanActive(formData: FormData) {
  await assertPermission("progress.edit");
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "on";
  const plan = await db.trainingPlan.update({ where: { id }, data: { isActive } });
  revalidatePath(`/members/${plan.memberId}`);
}
