"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { resolveSaleSessionId } from "@/lib/actions/cashier";
import { nextSaleNumber, nextInvoiceNumber } from "@/lib/sequences";

const PRODUCT_CATEGORIES = ["SUPPLEMENT", "APPAREL", "EQUIPMENT", "BEVERAGE", "SNACK", "OTHER"] as const;

const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  nameAr: z.string().optional(),
  category: z.enum(PRODUCT_CATEGORIES),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  reorderLevel: z.coerce.number().int().nonnegative().default(5),
  description: z.string().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  category: z.enum(PRODUCT_CATEGORIES),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  reorderLevel: z.coerce.number().int().nonnegative().default(5),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const cartItemSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive() });
const saleSchema = z.object({
  memberId: z.string().optional().nullable(),
  discount: z.coerce.number().nonnegative().default(0),
  method: z.enum(["CASH", "CARD", "INSTAPAY", "VODAFONE_CASH", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  cart: z.array(cartItemSchema).min(1, "Cart is empty"),
});

export async function createProduct(formData: FormData) {
  await assertPermission("inventory.create");
  const data = createProductSchema.parse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || undefined,
    category: formData.get("category") || "OTHER",
    price: formData.get("price"),
    cost: formData.get("cost") || undefined,
    stock: formData.get("stock") || "0",
    reorderLevel: formData.get("reorderLevel") || "5",
    description: (formData.get("description") as string) || undefined,
  });
  await db.product.create({ data });
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateProduct(id: string, formData: FormData) {
  await assertPermission("inventory.edit");
  const data = updateProductSchema.parse({
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || undefined,
    category: formData.get("category") || "OTHER",
    price: formData.get("price"),
    cost: formData.get("cost") || undefined,
    stock: formData.get("stock") || "0",
    reorderLevel: formData.get("reorderLevel") || "5",
    description: (formData.get("description") as string) || undefined,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  await db.product.update({
    where: { id },
    data: {
      name: data.name,
      nameAr: data.nameAr || null,
      category: data.category,
      price: data.price,
      cost: data.cost ?? null,
      stock: data.stock,
      reorderLevel: data.reorderLevel,
      description: data.description || null,
      isActive: data.isActive,
    },
  });
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function deleteProduct(formData: FormData) {
  await assertPermission("inventory.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Product id is required");
  const inUse = (await db.saleItem.count({ where: { productId: id } })) > 0;
  if (inUse) {
    await db.product.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.product.delete({ where: { id } });
  }
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function createSale(formData: FormData) {
  const session = await assertPermission("inventory.create");
  const sessionId = await resolveSaleSessionId(session);

  let cart: unknown;
  try {
    cart = JSON.parse(String(formData.get("cart") ?? "[]"));
  } catch {
    throw new Error("Invalid cart payload");
  }
  const data = saleSchema.parse({
    memberId: formData.get("memberId") || null,
    discount: formData.get("discount") || "0",
    method: formData.get("method") || "CASH",
    cart,
  });

  const productIds = data.cart.map((c) => c.productId);
  const saleNumber = await nextSaleNumber();
  const invoiceNumber = await nextInvoiceNumber();

  await db.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const items = data.cart.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name} (have ${product.stock}, need ${item.quantity})`);
      }
      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;
      return { productId: product.id, quantity: item.quantity, unitPrice: product.price, subtotal: itemSubtotal };
    });
    const discount = Math.min(data.discount, subtotal);
    const total = subtotal - discount;

    const sale = await tx.sale.create({
      data: {
        saleNumber,
        memberId: data.memberId || null,
        soldById: session.userId,
        subtotal,
        discount,
        total,
        sessionId,
        items: { create: items },
      },
    });

    for (const item of data.cart) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
    }

    await tx.payment.create({
      data: {
        invoiceNumber,
        memberId: data.memberId || null,
        saleId: sale.id,
        amount: total,
        method: data.method,
        type: "PRODUCT_SALE",
        recordedById: session.userId,
        sessionId,
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/payments");
  redirect("/inventory");
}

export async function refundSale(formData: FormData) {
  const session = await assertPermission("inventory.delete");
  const sessionId = await resolveSaleSessionId(session);
  const saleId = String(formData.get("saleId") ?? "");
  if (!saleId) throw new Error("Sale id is required");
  const reason = (formData.get("reason") as string)?.trim() || null;
  const invoiceNumber = await nextInvoiceNumber();

  await db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: true, payments: { where: { amount: { gt: 0 } }, take: 1 } },
    });
    if (!sale) throw new Error("Sale not found");
    if (sale.refundedAt) throw new Error("Sale already refunded");
    const method = sale.payments[0]?.method ?? "CASH";

    for (const item of sale.items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }

    await tx.payment.create({
      data: {
        invoiceNumber,
        memberId: sale.memberId,
        saleId: sale.id,
        amount: -sale.total,
        method,
        type: "PRODUCT_SALE",
        notes: `Refund ${sale.saleNumber}`,
        recordedById: session.userId,
        sessionId,
      },
    });
    await tx.sale.update({ where: { id: sale.id }, data: { refundedAt: new Date(), refundReason: reason } });
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/sale/${saleId}`);
  revalidatePath("/payments");
  redirect(`/inventory/sale/${saleId}`);
}

const saleNotesSchema = z.object({ notes: z.string().max(2000).optional() });

export async function updateSaleNotes(id: string, formData: FormData) {
  await assertPermission("inventory.edit");
  const data = saleNotesSchema.parse({ notes: (formData.get("notes") as string) || undefined });
  await db.sale.update({ where: { id }, data: { notes: data.notes || null } });
  revalidatePath(`/inventory/sale/${id}`);
  revalidatePath("/inventory");
  redirect(`/inventory/sale/${id}`);
}
