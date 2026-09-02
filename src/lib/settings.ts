import { db } from "@/lib/db";

export async function getGymSettings() {
  const rows = await db.setting.findMany({ where: { key: { startsWith: "gym." } } });
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return {
    name: settings["gym.name"] ?? "FX3 Fight & Fitness Centre",
    phone: settings["gym.phone"] ?? "",
    address: settings["gym.address"] ?? "",
    currency: settings["gym.currency"] ?? "EGP",
    registrationFee: settings["gym.registration_fee"] ?? "",
  };
}
