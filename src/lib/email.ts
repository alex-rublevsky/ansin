import { Resend } from "resend";
import type { Order } from "../db/schema";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

interface OrderConfirmationData {
	order: Order;
	customerEmail: string;
}

export async function sendOrderConfirmation({
	order,
	customerEmail,
}: OrderConfirmationData) {
	if (!process.env.RESEND_API_KEY) {
		console.warn("⚠️  RESEND_API_KEY not set, skipping email");
		return { success: false, message: "Email service not configured" };
	}

	try {
		const items = order.items
			.map(
				(item) =>
					`<li>${escapeHtml(item.productName)} x ${item.quantity} - $${item.price.toFixed(2)}</li>`,
			)
			.join("");

		const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            ul { list-style: none; padding: 0; }
            li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${escapeHtml(order.customerName)},</p>
              <p>Thank you for your order! We've received your order and will process it shortly.</p>

              <div class="order-details">
                <h2>Order #${escapeHtml(order.orderNumber)}</h2>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>

                <h3>Items Ordered:</h3>
                <ul>${items}</ul>

                <p class="total">Total: $${order.totalAmount.toFixed(2)}</p>

                ${order.notes ? `<p><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
              </div>

              <p>We'll be in touch soon to confirm your order details.</p>
            </div>
            <div class="footer">
              <p>If you have any questions, please reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

		const primaryAdmin = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();

		await resend.emails.send({
			from: `Orders <${primaryAdmin || "orders@example.com"}>`,
			to: customerEmail,
			subject: `Order Confirmation - ${order.orderNumber}`,
			html,
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to send order confirmation:", error);
		return { success: false, error };
	}
}

export async function sendOrderNotificationToAdmin(order: Order) {
	if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAILS) {
		console.warn("⚠️  Email not configured, skipping admin notification");
		return { success: false };
	}

	const primaryAdmin = process.env.ADMIN_EMAILS.split(",")[0]?.trim();
	if (!primaryAdmin) {
		console.warn("⚠️  No admin email found in ADMIN_EMAILS");
		return { success: false };
	}

	try {
		const items = order.items
			.map(
				(item) =>
					`<li>${escapeHtml(item.productName)} x ${item.quantity} - $${item.price.toFixed(2)}</li>`,
			)
			.join("");

		const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            ul { list-style: none; padding: 0; }
            li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
            .customer-info { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Order Received!</h1>
            </div>
            <div class="content">
              <div class="order-details">
                <h2>Order #${escapeHtml(order.orderNumber)}</h2>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>

                <div class="customer-info">
                  <h3>Customer Information</h3>
                  <p><strong>Name:</strong> ${escapeHtml(order.customerName)}</p>
                  <p><strong>Email:</strong> ${escapeHtml(order.customerEmail)}</p>
                  ${order.customerPhone ? `<p><strong>Phone:</strong> ${escapeHtml(order.customerPhone)}</p>` : ""}
                </div>

                <h3>Items Ordered:</h3>
                <ul>${items}</ul>

                <p class="total">Total: $${order.totalAmount.toFixed(2)}</p>

                ${order.notes ? `<p><strong>Customer Notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
              </div>

              <p>Login to the admin dashboard to manage this order.</p>
            </div>
          </div>
        </body>
      </html>
    `;

		await resend.emails.send({
			from: `Order System <${primaryAdmin}>`,
			to: primaryAdmin,
			subject: `New Order - ${order.orderNumber}`,
			html,
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to send admin notification:", error);
		return { success: false, error };
	}
}
