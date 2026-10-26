"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type OrderItem = {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  selected_size: string | null;
  selected_colour: string | null;
};

type ShopOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_notes: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
};

export default function ShopOrderDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-6">
          <p className="text-gray-600">Loading order...</p>
        </main>
      }
    >
      <ShopOrderDetailContent />
    </Suspense>
  );
}

function ShopOrderDetailContent() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<ShopOrder | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [savingStatus, setSavingStatus] = useState(false);
const [statusMessage, setStatusMessage] = useState("");

async function updateOrderStatus(newStatus: string) {
  setSavingStatus(true);
  setStatusMessage("");
  setError("");

  try {
    const response = await fetch(`/api/admin/shop/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to update order status.");
    }

    setOrder((currentOrder) =>
      currentOrder ? { ...currentOrder, status: result.order.status } : null
    );

    setStatusMessage("Order status updated successfully.");
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Something went wrong."
    );
  } finally {
    setSavingStatus(false);
  }
}

  useEffect(() => {
    async function loadOrder() {
      try {
        const response = await fetch(`/api/admin/shop/orders/${orderId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load order.");
        }

        setOrder(result.order);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link
        href="/admin/shop/orders"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to Orders
      </Link>

      {loading ? (
        <p className="mt-6 text-gray-600">Loading order...</p>
      ) : error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : !order ? (
        <p className="mt-6">Order not found.</p>
      ) : (
        <>
          <div className="mb-6 mt-4">
            <h1 className="text-3xl font-bold">
              Order #{order.order_number}
            </h1>

            <p className="mt-2 text-gray-600">
              Placed on{" "}
              {new Date(order.created_at).toLocaleString("en-GB")}
            </p>

            <div className="mt-4">
  <label
    htmlFor="order-status"
    className="mb-2 block text-sm font-semibold"
  >
    Order status
  </label>

  <select
    id="order-status"
    value={order.status}
    onChange={(event) => updateOrderStatus(event.target.value)}
    disabled={savingStatus}
    className="rounded-lg border px-3 py-2"
  >
    <option value="new">New</option>
    <option value="confirmed">Confirmed</option>
    <option value="ready_for_collection">Ready for collection</option>
    <option value="completed">Completed</option>
    <option value="cancelled">Cancelled</option>
  </select>

  {savingStatus && (
    <p className="mt-2 text-sm text-gray-500">Saving status...</p>
  )}

  {statusMessage && (
    <p className="mt-2 text-sm text-green-700">{statusMessage}</p>
  )}

  {error && (
    <p className="mt-2 text-sm text-red-700">{error}</p>
  )}
</div>
          </div>

          <section className="mb-6 rounded-lg border p-5">
            <h2 className="mb-3 text-xl font-semibold">Customer details</h2>

            <p>
              <strong>Name:</strong> {order.customer_name}
            </p>

            <p className="mt-2">
              <strong>Email:</strong>{" "}
              <a
                href={`mailto:${order.customer_email}`}
                className="text-blue-600 hover:underline"
              >
                {order.customer_email}
              </a>
            </p>

            <p className="mt-2">
              <strong>Phone:</strong> {order.customer_phone || "Not provided"}
            </p>

            <p className="mt-2">
              <strong>Customer notes:</strong>
            </p>

            <p className="mt-1 whitespace-pre-wrap text-gray-700">
              {order.customer_notes || "No notes provided."}
            </p>
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-4 text-xl font-semibold">Order items</h2>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold">{item.product_name}</p>

                    <p className="mt-1 text-sm text-gray-600">
                      Quantity: {item.quantity}
                    </p>

                    {item.selected_size && (
                      <p className="text-sm text-gray-600">
                        Size: {item.selected_size}
                      </p>
                    )}

                    {item.selected_colour && (
                      <p className="text-sm text-gray-600">
                        Colour: {item.selected_colour}
                      </p>
                    )}
                  </div>

                  <p className="font-medium">
                    £{(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t pt-4 text-right text-lg font-bold">
              Total: £{Number(order.total_amount).toFixed(2)}
            </div>
          </section>
        </>
      )}
    </main>
  );
}