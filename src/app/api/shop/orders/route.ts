import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendShopOrderEmails } from "@/lib/shop-email";

type OrderItemInput = {
  productId: string;
  quantity: number;
  size?: string;
  colour?: string;
};

type OrderInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNotes?: string;
  items: OrderItemInput[];
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid order details." },
        { status: 400 }
      );
    }

    const input = body as Partial<OrderInput>;

    const customerName =
      typeof input.customerName === "string"
        ? input.customerName.trim()
        : "";

    const customerEmail =
      typeof input.customerEmail === "string"
        ? input.customerEmail.trim().toLowerCase()
        : "";

    const customerPhone =
      typeof input.customerPhone === "string"
        ? input.customerPhone.trim()
        : "";

    const customerNotes =
      typeof input.customerNotes === "string"
        ? input.customerNotes.trim()
        : "";

    if (!customerName || customerName.length > 120) {
      return NextResponse.json(
        { error: "Please provide a valid name (maximum 120 characters)." },
        { status: 400 }
      );
    }

    if (
      !customerEmail ||
      customerEmail.length > 254 ||
      !emailPattern.test(customerEmail)
    ) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (customerPhone.length > 40 || customerNotes.length > 1000) {
      return NextResponse.json(
        { error: "Your phone number or notes are too long." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(input.items) ||
      input.items.length === 0 ||
      input.items.length > 50
    ) {
      return NextResponse.json(
        { error: "Your basket is empty or contains too many items." },
        { status: 400 }
      );
    }

    const items: OrderItemInput[] = [];

    for (const rawItem of input.items) {
      if (!rawItem || typeof rawItem !== "object") {
        return NextResponse.json(
          { error: "Invalid basket item." },
          { status: 400 }
        );
      }

      const item = rawItem as OrderItemInput;

      if (
        !isString(item.productId) ||
        !uuidPattern.test(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 100 ||
        (item.size !== undefined && !isString(item.size)) ||
        (item.colour !== undefined && !isString(item.colour))
      ) {
        return NextResponse.json(
          { error: "One or more basket items are invalid." },
          { status: 400 }
        );
      }

      if (
        (item.size?.length ?? 0) > 50 ||
        (item.colour?.length ?? 0) > 50
      ) {
        return NextResponse.json(
          { error: "A selected size or colour is too long." },
          { status: 400 }
        );
      }

      items.push({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size?.trim() || undefined,
        colour: item.colour?.trim() || undefined,
      });
    }

    const supabase = createAdminClient();

    const productIds = [...new Set(items.map((item) => item.productId))];

    const { data: products, error: productsError } = await supabase
      .from("shop_products")
      .select("id, name, price, sizes, colours, is_available, is_published")
      .in("id", productIds);

    if (productsError) {
      console.error("Could not retrieve shop products:", productsError);

      return NextResponse.json(
        { error: "Unable to validate your basket. Please try again." },
        { status: 500 }
      );
    }

    const productMap = new Map(
      (products ?? []).map((product) => [product.id, product])
    );

    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product || !product.is_available || !product.is_published) {
        return NextResponse.json(
          { error: "A product in your basket is no longer available." },
          { status: 400 }
        );
      }

      const sizes = Array.isArray(product.sizes)
        ? product.sizes.filter((value): value is string => typeof value === "string")
        : [];

      const colours = Array.isArray(product.colours)
        ? product.colours.filter((value): value is string => typeof value === "string")
        : [];

      if (sizes.length > 0 && (!item.size || !sizes.includes(item.size))) {
        return NextResponse.json(
          { error: `Please select a valid size for ${product.name}.` },
          { status: 400 }
        );
      }

      if (sizes.length === 0 && item.size) {
        return NextResponse.json(
          { error: `The selected size is not valid for ${product.name}.` },
          { status: 400 }
        );
      }

      if (
        colours.length > 0 &&
        (!item.colour || !colours.includes(item.colour))
      ) {
        return NextResponse.json(
          { error: `Please select a valid colour for ${product.name}.` },
          { status: 400 }
        );
      }

      if (colours.length === 0 && item.colour) {
        return NextResponse.json(
          { error: `The selected colour is not valid for ${product.name}.` },
          { status: 400 }
        );
      }

      const unitPrice = Number(product.price);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          { error: "A product has an invalid price. Please contact us." },
          { status: 500 }
        );
      }

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity: item.quantity,
        selected_size: item.size ?? null,
        selected_colour: item.colour ?? null,
      });
    }

    const totalAmount = Math.round(
      orderItems.reduce(
        (total, item) => total + item.unit_price * item.quantity,
        0
      ) * 100
    ) / 100;

    if (!Number.isFinite(totalAmount) || totalAmount > 1_000_000) {
      return NextResponse.json(
        { error: "The order total is invalid." },
        { status: 400 }
      );
    }

    const { data: createdOrders, error: orderError } = await supabase.rpc(
  "create_shop_order",
  {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone || null,
    p_customer_notes: customerNotes || null,
    p_total_amount: totalAmount,
    p_items: orderItems,
  }
);

if (orderError || !createdOrders || createdOrders.length === 0) {
  console.error("Could not create shop order:", orderError);

  return NextResponse.json(
    { error: "We couldn't place your order. Please try again." },
    { status: 500 }
  );
}

const order = createdOrders[0];

// Send confirmation and admin notification emails.
// Email failures must not turn a successful order into a failed checkout.
try {
  const emailResults = await sendShopOrderEmails({
    orderNumber: order.order_number,
    customerName,
    customerEmail,
    customerPhone: customerPhone || null,
    customerNotes: customerNotes || null,
    totalAmount,
    items: orderItems,
  });

  if (!emailResults.customerEmailSent || !emailResults.adminEmailSent) {
    console.error("One or more shop order emails could not be sent.", {
      orderNumber: order.order_number,
      ...emailResults,
    });
  }
} catch (emailError) {
  console.error("Unexpected shop order email error:", emailError);
}

return NextResponse.json(
  {
    message: "Your order has been placed successfully.",
    orderNumber: order.order_number,
    totalAmount,
  },
  { status: 201 }
);
  } catch (error) {
    console.error("Unexpected shop order error:", error);

    return NextResponse.json(
      { error: "Something went wrong while placing your order." },
      { status: 500 }
    );
  }
}