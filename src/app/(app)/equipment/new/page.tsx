import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { createEquipment } from "@/lib/actions/equipment";
import { Header } from "@/components/header";
import { EquipmentForm } from "@/components/equipment-form";

export default async function NewEquipmentPage() {
  const session = await requirePermission("equipment.create");
  const { locale } = await getT();

  return (
    <>
      <Header title="إضافة معدة" user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <EquipmentForm action={createEquipment} title="إضافة معدة جديدة" />
      </main>
    </>
  );
}
