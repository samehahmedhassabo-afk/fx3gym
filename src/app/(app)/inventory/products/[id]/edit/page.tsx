import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateProduct } from "@/lib/actions/inventory";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("inventory.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  const action = updateProduct.bind(null, id);

  return (
    <>
      <Header title={t.inventory.addProduct} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {t.common.edit} — {product.sku}
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.inventory.sku}</Label>
                <Input name="sku" defaultValue={product.sku} disabled />
              </div>
              <div>
                <Label>Category *</Label>
                <Select name="category" required defaultValue={product.category}>
                  <option value="SUPPLEMENT">Supplement</option>
                  <option value="APPAREL">Apparel</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="BEVERAGE">Beverage</option>
                  <option value="SNACK">Snack</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <Label>Name (EN) *</Label>
                <Input name="name" required defaultValue={product.name} />
              </div>
              <div>
                <Label>Name (AR)</Label>
                <Input name="nameAr" defaultValue={product.nameAr ?? ""} />
              </div>
              <div>
                <Label>{t.subscriptions.price} *</Label>
                <Input name="price" type="number" step="0.01" required defaultValue={product.price} />
              </div>
              <div>
                <Label>Cost</Label>
                <Input name="cost" type="number" step="0.01" defaultValue={product.cost ?? ""} />
              </div>
              <div>
                <Label>{t.inventory.stock} *</Label>
                <Input name="stock" type="number" required defaultValue={product.stock} />
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input name="reorderLevel" type="number" defaultValue={product.reorderLevel} />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="h-4 w-4 rounded border-[var(--border)]" />
                  {locale === "ar" ? "نشط" : "Active"}
                </Label>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea name="description" rows={2} defaultValue={product.description ?? ""} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/inventory">
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
