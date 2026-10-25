import "server-only";
import nodemailer from "nodemailer";

const ADMIN_EMAIL = "max.scotlandfutsal@gmail.com";

const SHOP_EMAIL_USER = process.env.SHOP_EMAIL_USER;
const SHOP_EMAIL_APP_PASSWORD = process.env.SHOP_EMAIL_APP_PASSWORD;

function getTransporter() {
  if (!SHOP_EMAIL_USER || !SHOP_EMAIL_APP_PASSWORD) {
    throw new Error("Missing shop email environment variables.");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: SHOP_EMAIL_USER,
      pass: SHOP_EMAIL_APP_PASSWORD,
    },
  });
}

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

function escapeHtml(value: string): string {
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

function formatOrderItems(items: OrderEmailItem[]) {
  const text = items
    .map((item) => {
      const options = [
        item.selected_size ? `Size: ${item.selected_size}` : "",
        item.selected_colour ? `Colour: ${item.selected_colour}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return `${item.product_name} x ${item.quantity}${
        options ? ` (${options})` : ""
      } — £${(item.unit_price * item.quantity).toFixed(2)}`;
    })
    .join("\n");

  const html = items
    .map((item) => {
      const options = [
        item.selected_size ? `Size: ${item.selected_size}` : "",
        item.selected_colour ? `Colour: ${item.selected_colour}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return `
        <li>
          ${escapeHtml(item.product_name)} × ${item.quantity}
          ${options ? ` — ${escapeHtml(options)}` : ""}
          — £${(item.unit_price * item.quantity).toFixed(2)}
        </li>
      `;
    })
    .join("");

  return { text, html };
}

export async function sendShopOrderEmails(order: OrderEmailDetails) {
  const transporter = getTransporter();

  const { text: itemsText, html: itemsHtml } = formatOrderItems(order.items);

  const customerEmailHtml = `
    <h2>Thank you for your order!</h2>
    <p>Hi ${escapeHtml(order.customerName)},</p>
    <p>We've received your order successfully.</p>
    <p><strong>Order number:</strong> ${order.orderNumber}</p>
    <h3>Order details</h3>
    <ul>${itemsHtml}</ul>
    <p><strong>Total: £${order.totalAmount.toFixed(2)}</strong></p>
    <p>Payment and collection will be arranged separately.</p>
    <p>Thank you for supporting Edinburgh Inter!</p>
  `;

  const customerEmailText = `
Hi ${order.customerName},

Thank you for your order! We've received it successfully.

Order number: ${order.orderNumber}

Order details:
${itemsText}

Total: £${order.totalAmount.toFixed(2)}

Payment and collection will be arranged separately.

Thank you for supporting Edinburgh Inter!
  `.trim();

  const adminEmailHtml = `
    <h2>New shop order received</h2>
    <p><strong>Order number:</strong> ${order.orderNumber}</p>
    <p><strong>Customer:</strong> ${escapeHtml(order.customerName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(order.customerEmail)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(order.customerPhone || "Not provided")}</p>
    <h3>Order details</h3>
    <ul>${itemsHtml}</ul>
    <p><strong>Total: £${order.totalAmount.toFixed(2)}</strong></p>
    <p><strong>Customer notes:</strong><br />
      ${escapeHtml(order.customerNotes || "None")}
    </p>
  `;

  const adminEmailText = `
A new shop order has been placed.

Order number: ${order.orderNumber}
Customer: ${order.customerName}
Email: ${order.customerEmail}
Phone: ${order.customerPhone || "Not provided"}

Order details:
${itemsText}

Total: £${order.totalAmount.toFixed(2)}

Customer notes:
${order.customerNotes || "None"}
  `.trim();

  // Send the customer email independently.
  let customerEmailSent = false;

  try {
    await transporter.sendMail({
      from: {
        name: "Edinburgh Inter Shop",
        address: SHOP_EMAIL_USER!,
      },
      to: order.customerEmail,
      subject: `Order confirmation #${order.orderNumber}`,
      text: customerEmailText,
      html: customerEmailHtml,
    });

    customerEmailSent = true;
  } catch (error) {
    console.error("Customer order email failed:", error);
  }

  // Attempt the admin email even if the customer email fails.
  let adminEmailSent = false;

  try {
    await transporter.sendMail({
      from: {
        name: "Edinburgh Inter Shop",
        address: SHOP_EMAIL_USER!,
      },
      to: ADMIN_EMAIL,
      replyTo: order.customerEmail,
      subject: `New shop order #${order.orderNumber}`,
      text: adminEmailText,
      html: adminEmailHtml,
    });

    adminEmailSent = true;
  } catch (error) {
    console.error("Admin order email failed:", error);
  }

  return {
    customerEmailSent,
    adminEmailSent,
  };
}