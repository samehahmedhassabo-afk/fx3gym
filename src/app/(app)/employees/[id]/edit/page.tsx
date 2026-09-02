import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateEmployee } from "@/lib/actions/employees";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("employees.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const employee = await db.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  const action = updateEmployee.bind(null, id);

  return (
    <>
      <Header title={t.employees.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.employees.title}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.members.name} *</Label>
                <Input name="fullName" required defaultValue={employee.fullName} />
              </div>
              <div>
                <Label>{t.members.phone} *</Label>
                <Input name="phone" required defaultValue={employee.phone} />
              </div>
              <div>
                <Label>{t.members.email}</Label>
                <Input name="email" type="email" defaultValue={employee.email ?? ""} />
              </div>
              <div>
                <Label>{t.employees.position} *</Label>
                <Input name="position" required defaultValue={employee.position} placeholder="Receptionist / Cleaner / Manager…" />
              </div>
              <div>
                <Label>{t.employees.type}</Label>
                <Select name="employmentType" defaultValue={employee.employmentType}>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="COMMISSION_ONLY">Commission Only</option>
                </Select>
              </div>
              <div>
                <Label>{t.employees.salary}</Label>
                <Input name="baseSalary" type="number" step="0.01" defaultValue={employee.baseSalary} />
              </div>
              <div>
                <Label>Hourly Rate (optional)</Label>
                <Input name="hourlyRate" type="number" step="0.01" defaultValue={employee.hourlyRate ?? ""} />
              </div>
              <div>
                <Label>فئة المهام اليومية</Label>
                <Select name="taskCategory" defaultValue={employee.taskCategory ?? ""}>
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
                <Textarea name="notes" rows={2} defaultValue={employee.notes ?? ""} />
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
