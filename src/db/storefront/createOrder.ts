import { db } from "@/db";
import { orders, type NewOrder, type OrderItem } from "@/db/schema";

export type CreateOrderInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  notes?: string | null;
  paymentMethod?: NewOrder["paymentMethod"];
  deliveryMethod?: NewOrder["deliveryMethod"];
  contactMethod?: NewOrder["contactMethod"];
  items: OrderItem[];
};

function generateOrderNumber() {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${time}-${rand}`;
}

export async function createOrder(input: CreateOrderInput) {
  if (input.items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const [created] = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone ?? null,
      notes: input.notes ?? null,
      paymentMethod: input.paymentMethod ?? null,
      deliveryMethod: input.deliveryMethod ?? null,
      contactMethod: input.contactMethod ?? null,
      items: input.items,
      totalAmount,
      status: "pending",
    })
    .returning();

  return created;
}
