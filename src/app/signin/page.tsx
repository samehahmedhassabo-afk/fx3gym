import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocaleSwitch } from "@/components/locale-switch";
import { FX3Logo } from "@/components/fx3-logo";

async function loginAction(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!(await signIn(username, password))) redirect("/signin?error=1");
  redirect("/dashboard");
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { t, locale } = await getT();
  const params = await searchParams;
  const [memberCount, trainerCount, sessionCount, planCount] = await Promise.all([
    db.member.count(),
    db.trainer.count({ where: { isActive: true } }),
    db.classSession.count(),
    db.subscriptionPlan.count({ where: { isActive: true } }),
  ]);

  const stats = [
    { ar: "إدارة الأعضاء", en: "Members", count: String(memberCount) },
    { ar: "المدربين", en: "Trainers", count: String(trainerCount) },
    { ar: "الجلسات", en: "Sessions", count: String(sessionCount) },
    { ar: "الباقات", en: "Plans", count: String(planCount) },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--surface)]">
      <div className="relative hidden lg:flex flex-col justify-between bg-[var(--brand-navy)] text-white p-12 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 80px, rgba(0,101,167,0.5) 80px 88px, transparent 88px 160px)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-20 -end-20 w-80 h-80 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #0065A7 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -start-20 w-96 h-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #AC2500 0%, transparent 70%)" }}
        />
        <div className="relative z-10">
          <FX3Logo size={64} showTagline onDark />
        </div>
        <div className="relative z-10 space-y-4 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            {locale === "ar" ? "نظام إدارة FX3" : "FX3 Management"}
          </h2>
          <p className="text-white/70 leading-relaxed">
            {locale === "ar"
              ? "إدارة الأعضاء، الاشتراكات، الحصص، المدفوعات، والمدربين من مكان واحد."
              : "Manage members, subscriptions, classes, payments and trainers from one place."}
          </p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {stats.map((s) => (
              <div key={s.en} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">{s.count}</div>
                <div className="text-xs text-white/60 mt-0.5">{locale === "ar" ? s.ar : s.en}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} FX3 Fight & Fitness Centre · Fit. Fight. Flow.
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex justify-end p-4">
          <LocaleSwitch currentLocale={locale} />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden mb-8 flex justify-center bg-[var(--brand-navy)] -mx-6 px-6 py-8">
              <FX3Logo size={48} showTagline onDark />
            </div>
            {session ? (
              <div className="space-y-5">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {locale === "ar" ? `أهلاً ${session.fullName}` : `Welcome, ${session.fullName}`}
                  </h1>
                  <p className="text-[var(--muted)] mt-2">
                    {locale === "ar" ? "أنت مسجل دخول بالفعل." : "You are already signed in."}
                  </p>
                </div>
                <Link href="/dashboard">
                  <Button className="w-full" size="lg">
                    {locale === "ar" ? "افتح لوحة التحكم" : "Go to Dashboard"}
                  </Button>
                </Link>
                <form action="/api/signout" method="post">
                  <Button type="submit" variant="outline" className="w-full" size="lg">
                    {t.nav.logout}
                  </Button>
                </form>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight">{t.auth.welcome}</h1>
                  <p className="text-[var(--muted)] mt-2">{t.auth.signInToContinue}</p>
                </div>
                {params.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <span aria-hidden>⚠</span>
                    <span>{t.auth.invalidCredentials}</span>
                  </div>
                )}
                <form action={loginAction} className="space-y-5">
                  <div>
                    <Label htmlFor="username">{t.auth.username}</Label>
                    <Input id="username" name="username" required autoFocus autoComplete="username" />
                  </div>
                  <div>
                    <Label htmlFor="password">{t.auth.password}</Label>
                    <Input id="password" name="password" type="password" required autoComplete="current-password" />
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    {t.auth.signIn}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
