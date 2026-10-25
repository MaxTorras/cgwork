"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type Product = {
id: string;
name: string;
description: string | null;
price: number;
image_url: string | null;
sizes: string[];
colours: string[];
is_available: boolean;
is_published: boolean;
};

type BasketItem = {
key: string;
productId: string;
name: string;
price: number;
imageUrl: string | null;
size: string;
colour: string;
quantity: number;
};

const basketStorageKey = "edinburgh-inter-shop-basket";

const inputClass =
"w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus focus";

export default function ShopPage() {
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [basket, setBasket] = useState<BasketItem[]>([]);
const [basketReady, setBasketReady] = useState(false);
const [basketMessage, setBasketMessage] = useState("");
const [basketOpen, setBasketOpen] = useState(false);

const [customerName, setCustomerName] = useState("");
const [customerEmail, setCustomerEmail] = useState("");
const [customerPhone, setCustomerPhone] = useState("");
const [customerNotes, setCustomerNotes] = useState("");

const [orderSubmitting, setOrderSubmitting] = useState(false);
const [orderError, setOrderError] = useState("");
const [orderConfirmation, setOrderConfirmation] = useState<{
  orderNumber: number;
  totalAmount: number;
} | null>(null);

const [selections, setSelections] = useState<
  Record<string, { size: string; colour: string }>
>(() => ({}));

const supabase = createClient();

useEffect(() => {
let active = true;

async function loadProducts() {
  const { data, error } = await supabase
    .from("shop_products")
    .select("*")
    .eq("is_published", true)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (!active) return;

  if (error) {
    setError(
      "We couldn't load the shop at the moment. Please try again later."
    );
  } else {
    setProducts((data ?? []) as Product[]);
  }

  setLoading(false);
}

loadProducts();

return () => {
  active = false;
};

}, []);

useEffect(() => {
try {
const stored = localStorage.getItem(basketStorageKey);

  if (stored) {
    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      setBasket(parsed);
    }
  }
} catch {
  localStorage.removeItem(basketStorageKey);
} finally {
  setBasketReady(true);
}

}, []);

useEffect(() => {
if (!basketReady) return;

localStorage.setItem(basketStorageKey, JSON.stringify(basket));

}, [basket, basketReady]);

const basketCount = basket.reduce(
(total, item) => total + item.quantity,
0
);

const basketTotal = basket.reduce(
(total, item) => total + item.price * item.quantity,
0
);

function updateSelection(
productId: string,
field: "size" | "colour",
value: string
) {
setSelections((current) => ({
...current,
[productId]: {
size: current[productId]?.size ?? "",
colour: current[productId]?.colour ?? "",
[field]: value,
},
}));
}

function addToBasket(product: Product) {
setBasketMessage("");

const selection = selections[product.id] ?? {
  size: "",
  colour: "",
};

if (product.sizes?.length > 0 && !selection.size) {
  setBasketMessage(`Please select a size for ${product.name}.`);
  return;
}

if (product.colours?.length > 0 && !selection.colour) {
  setBasketMessage(`Please select a colour for ${product.name}.`);
  return;
}

const key = `${product.id}::${selection.size}::${selection.colour}`;

setBasket((current) => {
  const existing = current.find((item) => item.key === key);

  if (existing) {
    return current.map((item) =>
      item.key === key
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
  }

  return [
    ...current,
    {
      key,
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.image_url,
      size: selection.size,
      colour: selection.colour,
      quantity: 1,
    },
  ];
});

setBasketMessage(`${product.name} added to your basket.`);

}

function changeQuantity(key: string, change: number) {
setBasket((current) =>
current
.map((item) =>
item.key === key
? { ...item, quantity: item.quantity + change }
: item
)
.filter((item) => item.quantity > 0)
);
}

function removeFromBasket(key: string) {
setBasket((current) => current.filter((item) => item.key !== key));
}

async function submitOrder(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (basket.length === 0 || orderSubmitting) {
    return;
  }

  setOrderError("");
  setOrderConfirmation(null);
  setOrderSubmitting(true);

  try {
    const response = await fetch("/api/shop/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName,
        customerEmail,
        customerPhone,
        customerNotes,
        items: basket.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size || undefined,
          colour: item.colour || undefined,
        })),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "We couldn't place your order.");
    }

    setOrderConfirmation({
      orderNumber: result.orderNumber,
      totalAmount: result.totalAmount,
    });

    setBasket([]);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerNotes("");
    setBasketMessage("");
  } catch (error) {
    setOrderError(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."
    );
  } finally {
    setOrderSubmitting(false);
  }
}

