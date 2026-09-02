"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/auth";
import { allPermissionKeys } from "@/lib/permissions";

const RoleEnum = z.enum(["ADMIN", "RECEPTIONIST", "TRAINER"]);

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().optional().nullable(),
  role: RoleEnum,
  password: z.string().min(6),
});

const updateUserSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().optional().nullable(),
  role: RoleEnum,
});

const changePasswordSchema = z.object({ id: z.string().min(1), password: z.string().min(6) });

async function assertNotLastAdmin(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN" || !user.isActive) return;
  const otherAdmins = await db.user.count({ where: { role: "ADMIN", isActive: true, NOT: { id: userId } } });
  if (otherAdmins === 0) throw new Error("You cannot remove the last admin");
}

export async function createUser(formData: FormData) {
  await assertAdmin();
  const data = createUserSchema.parse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    phone: (formData.get("phone") as string) || null,
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (await db.user.findUnique({ where: { username: data.username } })) {
    throw new Error("Username already taken");
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.user.create({
    data: { username: data.username, fullName: data.fullName, phone: data.phone || null, role: data.role, passwordHash },
  });
  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(formData: FormData) {
  const session = await assertAdmin();
  const data = updateUserSchema.parse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    phone: (formData.get("phone") as string) || null,
    role: formData.get("role"),
  });
  const existing = await db.user.findUnique({ where: { id: data.id } });
  if (!existing) throw new Error("User not found");
  if (existing.role === "ADMIN" && data.role !== "ADMIN" && existing.isActive) {
    await assertNotLastAdmin(existing.id);
  }
  if (existing.id === session.userId && data.role !== "ADMIN") {
    throw new Error("You cannot remove the last admin");
  }
  await db.user.update({ where: { id: data.id }, data: { fullName: data.fullName, phone: data.phone || null, role: data.role } });
  revalidatePath("/users");
  revalidatePath(`/users/${data.id}`);
  redirect("/users");
}

export async function updateUserPermissions(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing user id");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");

  if (user.role === "ADMIN" || formData.get("useDefaults") === "on") {
    await db.user.update({ where: { id }, data: { permissions: null } });
    revalidatePath(`/users/${id}`);
    redirect(`/users/${id}`);
  }

  const validKeys = new Set(allPermissionKeys());
  const selected = formData
    .getAll("perm")
    .map(String)
    .filter((p) => validKeys.has(p));
  await db.user.update({ where: { id }, data: { permissions: JSON.stringify(selected) } });
  revalidatePath(`/users/${id}`);
  redirect(`/users/${id}`);
}

export async function changeUserPassword(formData: FormData) {
  await assertAdmin();
  const data = changePasswordSchema.parse({ id: formData.get("id"), password: formData.get("password") });
  if (!(await db.user.findUnique({ where: { id: data.id } }))) throw new Error("User not found");
  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.user.update({ where: { id: data.id }, data: { passwordHash } });
  revalidatePath(`/users/${data.id}`);
  redirect(`/users/${data.id}`);
}

export async function toggleUserActive(formData: FormData) {
  const session = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing user id");
  if (id === session.userId) throw new Error("You cannot deactivate your own account");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");
  if (user.isActive && user.role === "ADMIN") await assertNotLastAdmin(id);
  await db.user.update({ where: { id }, data: { isActive: !user.isActive } });
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
}

export async function deleteUser(formData: FormData) {
  const session = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing user id");
  if (id === session.userId) throw new Error("You cannot delete your own account");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");
  if (user.role === "ADMIN") await assertNotLastAdmin(id);

  const [paymentCount, saleCount, checkinCount, auditCount, trainer] = await Promise.all([
    db.payment.count({ where: { recordedById: id } }),
    db.sale.count({ where: { soldById: id } }),
    db.attendance.count({ where: { checkedById: id } }),
    db.auditLog.count({ where: { userId: id } }),
    db.trainer.findUnique({ where: { userId: id } }),
  ]);

  if (paymentCount + saleCount + checkinCount + auditCount > 0 || trainer) {
    await db.user.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.user.delete({ where: { id } });
  }
  revalidatePath("/users");
  redirect("/users");
}
