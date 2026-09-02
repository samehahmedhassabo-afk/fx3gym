import Link from "next/link";
import { UserPlus, Phone } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateLeadStatus } from "@/lib/actions/leads";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { WhatsAppButton } from "@/components/whatsapp-button";

const STATUS_VARIANT: Record<string, "warning" | "success" | "outline" | "danger"> = {
  NEW: "warning",
  CONTACTED: "outline",
  CONVERTED: "success",
  DISMISSED: "danger",
};
const STATUS_LABELS_AR: Record<string, string> = { NEW: "جديد", CONTACTED: "تم التواصل", CONVERTED: "تم التحويل لعضو", DISMISSED: "مرفوض" };
const STATUS_OPTIONS = ["NEW", "CONTACTED", "CONVERTED", "DISMISSED"];

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? fullName, lastName: parts.slice(1).join(" ") || "-" };
}

export default async function LeadsPage() {
  const session = await requirePermission("leads.view");
  const perms = await getSessionPermissions();
  const canManage = perms.has("leads.manage");
  const { locale } = await getT();

  const leads = await db.trialLead.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <>
      <Header title="حجوزات الحصص التجريبية" subtitle="طلبات وصلت من صفحة الحجز العامة" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm">
            رابط الحجز العام (شاركه على السوشيال ميديا):{" "}
            <code className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-blue-200">/book</code>
          </p>
        </Card>
        <Card>
          {leads.length === 0 ? (
            <EmptyState icon={UserPlus} title="لا يوجد طلبات حجز حتى الآن" hint="شارك رابط /book على السوشيال ميديا لبدء استقبال طلبات." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>الاسم</TH>
                  <TH>الهاتف</TH>
                  <TH>الرياضة</TH>
                  <TH>الوقت المفضّل</TH>
                  <TH>التاريخ</TH>
                  <TH>الحالة</TH>
                  {canManage && <TH>الإجراءات</TH>}
                </TR>
              </THead>
              <TBody>
                {leads.map((l) => {
                  const { firstName, lastName } = splitName(l.fullName);
                  const convertHref = `/members/new?leadId=${l.id}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&phone=${encodeURIComponent(l.phone)}`;
                  return (
                    <TR key={l.id}>
                      <TD label="الاسم" className="font-medium">
                        {l.fullName}
                        {l.message && <div className="text-xs text-[var(--muted)] mt-0.5">{l.message}</div>}
                      </TD>
                      <TD label="الهاتف" className="font-mono text-xs">{l.phone}</TD>
                      <TD label="الرياضة">{l.preferredSport || "—"}</TD>
                      <TD label="الوقت المفضّل">{l.preferredTime || "—"}</TD>
                      <TD label="التاريخ" className="text-xs text-[var(--muted)]">{formatDateTime(l.createdAt)}</TD>
                      <TD label="الحالة">
                        <Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABELS_AR[l.status] ?? l.status}</Badge>
                      </TD>
                      {canManage && (
                        <TD label="الإجراءات">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <WhatsAppButton phone={l.phone} message={`أهلاً ${firstName} 👋، من FX3 Fight & Fitness — بخصوص حجز حصتك التجريبية`} iconOnly />
                            {l.status !== "CONVERTED" && (
                              <Link href={convertHref}>
                                <Button size="sm" variant="secondary">
                                  <UserPlus className="w-3.5 h-3.5" /> تحويل لعضو
                                </Button>
                              </Link>
                            )}
                            <form action={updateLeadStatus} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={l.id} />
                              <Select name="status" defaultValue={l.status} className="h-8 text-xs w-auto">
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {STATUS_LABELS_AR[s]}
                                  </option>
                                ))}
                              </Select>
                              <Button type="submit" size="sm" variant="outline">
                                حفظ
                              </Button>
                            </form>
                          </div>
                        </TD>
                      )}
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </main>
    </>
  );
}
