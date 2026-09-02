import Link from "next/link";
import { Plus, Users as UsersIcon, Pencil } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { toggleUserActive } from "@/lib/actions/users";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export default async function UsersPage() {
  const session = await requireAdmin();
  const { t, locale } = await getT();
  const users = await db.user.findMany({ orderBy: [{ isActive: "desc" }, { role: "asc" }, { username: "asc" }] });

  const roleLabel = (role: string) => (role === "ADMIN" ? t.users.roleAdmin : role === "TRAINER" ? t.users.roleTrainer : t.users.roleReceptionist);

  return (
    <>
      <Header title={t.users.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <UsersIcon className="w-4 h-4" /> {t.users.title}
            </h2>
            <Link href="/users/new">
              <Button>
                <Plus className="w-4 h-4" /> {t.users.addUser}
              </Button>
            </Link>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.users.username}</TH>
                <TH>{t.users.fullName}</TH>
                <TH>{t.users.role}</TH>
                <TH>{t.users.phone}</TH>
                <TH>{t.users.status}</TH>
                <TH className="text-end">{t.common.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {users.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === session.userId;
                  return (
                    <TR key={u.id} className={u.isActive ? "" : "opacity-60"}>
                      <TD label={t.users.username} className="font-mono">{u.username}</TD>
                      <TD label={t.users.fullName} className="font-medium">
                        {u.fullName}
                        {isSelf && <span className="ms-2 text-[10px] text-[var(--muted)]">(you)</span>}
                      </TD>
                      <TD label={t.users.role}>
                        <Badge variant={u.role === "ADMIN" ? "danger" : "outline"}>{roleLabel(u.role)}</Badge>
                      </TD>
                      <TD label={t.users.phone} className="font-mono text-xs">{u.phone ?? "—"}</TD>
                      <TD label={t.users.status}>
                        <Badge variant={u.isActive ? "success" : "outline"}>{u.isActive ? t.common.active : t.common.inactive}</Badge>
                      </TD>
                      <TD label={t.common.actions}>
                        <div className="flex justify-end gap-2">
                          <Link href={`/users/${u.id}`}>
                            <Button size="sm" variant="outline">
                              <Pencil className="w-3.5 h-3.5" /> {t.common.edit}
                            </Button>
                          </Link>
                          {!isSelf && (
                            <form action={toggleUserActive}>
                              <input type="hidden" name="id" value={u.id} />
                              <Button size="sm" variant={u.isActive ? "secondary" : "primary"} type="submit">
                                {u.isActive ? t.users.deactivate : t.users.activate}
                              </Button>
                            </form>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
