
import { db } from "@/db";

export async function getAllDashboardCategories() {
  return await db.query.categories.findMany();
}
