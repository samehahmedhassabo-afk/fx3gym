import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { createProduct } from "@/lib/actions/inventory";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";

export default async function NewProductPage() {
  const session = await requirePermission("inventory.create");
  const { t, locale } = await getT();

  return (
    <>
      <Header title={t.inventory.addProduct} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createProduct}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.inventory.addProduct}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.inventory.sku} *</Label>
                <Input name="sku" required />
              </div>
              <div>
                <Label>Category *</Label>
                <Select name="category" required defaultValue="SUPPLEMENT">
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
                <Input name="name" required />
              </div>
              <div>
                <Label>Name (AR)</Label>
                <Input name="nameAr" />
              </div>
              <div>
                <Label>{t.subscriptions.price} *</Label>
                <Input name="price" type="number" step="0.01" required />
              </div>
              <div>
                <Label>Cost</Label>
                <Input name="cost" type="number" step="0.01" />
              </div>
              <div>
                <Label>{t.inventory.stock} *</Label>
                <Input name="stock" type="number" required defaultValue="0" />
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input name="reorderLevel" type="number" defaultValue="5" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea name="description" rows={2} />
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
