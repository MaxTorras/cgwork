import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";


export async function GET() {
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

  // Fetch orders using the server-only admin client.
  const adminSupabase = createAdminClient();

  const { data: orders, error } = await adminSupabase
    .from("shop_orders")
    .select(
      "id, order_number, customer_name, customer_email, customer_phone, total_amount, status, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load shop orders:", error.message);

    return NextResponse.json(
      { error: "Failed to load orders." },
      { status: 500 }
    );
  }

  return NextResponse.json({ orders });
}