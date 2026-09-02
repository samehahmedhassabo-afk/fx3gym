import { cookies } from "next/headers";

export type Theme = "light" | "dark";

export const THEME_COOKIE = "fx3.theme";

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
}
