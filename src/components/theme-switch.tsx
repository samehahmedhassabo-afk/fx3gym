import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Moon, Sun } from "lucide-react";
import { getTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

async function toggleTheme(current: Theme) {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, current === "dark" ? "light" : "dark", {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function ThemeSwitch({ locale }: { locale: string }) {
  const theme = await getTheme();
  const action = toggleTheme.bind(null, theme);
  const label =
    theme === "dark"
      ? locale === "ar"
        ? "الوضع النهاري"
        : "Light mode"
      : locale === "ar"
        ? "الوضع الليلي"
        : "Night mode";

  return (
    <form action={action}>
      <button
        type="submit"
        title={label}
        aria-label={label}
        className="inline-flex items-center gap-2 px-3 h-9 text-sm font-medium rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-[var(--brand-blue)] transition-all"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
        <span className="hidden md:inline">{label}</span>
      </button>
    </form>
  );
}
