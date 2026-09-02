import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Languages } from "lucide-react";

async function toggleLocale(currentLocale: string) {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set("locale", currentLocale === "ar" ? "en" : "ar", {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function LocaleSwitch({ currentLocale }: { currentLocale: string }) {
  const action = toggleLocale.bind(null, currentLocale);
  return (
    <form action={action}>
      <button
        type="submit"
        name="fx3-locale-toggle"
        className="inline-flex items-center gap-2 px-3 h-9 text-sm font-medium rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-[var(--brand-blue)] transition-all"
        translate="no"
        data-no-translate="true"
      >
        <Languages className="w-4 h-4" aria-hidden="true" />
        <span className="hidden md:inline" translate="no">
          {currentLocale === "ar" ? "English" : "العربية"}
        </span>
      </button>
    </form>
  );
}
