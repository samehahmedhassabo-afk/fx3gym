import { requirePermission } from "@/lib/auth";
import { getOpenSession } from "@/lib/actions/cashier";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { duplicateMemberIdSet } from "@/lib/duplicate-check";
import { CashierRequired } from "@/components/cashier-required";
import { Header } from "@/components/header";
import { POSCheckout } from "@/components/pos-checkout";

export default async function InventorySalePage() {
  const session = await requirePermission("inventory.create");
  const { t, locale } = await getT();

  if (!(await getOpenSession(session.userId)) && session.role !== "ADMIN") {
    return <CashierRequired user={session} locale={locale} />;
  }

  const [products, members, dupIds] = await Promise.all([
    db.product.findMany({ where: { isActive: true, stock: { gt: 0 } }, orderBy: { name: "asc" } }),
    db.member.findMany({ orderBy: { firstName: "asc" } }),
    duplicateMemberIdSet(),
  ]);

  return (
    <>
      <Header title={t.inventory.sale} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <POSCheckout
          t={t}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            nameAr: p.nameAr,
            sku: p.sku,
            price: p.price,
            stock: p.stock,
            category: p.category,
          }))}
          members={members.map((m) => ({
            id: m.id,
            label: `${m.firstName} ${m.lastName}`,
            sublabel: `${m.memberCode} — ${m.phone}`,
            isDuplicate: dupIds.has(m.id),
          }))}
        />
      </main>
    </>
  );
}
