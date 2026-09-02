"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { nextMemberCode } from "@/lib/sequences";
import { queueChangeForApproval } from "@/lib/approvals-internal";

const memberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z.string().optional(),
  nationalId: z.string().optional(),
  address: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  medicalNotes: z.string().optional(),
  goals: z.string().optional(),
  comments: z.string().optional(),
  referralSource: z.string().optional(),
  referredByPhone: z.string().optional(),
  joinedAt: z.string().optional(),
  photoUrl: z.string().optional(),
});

/** Resolves a phone number to the referring member's id, ignoring self-referral and unknown numbers. */
export async function resolveReferredByMemberId(phone: string | undefined, excludeId?: string): Promise<string | null> {
  const trimmed = phone?.trim();
  if (!trimmed) return null;
  const referrer = await db.member.findUnique({ where: { phone: trimmed }, select: { id: true } });
  if (!referrer || referrer.id === excludeId) return null;
  return referrer.id;
}

/** Redirects back to the new-member form with entered values preserved, instead of crashing to the error page. */
function redirectDuplicatePhone(data: { firstName: string; lastName: string; phone: string }, leadId: string | null): never {
  const params = new URLSearchParams({ dupPhone: "1", firstName: data.firstName, lastName: data.lastName, phone: data.phone });
  if (leadId) params.set("leadId", leadId);
  redirect(`/members/new?${params}`);
}

export async function createMember(formData: FormData) {
  await assertPermission("members.create");
  const data = memberSchema.parse(Object.fromEntries(formData));
  const leadId = String(formData.get("leadId") ?? "").trim() || null;

  const existingPhone = await db.member.findUnique({ where: { phone: data.phone }, select: { id: true } });
  if (existingPhone) redirectDuplicatePhone(data, leadId);

  const memberCode = await nextMemberCode();
  const referredByMemberId = await resolveReferredByMemberId(data.referredByPhone);
  let member;
  try {
    member = await db.member.create({
      data: {
        memberCode,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || null,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        nationalId: data.nationalId || null,
        address: data.address || null,
        emergencyName: data.emergencyName || null,
        emergencyPhone: data.emergencyPhone || null,
        medicalNotes: data.medicalNotes || null,
        goals: data.goals || null,
        comments: data.comments || null,
        referralSource: data.referralSource || null,
        referredByMemberId,
        photoUrl: data.photoUrl || null,
        ...(data.joinedAt ? { joinedAt: new Date(data.joinedAt) } : {}),
      },
    });
  } catch (cause: unknown) {
    // Race: another reception created a member with this phone between our
    // check above and this insert. Same recovery — back to the form, not the error page.
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "P2002") {
      redirectDuplicatePhone(data, leadId);
    }
    throw cause;
  }
  if (leadId) {
    await db.trialLead.update({ where: { id: leadId }, data: { status: "CONVERTED", convertedMemberId: member.id } }).catch(() => {});
  }
  revalidatePath("/members");
  revalidatePath("/leads");
  redirect(`/members/${member.id}`);
}

export async function updateMember(id: string, formData: FormData) {
  const session = await assertPermission("members.edit");
  const data = memberSchema.parse(Object.fromEntries(formData));

  if (session.role !== "ADMIN") {
    const existing = await db.member.findUnique({ where: { id } });
    if (!existing) throw new Error("Member not found");
    await queueChangeForApproval({
      entity: "MEMBER",
      entityId: id,
      action: "EDIT",
      payload: data,
      previousValues: existing,
      requestedById: session.userId,
      label: `${existing.firstName} ${existing.lastName}`,
    });
    revalidatePath(`/members/${id}`);
    redirect(`/members/${id}?submitted=1`);
  }

  const referredByMemberId = await resolveReferredByMemberId(data.referredByPhone, id);
  await db.member.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email || null,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      nationalId: data.nationalId || null,
      address: data.address || null,
      emergencyName: data.emergencyName || null,
      emergencyPhone: data.emergencyPhone || null,
      medicalNotes: data.medicalNotes || null,
      goals: data.goals || null,
      comments: data.comments || null,
      referralSource: data.referralSource || null,
      referredByMemberId,
      photoUrl: data.photoUrl || null,
      ...(data.joinedAt ? { joinedAt: new Date(data.joinedAt) } : {}),
    },
  });
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}`);
}

export async function updateMemberCode(formData: FormData) {
  await assertPermission("members.edit");
  const id = String(formData.get("id") ?? "");
  const newCode = String(formData.get("memberCode") ?? "").trim();
  if (!id) throw new Error("Missing member id");
  if (!newCode) redirect(`/members/${id}?toast=code_invalid`);

  const existing = await db.member.findUnique({ where: { memberCode: newCode }, select: { id: true } });
  if (existing && existing.id !== id) redirect(`/members/${id}?toast=code_duplicate`);

  try {
    await db.member.update({ where: { id }, data: { memberCode: newCode } });
  } catch (cause: unknown) {
    // Race: someone else claimed this code between our check above and this update.
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "P2002") {
      redirect(`/members/${id}?toast=code_duplicate`);
    }
    throw cause;
  }
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}?toast=code_updated`);
}

export async function deleteMember(formData: FormData) {
  const session = await assertPermission("members.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing member id");

  if (session.role !== "ADMIN") {
    const existing = await db.member.findUnique({ where: { id } });
    if (!existing) throw new Error("Member not found");
    await queueChangeForApproval({
      entity: "MEMBER",
      entityId: id,
      action: "DELETE",
      payload: null,
      previousValues: existing,
      requestedById: session.userId,
      label: `${existing.firstName} ${existing.lastName}`,
    });
    revalidatePath(`/members/${id}`);
    redirect(`/members/${id}?submitted=1`);
  }

  try {
    await db.member.delete({ where: { id } });
  } catch {
    await db.member.update({ where: { id }, data: { status: "CANCELLED" } });
  }
  revalidatePath("/members");
  redirect("/members");
}
