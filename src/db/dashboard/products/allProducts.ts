
import { db } from "@/db";

export async function getAllDashboardProducts() {
  return await db.query.products.findMany({
    // where: { isActive: true },
    columns: {
      id: false,
      description: false,
    },
    orderBy: { categoryId: "asc" },
  });
}
