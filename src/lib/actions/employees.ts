"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { EmploymentType, parseLocalDate, parseLocalDateTime, safeNumber } from "@/lib/enums";

const employeeSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  position: z.string().min(1),
  employmentType: EmploymentType.default("FULL_TIME"),
  baseSalary: z.coerce.number().nonnegative().default(0),
  hourlyRate: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  taskCategory: z.string().optional().nullable(),
});

function periodLabel(start: Date, end: Date) {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(start)} → ${fmt(end)}`;
}

export async function createEmployee(formData: FormData) {
  await assertPermission("employees.create");
  const data = employeeSchema.parse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || null,
    position: formData.get("position"),
    employmentType: formData.get("employmentType") || "FULL_TIME",
    baseSalary: formData.get("baseSalary") || "0",
    hourlyRate: formData.get("hourlyRate") || undefined,
    notes: (formData.get("notes") as string) || null,
    taskCategory: (formData.get("taskCategory") as string) || null,
  });
  await db.employee.create({
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      position: data.position,
      employmentType: data.employmentType,
      baseSalary: data.baseSalary,
      hourlyRate: data.hourlyRate ?? null,
      notes: data.notes || null,
      taskCategory: data.taskCategory || null,
    },
  });
  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployee(id: string, formData: FormData) {
  await assertPermission("employees.edit");
  const data = employeeSchema.parse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || null,
    position: formData.get("position"),
    employmentType: formData.get("employmentType") || "FULL_TIME",
    baseSalary: formData.get("baseSalary") || "0",
    hourlyRate: formData.get("hourlyRate") || undefined,
    notes: (formData.get("notes") as string) || null,
    taskCategory: (formData.get("taskCategory") as string) || null,
  });
  await db.employee.update({
    where: { id },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      position: data.position,
      employmentType: data.employmentType,
      baseSalary: data.baseSalary,
      hourlyRate: data.hourlyRate ?? null,
      notes: data.notes || null,
      taskCategory: data.taskCategory || null,
    },
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}/edit`);
  redirect("/employees");
}

export async function deleteEmployee(formData: FormData) {
  await assertPermission("employees.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Employee id is required");
  try {
    await db.employee.delete({ where: { id } });
  } catch {
    await db.employee.update({ where: { id }, data: { isActive: false } });
  }
  revalidatePath("/employees");
  redirect("/employees");
}

export async function createPayroll(formData: FormData) {
  await assertPermission("payroll.create");
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) throw new Error("Employee is required");
  const periodStart = parseLocalDate(formData.get("periodStart"));
  const periodEnd = parseLocalDate(formData.get("periodEnd"));
  if (!periodStart || !periodEnd) throw new Error("Invalid period dates");
  if (periodEnd < periodStart) throw new Error("Period end is before start");

  const baseSalary = Math.max(0, safeNumber(formData.get("baseSalary")));
  const bonus = Math.max(0, safeNumber(formData.get("bonus")));
  const commission = Math.max(0, safeNumber(formData.get("commission")));
  const deductions = Math.max(0, safeNumber(formData.get("deductions")));
  const netPay = Math.max(0, baseSalary + bonus + commission - deductions);
  const markPaidValues = formData.getAll("markPaid").map(String);
  const paid = markPaidValues.includes("on") || markPaidValues.length === 0;
  const paidAt = paid ? new Date() : null;
  const applyTaskAdjustmentsForEmployeeId = String(formData.get("applyTaskAdjustmentsForEmployeeId") ?? "");

  await db.$transaction(async (tx) => {
    const payroll = await tx.payroll.create({
      data: {
        employeeId,
        periodStart,
        periodEnd,
        baseSalary,
        bonus,
        commission,
        deductions,
        netPay,
        paid,
        paidAt,
        notes: (formData.get("notes") as string) || null,
      },
    });
    if (applyTaskAdjustmentsForEmployeeId && applyTaskAdjustmentsForEmployeeId === employeeId) {
      await tx.staffTask.updateMany({
        where: { employeeId, appliedPayrollId: null, OR: [{ bonusAmount: { gt: 0 } }, { deductionAmount: { gt: 0 } }] },
        data: { appliedPayrollId: payroll.id },
      });
    }
    if (paid) {
      const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { fullName: true } });
      await tx.expense.create({
        data: {
          category: "رواتب",
          amount: netPay,
          description: `راتب ${employee?.fullName ?? ""} — ${periodLabel(periodStart, periodEnd)}`,
          paidAt: paidAt ?? new Date(),
          payrollId: payroll.id,
        },
      });
    }
  });
  revalidatePath("/payroll");
  redirect("/payroll");
}

export async function updatePayroll(id: string, formData: FormData) {
  await assertPermission("payroll.edit");
  const baseSalary = Math.max(0, safeNumber(formData.get("baseSalary")));
  const bonus = Math.max(0, safeNumber(formData.get("bonus")));
  const commission = Math.max(0, safeNumber(formData.get("commission")));
  const deductions = Math.max(0, safeNumber(formData.get("deductions")));
  const netPay = Math.max(0, baseSalary + bonus + commission - deductions);
  const paid = formData.get("paid") === "on" || formData.get("paid") === "true";
  const paidAtInput = parseLocalDateTime(formData.get("paidAt"));
  const paidAt = paid ? (paidAtInput ?? new Date()) : null;

  await db.$transaction(async (tx) => {
    const payroll = await tx.payroll.update({
      where: { id },
      data: {
        baseSalary,
        bonus,
        commission,
        deductions,
        netPay,
        paid,
        paidAt,
        notes: (formData.get("notes") as string) || null,
      },
      select: { id: true, employeeId: true, periodStart: true, periodEnd: true, employee: { select: { fullName: true } } },
    });
    const existingExpense = await tx.expense.findUnique({ where: { payrollId: id }, select: { id: true } });

    if (paid) {
      const description = `راتب ${payroll.employee?.fullName ?? ""} — ${periodLabel(payroll.periodStart, payroll.periodEnd)}`;
      if (existingExpense) {
        await tx.expense.update({ where: { payrollId: id }, data: { category: "رواتب", amount: netPay, description, paidAt: paidAt ?? new Date() } });
      } else {
        await tx.expense.create({ data: { category: "رواتب", amount: netPay, description, paidAt: paidAt ?? new Date(), payrollId: id } });
      }
    } else if (existingExpense) {
      await tx.expense.delete({ where: { payrollId: id } });
    }
  });
  revalidatePath("/payroll");
  redirect("/payroll");
}

export async function deletePayroll(formData: FormData) {
  await assertPermission("payroll.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Payroll id is required");
  await db.payroll.delete({ where: { id } });
  revalidatePath("/payroll");
  redirect("/payroll");
}
