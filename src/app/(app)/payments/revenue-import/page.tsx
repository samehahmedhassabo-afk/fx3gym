import { Upload, FileSpreadsheet } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { importHistoricalRevenue, deleteHistoricalRevenueRow } from "@/lib/actions/historical-revenue";
import { formatCurrency } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";

const MONTH_NAMES_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default async function RevenueImportPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; errors?: string }>;
}) {
  const session = await requirePermission("revenueImport.view");
  const perms = await getSessionPermissions();
  const canManage = perms.has("revenueImport.manage");
  const { locale } = await getT();
  const params = await searchParams;

  const rows = await db.historicalRevenue.findMany({ orderBy: [{ coachName: "asc" }, { year: "desc" }, { month: "desc" }] });

  const byCoach = new Map<string, number>();
  for (const r of rows) byCoach.set(r.coachName, (byCoach.get(r.coachName) ?? 0) + r.amount);
  const coachTotals = Array.from(byCoach.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Header title="استيراد الإيرادات التاريخية" subtitle="إجمالي شهري لكل كابتن — بدون بيانات أعضاء" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        {params.imported && (
          <Card className="p-4 bg-emerald-50 border-emerald-200 text-emerald-800 text-sm">
            تم استيراد {params.imported} صف بنجاح
            {Number(params.errors) > 0 && ` — تم تجاهل ${params.errors} صف بسبب أخطاء في البيانات`}
          </Card>
        )}

        {canManage && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="w-4 h-4 text-[var(--muted)]" />
              <h3 className="font-semibold text-sm">رفع ملف إكسيل</h3>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              أعمدة الملف المطلوبة: <code className="font-mono">Coach</code> (اسم الكابتن)، <code className="font-mono">Year</code> (السنة)،{" "}
              <code className="font-mono">Month</code> (1-12)، <code className="font-mono">Amount</code> (الإيراد). صف واحد لكل كابتن/شهر.
              الاستيراد المتكرر لنفس الكابتن/السنة/الشهر يحدّث القيمة بدل التكرار.
            </p>
            <form action={importHistoricalRevenue} className="flex items-center gap-3">
              <input type="file" name="file" accept=".xlsx,.xls,.csv" required className="text-sm" />
              <Button type="submit" size="sm">
                <Upload className="w-4 h-4" /> استيراد
              </Button>
            </form>
          </Card>
        )}

        {coachTotals.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">إجمالي كل كابتن (كل الفترات المستوردة)</h3>
            <div className="flex flex-wrap gap-2">
              {coachTotals.map(([coach, total]) => (
                <div key={coach} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm">
                  <span className="font-medium">{coach}</span> — {formatCurrency(total, locale)}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          {rows.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="لم يتم استيراد أي بيانات بعد" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>الكابتن</TH>
                  <TH>السنة</TH>
                  <TH>الشهر</TH>
                  <TH>الإيراد</TH>
                  {canManage && <TH></TH>}
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD label="الكابتن">{r.coachName}</TD>
                    <TD label="السنة">{r.year}</TD>
                    <TD label="الشهر">{MONTH_NAMES_AR[r.month - 1]}</TD>
                    <TD label="الإيراد">{formatCurrency(r.amount, locale)}</TD>
                    {canManage && (
                      <TD>
                        <DeleteButton action={deleteHistoricalRevenueRow} id={r.id} size="sm" iconOnly />
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </main>
    </>
  );
}
