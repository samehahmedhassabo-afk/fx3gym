import Link from "next/link";
import { Plus, ShoppingCart, Package } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteProduct } from "@/lib/actions/inventory";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function InventoryPage() {
  const session = await requirePermission("inventory.view");
  const { t, locale } = await getT();
  const perms = await getSessionPermissions();
  const canEdit = perms.has("inventory.edit");
  const canDelete = perms.has("inventory.delete");

  const [products, sales] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.sale.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { member: true, items: true } }),
  ]);

  return (
    <>
      <Header title={t.inventory.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <div className="flex justify-end gap-2">
          <Link href="/inventory/products/new">
            <Button variant="outline">
              <Plus className="w-4 h-4" /> {t.inventory.addProduct}
            </Button>
          </Link>
          <Link href="/inventory/sale">
            <Button>
              <ShoppingCart className="w-4 h-4" /> {t.inventory.sale}
            </Button>
          </Link>
        </div>

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
            <Package className="w-4 h-4" />
            <h2 className="font-semibold">{t.inventory.products}</h2>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.inventory.sku}</TH>
                <TH>{t.members.name}</TH>
                <TH>Category</TH>
                <TH>{t.subscriptions.price}</TH>
                <TH>{t.inventory.stock}</TH>
                {(canEdit || canDelete) && <TH className="text-left">{t.common.actions}</TH>}
              </TR>
            </THead>
            <TBody>
              {products.length === 0 ? (
                <TR>
                  <TD colSpan={canEdit || canDelete ? 6 : 5} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                products.map((p) => (
                  <TR key={p.id}>
                    <TD label={t.inventory.sku} className="font-mono text-xs">{p.sku}</TD>
                    <TD label={t.members.name} className="font-medium">{p.name}</TD>
                    <TD label="Category">
                      <Badge variant="outline">{p.category}</Badge>
                    </TD>
                    <TD label={t.subscriptions.price}>{formatCurrency(p.price)}</TD>
                    <TD label={t.inventory.stock}>
                      <Badge variant={p.stock <= p.reorderLevel ? "danger" : p.stock <= 10 ? "warning" : "success"}>{p.stock}</Badge>
                    </TD>
                    {(canEdit || canDelete) && (
                      <TD label={t.common.actions}>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Link href={`/inventory/products/${p.id}/edit`}>
                              <Button variant="outline" size="sm">
                                {t.common.edit}
                              </Button>
                            </Link>
                          )}
                          {canDelete && <DeleteButton action={deleteProduct} id={p.id} iconOnly />}
                        </div>
                      </TD>
                    )}
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <h2 className="font-semibold">{t.inventory.sales}</h2>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Sale #</TH>
                <TH>{t.members.name}</TH>
                <TH>Items</TH>
                <TH>{t.inventory.total}</TH>
                <TH>{t.payments.date}</TH>
              </TR>
            </THead>
            <TBody>
              {sales.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                sales.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-mono text-xs">
                      <Link href={`/inventory/sale/${s.id}`} className="text-[var(--brand-blue)] hover:underline">
                        {s.saleNumber}
                      </Link>
                      {s.refundedAt && (
                        <Badge variant="danger" className="ms-2">
                          مسترجع
                        </Badge>
                      )}
                    </TD>
                    <TD>{s.member ? `${s.member.firstName} ${s.member.lastName}` : "—"}</TD>
                    <TD>{s.items.length}</TD>
                    <TD className="font-medium">{formatCurrency(s.total)}</TD>
                    <TD className="text-xs text-[var(--muted)]">{formatDate(s.createdAt)}</TD>
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
