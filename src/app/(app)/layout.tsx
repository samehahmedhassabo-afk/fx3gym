import { Suspense } from "react";
import { Toaster } from "sonner";
import { requireSession, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getNavVisibility } from "@/lib/nav-visibility";
import { Sidebar } from "@/components/sidebar";
import { ToastListener } from "@/components/toast-listener";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { t, dir } = await getT();
  const perms = await getSessionPermissions();
  const navVisibility = await getNavVisibility();

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <ToastListener />
      </Suspense>
      <Toaster position={dir === "rtl" ? "top-left" : "top-right"} dir={dir} richColors />
      <Sidebar t={t} dir={dir} role={session.role} perms={Array.from(perms)} navVisibility={navVisibility} />
      {/* The sidebar is off-canvas below lg, so the content only shifts on desktop. */}
      <div className={dir === "rtl" ? "lg:pr-64" : "lg:pl-64"}>{children}</div>
    </div>
  );
}
