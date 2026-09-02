import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CheckInDesk } from "@/components/checkin-desk";

export default async function CheckInPage() {
  const session = await requireSession();
  const { t, locale } = await getT();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayCheckIns = await db.attendance.findMany({
    where: { checkInTime: { gte: startOfToday } },
    include: { member: true },
    orderBy: { checkInTime: "desc" },
  });

  return (
    <>
      <Header title={t.nav.checkIn} user={session} locale={locale} />
      <main className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CheckInDesk t={t} />
        </div>
        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold">{t.dashboard.todayCheckIns}</h3>
            <Badge variant="info">{todayCheckIns.length}</Badge>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.members.code}</TH>
                <TH>{t.members.name}</TH>
                <TH>{t.classes.time}</TH>
              </TR>
            </THead>
            <TBody>
              {todayCheckIns.length === 0 ? (
                <TR>
                  <TD colSpan={3} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                todayCheckIns.map((a) => (
                  <TR key={a.id}>
                    <TD label={t.members.code} className="font-mono text-xs">{a.member.memberCode}</TD>
                    <TD label={t.members.name}>
                      <Link href={`/members/${a.member.id}`} className="hover:underline">
                        {a.member.firstName} {a.member.lastName}
                      </Link>
                    </TD>
                    <TD label={t.classes.time} className="text-xs text-[var(--muted)]">{formatDateTime(a.checkInTime)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
