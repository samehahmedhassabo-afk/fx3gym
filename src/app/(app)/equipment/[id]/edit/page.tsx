import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateEquipment } from "@/lib/actions/equipment";
import { Header } from "@/components/header";
import { EquipmentForm } from "@/components/equipment-form";

function toDateInput(value: Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("equipment.edit");
  const { locale } = await getT();
  const { id } = await params;

  const item = await db.equipment.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <>
      <Header title="تعديل معدة" subtitle={item.nameAr || item.name} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <EquipmentForm
          action={updateEquipment.bind(null, id)}
          title="تعديل بيانات المعدة"
          defaults={{
            name: item.name,
            nameAr: item.nameAr,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            purchaseDate: toDateInput(item.purchaseDate),
            lifespanMonths: item.lifespanMonths,
            expiryDate: toDateInput(item.expiryDate),
            conditionPct: item.conditionPct,
            maintenanceIntervalMonths: item.maintenanceIntervalMonths,
            maintenanceCost: item.maintenanceCost,
            lastMaintenanceAt: toDateInput(item.lastMaintenanceAt),
            location: item.location,
            supplier: item.supplier,
            notes: item.notes,
            status: item.status,
          }}
        />
      </main>
    </>
  );
}
