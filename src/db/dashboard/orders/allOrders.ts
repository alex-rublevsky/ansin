import { db } from "@/db";

export async function getAllDashboardOrders() {
  return await db.query.orders.findMany({
    orderBy: { createdAt: "desc" },
  });
}
