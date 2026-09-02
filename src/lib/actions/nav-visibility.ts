"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { PERMISSION_MODULES } from "@/lib/permissions";
import { setNavVisibility, type NavVisibility } from "@/lib/nav-visibility";

export async function updateNavVisibility(formData: FormData) {
  await assertAdmin();
  const value: NavVisibility = {};
  for (const module of PERMISSION_MODULES) {
    const hideFromAdmin = formData.get(`hideAdmin_${module.key}`) === "on";
    const hideFromOthers = formData.get(`hideOthers_${module.key}`) === "on";
    if (hideFromAdmin || hideFromOthers) value[module.key] = { hideFromAdmin, hideFromOthers };
  }
  await setNavVisibility(value);
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
