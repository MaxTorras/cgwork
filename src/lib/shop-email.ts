import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = "max.scotlandfutsal@gmail.com";

// Resend's test sender.
// This is for testing; production emails will need a verified sending domain.
const FROM_EMAIL = "onboarding@resend.dev";

type OrderEmailItem = {
  product_name: string;
  unit_price: number;
  quantity: number;
  selected_size: string | null;
  selected_colour: string | null;
};

type OrderEmailDetails = {
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerNotes: string | null;
  totalAmount: number;
  items: OrderEmailItem[];
};

export async function sendShopOrderEmails(order: OrderEmailDetails) {
  const itemLines = order.items.map((item) => {
    const options = [
      item.selected_size ? `Size: ${item.selected_size}` : "",
      item.selected_colour ? `Colour: ${item.selected_colour}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    return `${item.product_name} x ${item.quantity}${
      options ? ` (${options})` : ""
    } — £${(item.unit_price * item.quantity).toFixed(2)}`;
  });

  const itemsText = itemLines.join("\n");
  const itemsHtml = order.items
    .map((item) => {
      const options = [
        item.selected_size ? `Size: ${item.selected_size}` : "",
        item.selected_colour ? `Colour: ${item.selected_colour}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return `<li>${escapeHtml(item.product_name)} × ${item.quantity}${
        options ? ` — ${escapeHtml(options)}` : ""
      } — £${(item.unit_price * item.quantity).toFixed(2)}</li>`;
    })
    .join("");

  const customerResult = await resend.emails.send({
    from: FROM_EMAIL,
    to: [order.customerEmail],
    subject: `Order confirmation #${order.orderNumber}`,
    text: `Hi ${order.customerName},

Thank you for your order! We've received it successfully.

Order number: ${order.orderNumber}

Items:
${itemsText}

Total: £${order.totalAmount.toFixed(2)}

Payment and collection will be arranged separately.

Thank you!`,
    html: `
      <h2>Thank you for your order!</h2>
      <p>Hi ${escapeHtml(order.customerName)}, we've received your order.</p>
      <p><strong>Order number:</strong> ${order.orderNumber}</p>
      <h3>Items</h3>
      <ul>${itemsHtml}</ul>
      <p><strong>Total: £${order.totalAmount.toFixed(2)}</strong></p>
      <p>Payment and collection will be arranged separately.</p>
      <p>Thank you!</p>
    `,
  });

  if (customerResult.error) {
    console.error("Customer order email failed:", customerResult.error);
  }

  const adminResult = await resend.emails.send({
    from: FROM_EMAIL,
    to: [ADMIN_EMAIL],
    replyTo: order.customerEmail,
    subject: `New shop order #${order.orderNumber}`,
    text: `A new shop order has been placed.

Order number: ${order.orderNumber}
Customer: ${order.customerName}
Email: ${order.customerEmail}
Phone: ${order.customerPhone || "Not provided"}

Items:
${itemsText}

Total: £${order.totalAmount.toFixed(2)}

Customer notes:
${order.customerNotes || "None"}`,
    html: `
      <h2>New shop order received</h2>
      <p><strong>Order number:</strong> ${order.orderNumber}</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.customerName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(order.customerEmail)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(order.customerPhone || "Not provided")}</p>
      <h3>Items</h3>
      <ul>${itemsHtml}</ul>
      <p><strong>Total: £${order.totalAmount.toFixed(2)}</strong></p>
      <p><strong>Customer notes:</strong><br />${escapeHtml(order.customerNotes || "None")}</p>
    `,
  });

  if (adminResult.error) {
    console.error("Admin order email failed:", adminResult.error);
  }

  return {
    customerEmailSent: !customerResult.error,
    adminEmailSent: !adminResult.error,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}
