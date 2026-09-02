import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateUser, changeUserPassword, toggleUserActive, deleteUser } from "@/lib/actions/users";
import { effectivePermissions } from "@/lib/permissions";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Select } from "@/components/ui/input";
import { PermissionMatrix } from "@/components/permission-matrix";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { t, locale } = await getT();
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();

  const isSelf = user.id === session.userId;
  const currentPermissions = Array.from(effectivePermissions(user.role, user.permissions));

  return (
    <>
      <Header
        title={`${t.users.editUser} — ${user.username}`}
        user={session}
        locale={locale}
        actions={
          <Link href="/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" /> {t.common.back}
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 space-y-6 max-w-3xl">
        <form action={updateUser}>
          <input type="hidden" name="id" value={user.id} />
          <Card>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-semibold">{t.users.editUser}</h2>
              <Badge variant={user.isActive ? "success" : "outline"}>{user.isActive ? t.common.active : t.common.inactive}</Badge>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.users.username}</Label>
                <Input value={user.username} disabled className="font-mono" />
              </div>
              <div>
                <Label>{t.users.fullName} *</Label>
                <Input name="fullName" required defaultValue={user.fullName} />
              </div>
              <div>
                <Label>{t.users.phone}</Label>
                <Input name="phone" type="tel" defaultValue={user.phone ?? ""} />
              </div>
              <div>
                <Label>{t.users.role} *</Label>
                <Select name="role" defaultValue={user.role} required disabled={isSelf}>
                  <option value="ADMIN">{t.users.roleAdmin}</option>
                  <option value="RECEPTIONIST">{t.users.roleReceptionist}</option>
                  <option value="TRAINER">{t.users.roleTrainer}</option>
                </Select>
                {isSelf && <p className="text-xs text-[var(--muted)] mt-1">{t.users.cannotDeactivateSelf}</p>}
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/users">
                <Button variant="outline" type="button">
                  {t.common.cancel}
                </Button>
              </Link>
              <Button type="submit">{t.common.save}</Button>
            </div>
          </Card>
        </form>

        <PermissionMatrix userId={user.id} role={user.role} current={currentPermissions} hasCustom={user.permissions !== null} />

        <form action={changeUserPassword}>
          <input type="hidden" name="id" value={user.id} />
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.users.changePassword}</h2>
            </div>
            <div className="p-5">
              <Label>{t.users.newPassword} *</Label>
              <Input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder={t.users.passwordHint} />
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end">
              <Button type="submit">{t.users.changePassword}</Button>
            </div>
          </Card>
        </form>

        {!isSelf && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold text-red-700">{t.common.actions}</h2>
            </div>
            <div className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{user.isActive ? t.users.deactivate : t.users.activate}</p>
                <p className="text-xs text-[var(--muted)]">{user.isActive ? "Disables sign-in without removing records." : "Restores sign-in access."}</p>
              </div>
              <form action={toggleUserActive}>
                <input type="hidden" name="id" value={user.id} />
                <Button type="submit" variant={user.isActive ? "secondary" : "primary"}>
                  {user.isActive ? t.users.deactivate : t.users.activate}
                </Button>
              </form>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-red-700">{t.users.delete}</p>
                <p className="text-xs text-[var(--muted)]">{t.users.deleteConfirm}</p>
              </div>
              <form action={deleteUser}>
                <input type="hidden" name="id" value={user.id} />
                <Button type="submit" variant="danger">
                  <Trash2 className="w-4 h-4" /> {t.users.delete}
                </Button>
              </form>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