return (
<main className="min-h-screen bg-gray-50">
<header className="border-b border-gray-200 bg-white">
<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
<Link
         href="/shop"
         className="text-xl font-bold tracking-tight text-gray-900"
       >
Edinburgh Inter Shop
</Link>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setBasketOpen((open) => !open)}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Basket ({basketCount})
        </button>

        <Link
          href="/"
          className="hidden text-sm font-medium text-gray-600 hover:text-indigo-600 sm:block"
        >
          Back to website
        </Link>
      </div>
    </div>
  </header>

  <section className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
    <div className="mb-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
        Official club merchandise
      </p>

      <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        The Club Shop
      </h1>

      <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
        Explore Edinburgh Inter merchandise, including kits, training
        clothing and club accessories.
      </p>
    </div>

    {basketMessage && (
      <div
        role="status"
        className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800"
      >
        {basketMessage}
      </div>
    )}

    {basketOpen && (
      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Your basket
          </h2>

          <button
            type="button"
            onClick={() => setBasketOpen(false)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Continue shopping
          </button>
        </div>

        {basket.length === 0 ? (
          <p className="mt-6 text-gray-600">
            Your basket is empty. Add a product to get started.
          </p>
        ) : (
          <>
            <div className="mt-6 divide-y divide-gray-200">
              {basket.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                      No image
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.name}
                    </h3>

                    {(item.size || item.colour) && (
                      <p className="mt-1 text-sm text-gray-600">
                        {[
                          item.size && `Size: ${item.size}`,
                          item.colour && `Colour: ${item.colour}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-gray-600">
                      £{item.price.toFixed(2)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      onClick={() => changeQuantity(item.key, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-lg text-gray-800 hover:bg-gray-50"
                    >
                      −
                    </button>

                    <span className="min-w-5 text-center font-medium text-gray-900">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      onClick={() => changeQuantity(item.key, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-lg text-gray-800 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <p className="font-semibold text-gray-900">
                      £{(item.price * item.quantity).toFixed(2)}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeFromBasket(item.key)}
                      className="mt-1 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
              <div>
                <p className="text-sm text-gray-600">
                  {basketCount} {basketCount === 1 ? "item" : "items"}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  Total: £{basketTotal.toFixed(2)}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Payment and collection will be arranged separately.
              </p>
            </div>
            {orderConfirmation && (
  <div
    role="status"
    className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5 text-green-800"
  >
    <h3 className="text-lg font-bold">Order placed successfully!</h3>

    <p className="mt-2">
      Your order number is #{orderConfirmation.orderNumber}.
    </p>

    <p className="mt-1">
      Order total: £{orderConfirmation.totalAmount.toFixed(2)}
    </p>

    <p className="mt-2 text-sm">
      Payment and collection will be arranged separately.
    </p>
  </div>
)}

{basket.length > 0 && !orderConfirmation && (
  <form
    onSubmit={submitOrder}
    className="mt-8 border-t border-gray-200 pt-6"
  >
    <h3 className="text-xl font-bold text-gray-900">
      Your details
    </h3>

    <p className="mt-2 text-sm text-gray-600">
      Enter your details to place your order. Payment and collection
      will be arranged separately.
    </p>

    {orderError && (
      <div
        role="alert"
        className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        {orderError}
      </div>
    )}

    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div>
        <label
          htmlFor="customer-name"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Full name *
        </label>

        <input
          id="customer-name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="customer-email"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Email address *
        </label>

        <input
          id="customer-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={customerEmail}
          onChange={(event) => setCustomerEmail(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="customer-phone"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Phone number (optional)
        </label>

        <input
          id="customer-phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="customer-notes"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Additional notes (optional)
        </label>

        <textarea
          id="customer-notes"
          rows={3}
          maxLength={1000}
          value={customerNotes}
          onChange={(event) => setCustomerNotes(event.target.value)}
          className={inputClass}
        />
      </div>
    </div>

    <button
      type="submit"
      disabled={orderSubmitting}
      className="mt-6 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {orderSubmitting ? "Placing order..." : "Place order"}
    </button>

    <p className="mt-3 text-xs text-gray-500">
      Submitting this order does not take payment.
    </p>
  </form>
)}
          </>
        )}
      </section>
    )}

    {loading && (
      <div className="py-16 text-center">
        <p className="text-gray-600">Loading products...</p>
      </div>
    )}

    {error && (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800"
      >
        {error}
      </div>
    )}

    {!loading && !error && products.length === 0 && (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          The shop is getting ready
        </h2>

        <p className="mt-3 text-gray-600">
          There are no products available at the moment. Please check back
          soon.
        </p>
      </div>
    )}

    {!loading && !error && products.length > 0 && (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => {
          const selection = selections[product.id] ?? {
            size: "",
            colour: "",
          };

          return (
            <article
              key={product.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
            >
              <div className="aspect-square bg-gray-100">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Image coming soon
                  </div>
                )}
              </div>

              <div className="p-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {product.name}
                </h2>

                <p className="mt-2 text-xl font-bold text-gray-900">
                  £{Number(product.price).toFixed(2)}
                </p>

                {product.description && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                    {product.description}
                  </p>
                )}

                {product.sizes?.length > 0 && (
                  <div className="mt-4">
                    <label
                      htmlFor={`size-${product.id}`}
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Size
                    </label>

                    <select
                      id={`size-${product.id}`}
                      value={selection.size}
                      onChange={(event) =>
                        updateSelection(
                          product.id,
                          "size",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">Select a size</option>
                      {product.sizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {product.colours?.length > 0 && (
                  <div className="mt-4">
                    <label
                      htmlFor={`colour-${product.id}`}
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Colour
                    </label>

                    <select
                      id={`colour-${product.id}`}
                      value={selection.colour}
                      onChange={(event) =>
                        updateSelection(
                          product.id,
                          "colour",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">Select a colour</option>
                      {product.colours.map((colour) => (
                        <option key={colour} value={colour}>
                          {colour}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => addToBasket(product)}
                  className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Add to basket
                </button>
              </div>
            </article>
          );
        })}
      </div>
    )}
  </section>

  <footer className="border-t border-gray-200 bg-white">
    <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-gray-500 sm:px-10">
      Edinburgh Inter · Official Club Merchandise
    </div>
  </footer>
</main>

);
}