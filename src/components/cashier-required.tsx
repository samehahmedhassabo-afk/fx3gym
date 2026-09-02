import Link from "next/link";
import { Banknote } from "lucide-react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

export function CashierRequired({ user, locale }: { user: { fullName: string; role: string }; locale: Locale }) {
  return (
    <>
      <Header title="الكاشير" user={user} locale={locale} />
      <main className="p-6">
        <Card className="max-w-lg mx-auto p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Banknote className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold">لازم تفتح شيفت كاشير الأول</h2>
          <p className="text-sm text-[var(--muted)]">
            مينفعش تعمل أي عملية بيع (اشتراك، منتج، أو دفعة) من غير ما تفتح كاشير سيشن. افتح شيفتك وابدأ البيع.
          </p>
          <Link href="/cashier">
            <Button>
              <Banknote className="w-4 h-4" /> افتح الكاشير
            </Button>
          </Link>
        </Card>
      </main>
    </>
  );
}
