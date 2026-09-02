"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select } from "@/components/ui/input";
import { MemberPicker, type MemberOption } from "@/components/member-picker";
import { formatCurrency } from "@/lib/utils";
import { createSale } from "@/lib/actions/inventory";
import type { Dictionary } from "@/lib/i18n";

type Product = { id: string; name: string; nameAr: string | null; sku: string; price: number; stock: number; category: string };
type CartLine = { productId: string; quantity: number };

export function POSCheckout({ products, members, t }: { products: Product[]; members: MemberOption[]; t: Dictionary }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [memberId, setMemberId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("CASH");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const productMap = new Map(products.map((p) => [p.id, p]));
  const filtered = products.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  function adjustQuantity(productId: string, delta: number) {
    setCart((lines) =>
      lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l)).filter((l) => l.quantity > 0)
    );
  }

  function addToCart(productId: string) {
    setCart((lines) =>
      lines.find((l) => l.productId === productId)
        ? lines.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l))
        : [...lines, { productId, quantity: 1 }]
    );
  }

  const subtotal = cart.reduce((sum, l) => sum + (productMap.get(l.productId)?.price ?? 0) * l.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  function handleConfirm() {
    if (cart.length === 0) return;
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("discount", String(discount));
    formData.set("method", method);
    formData.set("cart", JSON.stringify(cart));
    startTransition(() => createSale(formData));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <div className="p-4 border-b border-[var(--border)]">
            <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p.id)}
                disabled={p.stock <= 0}
                className="text-start border border-[var(--border)] rounded-xl p-3 hover:border-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-40"
              >
                <div className="font-mono text-[10px] text-[var(--muted)]">{p.sku}</div>
                <div className="font-medium text-sm leading-tight">{p.name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="font-bold text-[var(--primary)]">{formatCurrency(p.price)}</div>
                  <div className="text-[10px] text-[var(--muted)]">stock: {p.stock}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="self-start">
        <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          <h3 className="font-semibold">{t.inventory.sale}</h3>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label>{t.payments.member}</Label>
            <MemberPicker name="memberId" members={members} placeholder={t.common.search} onSelect={(id) => setMemberId(id)} />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">Cart empty</p>
            ) : (
              cart.map((line) => {
                const product = productMap.get(line.productId)!;
                return (
                  <div key={line.productId} className="flex items-center gap-2 bg-[var(--surface-2)] rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{product.name}</div>
                      <div className="text-xs text-[var(--muted)]">{formatCurrency(product.price)}</div>
                    </div>
                    <button onClick={() => adjustQuantity(line.productId, -1)} className="p-1 rounded hover:bg-[var(--border)]">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                    <button onClick={() => adjustQuantity(line.productId, 1)} className="p-1 rounded hover:bg-[var(--border)]">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setCart((lines) => lines.filter((l) => l.productId !== line.productId))}
                      className="p-1 rounded hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <div className="space-y-2 pt-3 border-t border-[var(--border)]">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Discount</span>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 h-8 text-end"
              />
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--border)]">
              <span>{t.inventory.total}</span>
              <span className="text-[var(--primary)]">{formatCurrency(total)}</span>
            </div>
          </div>
          <div>
            <Label>{t.payments.method}</Label>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="INSTAPAY">InstaPay</option>
              <option value="VODAFONE_CASH">Vodafone Cash</option>
            </Select>
          </div>
          <Button onClick={handleConfirm} disabled={cart.length === 0 || pending} className="w-full" size="lg">
            {pending ? t.common.loading : `${t.common.confirm} — ${formatCurrency(total)}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
