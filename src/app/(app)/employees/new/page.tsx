import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { createEmployee } from "@/lib/actions/employees";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";

export default async function NewEmployeePage() {
  const session = await requirePermission("employees.create");
  const { t, locale } = await getT();

  return (
    <>
      <Header title={t.employees.addEmployee} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createEmployee}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.employees.addEmployee}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.members.name} *</Label>
                <Input name="fullName" required />
              </div>
              <div>
                <Label>{t.members.phone} *</Label>
                <Input name="phone" required />
              </div>
              <div>
                <Label>{t.members.email}</Label>
                <Input name="email" type="email" />
              </div>
              <div>
                <Label>{t.employees.position} *</Label>
                <Input name="position" required placeholder="Receptionist / Cleaner / Manager…" />
              </div>
              <div>
                <Label>{t.employees.type}</Label>
                <Select name="employmentType" defaultValue="FULL_TIME">
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="COMMISSION_ONLY">Commission Only</option>
                </Select>
              </div>
              <div>
                <Label>{t.employees.salary}</Label>
                <Input name="baseSalary" type="number" step="0.01" defaultValue="0" />
              </div>
              <div>
                <Label>Hourly Rate (optional)</Label>
                <Input name="hourlyRate" type="number" step="0.01" />
              </div>
              <div>
                <Label>فئة المهام اليومية</Label>
                <Select name="taskCategory" defaultValue="">
                  <option value="">— بدون —</option>
                  {Object.entries(t.tasks.categories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-[var(--muted)] mt-1">تحدد تشيك ليست المهام اليومية اللي هيشوفها الموظف ده</p>
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/employees">
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
