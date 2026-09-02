import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { createUser } from "@/lib/actions/users";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select } from "@/components/ui/input";

export default async function NewUserPage() {
  const session = await requireAdmin();
  const { t, locale } = await getT();

  return (
    <>
      <Header title={t.users.addUser} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createUser}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.users.addUser}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.users.username} *</Label>
                <Input name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9._\-]+" autoComplete="off" placeholder="e.g. coach.ahmed" />
              </div>
              <div>
                <Label>{t.users.fullName} *</Label>
                <Input name="fullName" required />
              </div>
              <div>
                <Label>{t.users.phone}</Label>
                <Input name="phone" type="tel" />
              </div>
              <div>
                <Label>{t.users.role} *</Label>
                <Select name="role" defaultValue="RECEPTIONIST" required>
                  <option value="ADMIN">{t.users.roleAdmin}</option>
                  <option value="RECEPTIONIST">{t.users.roleReceptionist}</option>
                  <option value="TRAINER">{t.users.roleTrainer}</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>{t.users.password} *</Label>
                <Input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder={t.users.passwordHint} />
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
      </main>
    </>
  );
}
