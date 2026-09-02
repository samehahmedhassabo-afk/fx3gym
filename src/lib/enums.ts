import { z } from "zod";

export const PaymentMethod = z.enum(["CASH", "CARD", "INSTAPAY", "VODAFONE_CASH", "BANK_TRANSFER", "OTHER"]);
export const PaymentType = z.enum(["SUBSCRIPTION", "PERSONAL_TRAINING", "PRODUCT_SALE", "REGISTRATION_FEE", "AREA_RENTAL", "OTHER"]);
export const DuePayerType = z.enum(["MEMBER", "TRAINER", "EMPLOYEE"]);
export const DueCategory = z.enum(["SUBSCRIPTION_BALANCE", "TRAINER_RENTAL", "SALARY_ADVANCE", "OTHER"]);
export const DueStatus = z.enum(["PENDING", "PAID", "CANCELLED"]);
export const PlanType = z.enum(["GYM", "CLASSES", "COMBO", "PERSONAL_TRAINING"]);
export const DisciplineKey = z.enum([
  "BOXING",
  "MUAY_THAI",
  "MMA",
  "BJJ",
  "KICKBOXING",
  "WRESTLING",
  "KARATE",
  "TAEKWONDO",
  "CROSSFIT",
  "STRENGTH",
  "CARDIO",
  "YOGA",
  "OTHER",
]);
export const EmploymentType = z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR", "COMMISSION_ONLY"]);
export const TaskCategory = z.enum([
  "COACH_ATTENDANCE",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "EDITING",
  "SOCIAL_MEDIA",
  "RECEPTIONIST",
  "STEWARD",
]);
export const TaskStatus = z.enum(["PENDING", "DONE", "MISSED", "PRESENT", "ABSENT", "LATE"]);
export const FitnessTestType = z.enum(["UPPER_BODY", "LOWER_BODY", "CORE", "FULL_BODY"]);
export const NotificationChannel = z.enum(["WHATSAPP", "SMS", "EMAIL", "IN_APP"]);
export const NotificationType = z.enum([
  "SUBSCRIPTION_EXPIRY",
  "CLASS_REMINDER",
  "PAYMENT_DUE",
  "WELCOME",
  "PROMOTIONAL",
  "BIRTHDAY",
  "OTHER",
]);

export function parseLocalDate(value: unknown): Date | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
}

export function parseLocalDateTime(value: unknown): Date | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function safeInt(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}
