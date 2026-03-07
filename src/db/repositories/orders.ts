import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { type NewOrder, type Order, orders } from "../schema";

export async function getAllOrders(): Promise<Order[]> {
	return await db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number): Promise<Order | undefined> {
	const result = await db
		.select()
		.from(orders)
		.where(eq(orders.id, id))
		.limit(1);
	return result[0];
}

export async function getOrderByNumber(
	orderNumber: string,
): Promise<Order | undefined> {
	const result = await db
		.select()
		.from(orders)
		.where(eq(orders.orderNumber, orderNumber))
		.limit(1);
	return result[0];
}

export async function getOrdersByStatus(
	status: "pending" | "confirmed" | "cancelled",
): Promise<Order[]> {
	return await db
		.select()
		.from(orders)
		.where(eq(orders.status, status))
		.orderBy(desc(orders.createdAt));
}

export async function createOrder(order: NewOrder): Promise<Order> {
	const result = await db.insert(orders).values(order).returning();
	return result[0];
}

export async function updateOrderStatus(
	id: number,
	status: "pending" | "confirmed" | "cancelled",
): Promise<Order | undefined> {
	const result = await db
		.update(orders)
		.set({ status })
		.where(eq(orders.id, id))
		.returning();
	return result[0];
}

export async function getRecentOrders(limit: number = 10): Promise<Order[]> {
	return await db
		.select()
		.from(orders)
		.orderBy(desc(orders.createdAt))
		.limit(limit);
}

export function generateOrderNumber(): string {
	const timestamp = Date.now().toString(36).toUpperCase();
	const random = Math.random().toString(36).substring(2, 6).toUpperCase();
	return `ORD-${timestamp}-${random}`;
}
