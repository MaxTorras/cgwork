"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ShopOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total_amount: number;
  status: string;
  created_at: string;
};

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/admin/shop/orders");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load orders.");
        }

        setOrders(result.orders ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);
const filteredOrders =
  statusFilter === "all"
    ? orders
    : orders.filter((order) => order.status === statusFilter);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <Link
          href="/admin/shop"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Shop
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Shop Orders</h1>

<p className="mt-2 text-gray-600">
  View incoming orders and their current status.
</p>

<div className="mt-4 flex flex-wrap items-center gap-3">
  <label htmlFor="status-filter" className="text-sm font-medium">
    Filter by status:
  </label>

  <select
    id="status-filter"
    value={statusFilter}
    onChange={(event) => setStatusFilter(event.target.value)}
    className="rounded-lg border px-3 py-2 text-sm"
  >
    <option value="all">All orders</option>
    <option value="new">New</option>
    <option value="confirmed">Confirmed</option>
    <option value="ready_for_collection">Ready for collection</option>
    <option value="completed">Completed</option>
    <option value="cancelled">Cancelled</option>
  </select>

  <span className="text-sm text-gray-500">
    {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
  </span>
</div>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading orders...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-lg font-semibold">
  {orders.length === 0 ? "No orders yet" : "No matching orders"}
</h2>

<p className="mt-2 text-gray-600">
  {orders.length === 0
    ? "New shop orders will appear here."
    : "There are no orders with this status."}
</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-semibold">Order</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Customer</th>
                <th className="p-3 font-semibold">Contact</th>
                <th className="p-3 font-semibold">Total</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3 font-semibold">
  <Link
    href={`/admin/shop/orders/${order.id}`}
    className="text-blue-600 hover:underline"
  >
    #{order.order_number}
  </Link>
</td>

                  <td className="whitespace-nowrap p-3">
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  <td className="p-3">{order.customer_name}</td>

                  <td className="p-3">
                    <a
                      href={`mailto:${order.customer_email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {order.customer_email}
                    </a>

                    {order.customer_phone && (
                      <div className="mt-1 text-gray-500">
                        {order.customer_phone}
                      </div>
                    )}
                  </td>

                  <td className="whitespace-nowrap p-3">
                    £{Number(order.total_amount).toFixed(2)}
                  </td>

                  <td className="p-3">
                    <span
  className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${
    order.status === "new"
      ? "bg-blue-100 text-blue-800"
      : order.status === "confirmed"
        ? "bg-purple-100 text-purple-800"
        : order.status === "ready_for_collection"
          ? "bg-amber-100 text-amber-800"
          : order.status === "completed"
            ? "bg-green-100 text-green-800"
            : order.status === "cancelled"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
  }`}
>
  {order.status.replaceAll("_", " ")}
</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}