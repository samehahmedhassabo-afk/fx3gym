import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const BACKUP_ORDER = [
  "user",
  "member",
  "discipline",
  "fitnessTestExercise",
  "product",
  "employee",
  "setting",
  "messageTemplate",
  "auditLog",
  "trainer",
  "cashierSession",
  "classSchedule",
  "subscriptionPlan",
  "subscription",
  "attendance",
  "sale",
  "saleItem",
  "trainingPlan",
  "measurement",
  "fitnessTestSession",
  "fitnessTestResult",
  "employeeAttendance",
  "payroll",
  "staffTask",
  "voucher",
  "equipment",
  "equipmentMaintenance",
  "payment",
  "duePayment",
  "areaRental",
  "expense",
  "notification",
  "loyaltyTier",
  "loyaltyAccount",
  "loyaltyTransaction",
  "loyaltyReward",
  "pendingChange",
  "adminNotification",
  "trialLead",
  "nutritionPlan",
  "feedback",
  "historicalRevenue",
  "taskTemplate",
  "taskCompletion",
] as const;

const BACKUP_MAGIC = "FX3_BACKUP";

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "joinedAt",
  "dateOfBirth",
  "date",
  "startDate",
  "endDate",
  "freezeStart",
  "freezeEnd",
  "startTime",
  "endTime",
  "checkInTime",
  "checkOutTime",
  "checkIn",
  "checkOut",
  "paidAt",
  "hireDate",
  "periodStart",
  "periodEnd",
  "bookedAt",
  "sentAt",
  "scheduledFor",
  "refundedAt",
  "openedAt",
  "closedAt",
  "startsOn",
  "endsOn",
  "offerEndsAt",
  "validFrom",
  "validUntil",
  "purchaseDate",
  "expiryDate",
  "lastMaintenanceAt",
  "performedAt",
  "dueDate",
  "remindedAt",
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function reviveDates(row: Record<string, unknown>) {
  const revived: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    revived[key] = DATE_FIELDS.has(key) && typeof value === "string" && ISO_DATE_RE.test(value) ? new Date(value) : value;
  }
  return revived;
}

// Older backups can predate a field rename (Prisma client field vs. its old
// name before a `@map` was added) or carry columns that no longer exist.
// `checkedById` used to be the field's own name; it's now mapped from the
// DB column "checkedInById" — old exports still use that as the key.
const FIELD_ALIASES: Record<string, Record<string, string>> = {
  attendance: { checkedInById: "checkedById" },
};

const scalarFieldCache = new Map<string, Set<string>>();

function scalarFieldsFor(model: string): Set<string> {
  const cached = scalarFieldCache.get(model);
  if (cached) return cached;
  const pascalName = model.charAt(0).toUpperCase() + model.slice(1);
  const dmmfModel = Prisma.dmmf.datamodel.models.find((m) => m.name === pascalName);
  const fields = new Set(dmmfModel ? dmmfModel.fields.filter((f) => f.kind !== "object").map((f) => f.name) : []);
  scalarFieldCache.set(model, fields);
  return fields;
}

// Legacy collections that were fully removed from the schema. We don't attempt
// to import them; if they're present in an old backup we skip them so the
// restore can proceed instead of failing on missing models.
const LEGACY_IGNORED_COLLECTIONS = new Set(["class", "classBooking"]);

// A backup made against an older schema version can contain renamed or
// removed columns. Rename known aliases and drop anything that isn't a
// scalar field on the current model, so schema drift doesn't fail the
// entire restore with a Prisma "unknown argument" error.
function sanitizeRow(model: string, row: Record<string, unknown>): Record<string, unknown> {
  const aliases = FIELD_ALIASES[model] ?? {};
  const allowed = scalarFieldsFor(model);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const mappedKey = aliases[key] ?? key;
    if (allowed.has(mappedKey)) out[mappedKey] = value;
  }
  return out;
}

export interface BackupFile {
  magic: string;
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  data: Record<string, Record<string, unknown>[]>;
}

export async function exportDatabase(): Promise<BackupFile> {
  const data: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};
  for (const model of BACKUP_ORDER) {
    if (LEGACY_IGNORED_COLLECTIONS.has(model)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any)[model].findMany();
    data[model] = rows;
    counts[model] = rows.length;
  }
  return { magic: BACKUP_MAGIC, version: 1, exportedAt: new Date().toISOString(), counts, data };
}

export function isValidBackup(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false;
  const file = value as BackupFile;
  if (file.magic !== BACKUP_MAGIC || typeof file.data !== "object" || file.data === null) return false;
  const known = Object.keys(file.data).filter((k) => BACKUP_ORDER.includes(k as (typeof BACKUP_ORDER)[number]));
  if (known.length === 0) return false;
  const hasIgnoredLegacy = Object.keys(file.data).some((k) => LEGACY_IGNORED_COLLECTIONS.has(k));
  return true;
}

export class BackupImportError extends Error {
  constructor(
    public readonly stage: "delete" | "insert",
    public readonly model: string,
    public readonly cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Backup import failed during ${stage} of "${model}": ${reason}`);
  }
}

export async function dryRunImport(file: BackupFile): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const model of BACKUP_ORDER) {
    const rows = (file.data[model] ?? []).map((row) => reviveDates(sanitizeRow(model, row)));
    counts[model] = rows.length;
  }
  return counts;
}

const BATCH_SIZE = 50;

async function batchCreate(tx: any, model: string, rows: Record<string, unknown>[]) {
  const hasCreatedAt = scalarFieldsFor(model).has("createdAt");
  const hasUpdatedAt = scalarFieldsFor(model).has("updatedAt");
  const now = new Date();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
      ...row,
      ...(hasCreatedAt && row.createdAt == null ? { createdAt: now } : {}),
      ...(hasUpdatedAt && row.updatedAt == null ? { updatedAt: now } : {}),
    }));
    try {
      await tx[model].createMany({ data: batch });
    } catch (cause) {
      throw new BackupImportError("insert", model, cause);
    }
  }
}

export async function importDatabase(file: BackupFile): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  try {
    await db.$transaction(
      async (tx) => {
        for (const model of [...BACKUP_ORDER].reverse()) {
          try {
            await (tx as any)[model].deleteMany({});
          } catch (cause) {
            throw new BackupImportError("delete", model, cause);
          }
        }
        for (const model of BACKUP_ORDER) {
          const rows = (file.data[model] ?? []).map((row) => reviveDates(sanitizeRow(model, row)));
          if (model === "attendance") {
            for (const row of rows) {
              if ("checkedInById" in row) {
                (row as Record<string, unknown>).checkedById = (row as Record<string, unknown>).checkedInById;
                delete (row as Record<string, unknown>).checkedInById;
              }
            }
          }
          if (rows.length) {
            await batchCreate(tx, model, rows);
          }
          counts[model] = rows.length;
        }
      },
      { timeout: 60_000, maxWait: 10_000 }
    );
  } catch (err) {
    console.error("[backup] importDatabase failed:", err);
    throw err;
  }
  return counts;
}
