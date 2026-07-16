import type { OrderItem } from "@/db/schema";
import { createOrder } from "@/db/storefront/createOrder";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  variationId: z.number().int().positive(),
  productName: z.string().min(1),
  slug: z.string().min(1),
  image: z.string(),
  variationWeight: z.number().positive(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

export const createOrderAction = defineAction({
  accept: "json",
  input: z.object({
    customerName: z.string().trim().min(1, "Укажите имя"),
    customerEmail: z.string().trim().email("Укажите корректный email"),
    customerPhone: z.string().trim().min(1, "Укажите телефон"),
    paymentMethod: z.enum(["cash", "card"]),
    deliveryMethod: z.enum(["pickup", "delivery"]),
    contactMethod: z.enum([
      "telegram",
      "whatsapp",
      "instagram",
      "phone",
      "email",
    ]),
    notes: z.string().trim().optional(),
    items: z.array(orderItemSchema).min(1, "Корзина пуста"),
  }),
  handler: async (input) => {
    try {
      const items: OrderItem[] = input.items;
      const order = await createOrder({
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        paymentMethod: input.paymentMethod,
        deliveryMethod: input.deliveryMethod,
        contactMethod: input.contactMethod,
        notes: input.notes || null,
        items,
      });

      return {
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
      };
    } catch (error) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message:
          error instanceof Error ? error.message : "Не удалось оформить заказ",
      });
    }
  },
});
