import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
// Verify that the requester is logged in.
const supabase = await createClient();

const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
return NextResponse.json(
{ error: "You must be logged in to view orders." },
{ status: 401 }
);
}

const { id } = await context.params;

// Validate the order ID before querying the database.
const uuidPattern =
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!uuidPattern.test(id)) {
return NextResponse.json(
{ error: "Invalid order ID." },
{ status: 400 }
);
}

// Use the server-only admin client to read the protected order tables.
const adminSupabase = createAdminClient();

const { data: order, error: orderError } = await adminSupabase
.from("shop_orders")
.select(
"id, order_number, customer_name, customer_email, customer_phone, customer_notes, total_amount, status, created_at"
)
.eq("id", id)
.maybeSingle();

if (orderError) {
console.error("Failed to load order:", orderError.message);

return NextResponse.json(
  { error: "Failed to load order." },
  { status: 500 }
);

}

if (!order) {
return NextResponse.json(
{ error: "Order not found." },
{ status: 404 }
);
}

const { data: items, error: itemsError } = await adminSupabase
.from("shop_order_items")
.select(
"id, product_name, unit_price, quantity, selected_size, selected_colour"
)
.eq("order_id", id)
.order("created_at", { ascending: true });

if (itemsError) {
console.error("Failed to load order items:", itemsError.message);

return NextResponse.json(
  { error: "Failed to load order items." },
  { status: 500 }
);

}

return NextResponse.json({
order: {
...order,
items: items ?? [],
},
});
}

export async function PATCH(request: Request, context: RouteContext) {
  // Verify that the requester is logged in.
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "You must be logged in to update orders." },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      { error: "Invalid order ID." },
      { status: 400 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !("status" in body)) {
    return NextResponse.json(
      { error: "Please provide an order status." },
      { status: 400 }
    );
  }

  const status = body.status;

  const allowedStatuses = [
    "new",
    "confirmed",
    "ready_for_collection",
    "completed",
    "cancelled",
  ];

  if (
    typeof status !== "string" ||
    !allowedStatuses.includes(status)
  ) {
    return NextResponse.json(
      { error: "Invalid order status." },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  const { data: order, error } = await adminSupabase
    .from("shop_orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, order_number, status")
    .maybeSingle();

  if (error) {
    console.error("Failed to update order status:", error.message);

    return NextResponse.json(
      { error: "Failed to update order status." },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json(
      { error: "Order not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: "Order status updated successfully.",
    order,
  });
}