import { db } from "@/db";

/** Public order fields safe to show via orderNumber capability URL. */
export type PublicOrder = NonNullable<
  Awaited<ReturnType<typeof getOrderByNumber>>
>;

export async function getOrderByNumber(orderNumber: string) {
  return await db.query.orders.findFirst({
    where: { orderNumber },
    columns: {
      orderNumber: true,
      customerName: true,
      contactMethod: true,
      deliveryMethod: true,
      items: true,
      totalAmount: true,
      status: true,
      notes: true,
      createdAt: true,
    },
  });
}
