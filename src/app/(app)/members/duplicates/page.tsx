import Link from "next/link";
import { Users2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { allDuplicateGroups } from "@/lib/duplicate-check";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

export default async function DuplicateMembersPage() {
  const session = await requireAdmin();
  const { locale } = await getT();
  const groups = await allDuplicateGroups();

  return (
    <>
      <Header title="أعضاء بأسماء مكررة" subtitle="مجموعات أعضاء بنفس الاسم — راجعها للتأكد إنها مش نفس الشخص مسجّل مرتين" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-4">
        {groups.length === 0 ? (
          <Card>
            <EmptyState icon={Users2} title="لا يوجد أسماء مكررة حالياً" />
          </Card>
        ) : (
          groups.map((group, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="warning">{group.length} أعضاء بنفس الاسم</Badge>
                <span className="font-medium">
                  {group[0].firstName} {group[0].lastName}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.map((m) => (
                  <Link
                    key={m.id}
                    href={`/members/${m.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] text-sm"
                  >
                    <span className="font-mono text-xs text-[var(--muted)]">{m.memberCode}</span>
                    <span className="font-mono text-xs">{m.phone}</span>
                    <Badge variant={m.status === "ACTIVE" ? "success" : "outline"}>{m.status}</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          ))
        )}
      </main>
    </>
  );
}
