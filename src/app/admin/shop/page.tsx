"use client";

import { useEffect, useState } from "react";
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
  created_at: string;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none";

export default function AdminShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState("");
  const [colours, setColours] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function fetchProducts() {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setError(`Could not load products: ${error.message}`);
      } else {
        setProducts((data ?? []) as Product[]);
      }

      setLoading(false);
    }

    fetchProducts();

    return () => {
      active = false;
    };
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("shop_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Could not refresh products: ${error.message}`);
    }

    setProducts((data ?? []) as Product[]);
  }

  function parseList(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setSizes("");
    setColours("");
    setIsAvailable(true);
    setIsPublished(false);
    setImage(null);
    setImagePreview("");
    setCurrentImageUrl(null);
    setEditingId(null);
    setShowForm(false);
  }

  function startEditing(product: Product) {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description ?? "");
    setPrice(String(product.price));
    setSizes((product.sizes ?? []).join(", "));
    setColours((product.colours ?? []).join(", "));
    setIsAvailable(product.is_available);
    setIsPublished(product.is_published);
    setImage(null);
    setImagePreview(product.image_url ?? "");
    setCurrentImageUrl(product.image_url);
    setShowForm(true);
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleImageChange(file: File | null) {
    setImage(file);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(currentImageUrl ?? "");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const numericPrice = Number(price);

    if (!trimmedName) {
      setError("Please enter a product name.");
      return;
    }

    if (
      price.trim() === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError("Please enter a valid price of £0 or more.");
      return;
    }

    if (image) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
        setError("Please upload a JPG, PNG or WebP image.");
        return;
      }

      if (image.size > 5 * 1024 * 1024) {
        setError("The image must be no larger than 5 MB.");
        return;
      }
    }

    setSaving(true);

    let uploadedImagePath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please sign in again before saving a product.");
      }

      let imageUrl = currentImageUrl;

      if (image) {
        const extension = image.name.split(".").pop()?.toLowerCase();

        const safeExtension =
          extension && ["jpg", "jpeg", "png", "webp"].includes(extension)
            ? extension
            : "jpg";

        const imagePath = `${crypto.randomUUID()}.${safeExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("shop-images")
          .upload(imagePath, image, {
            contentType: image.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        uploadedImagePath = imagePath;

        const { data: publicUrlData } = supabase.storage
          .from("shop-images")
          .getPublicUrl(imagePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const productData = {
        name: trimmedName,
        description: description.trim() || null,
        price: numericPrice,
        image_url: imageUrl,
        sizes: parseList(sizes),
        colours: parseList(colours),
        is_available: isAvailable,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("shop_products")
          .update(productData)
          .eq("id", editingId);

        if (updateError) {
          throw new Error(`Could not update product: ${updateError.message}`);
        }
      } else {
        const { error: insertError } = await supabase
          .from("shop_products")
          .insert(productData);

        if (insertError) {
          throw new Error(`Could not save product: ${insertError.message}`);
        }
      }

      const wasEditing = Boolean(editingId);

      resetForm();

      try {
        await loadProducts();
      } catch (refreshError) {
        console.error(refreshError);
      }

      setSuccess(
        wasEditing
          ? `"${trimmedName}" has been updated successfully.`
          : `"${trimmedName}" has been added successfully.`
      );
    } catch (err) {
      if (uploadedImagePath) {
        const { error: cleanupError } = await supabase.storage
          .from("shop-images")
          .remove([uploadedImagePath]);

        if (cleanupError) {
          console.error("Could not clean up uploaded image:", cleanupError);
        }
      }

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(product.id);

    try {
      const { error: deleteError } = await supabase
        .from("shop_products")
        .delete()
        .eq("id", product.id);

      if (deleteError) {
        throw new Error(`Could not delete product: ${deleteError.message}`);
      }

      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      if (editingId === product.id) {
        resetForm();
      }

      setSuccess(`"${product.name}" has been deleted.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the product."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Shop management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage club kits, sweaters, water bottles and other merchandise.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setError("");
                setSuccess("");
                setShowForm(true);
              }
            }}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
          >
            {showForm ? "Cancel" : "+ Add product"}
          </button>
        </div>

        {success && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {success}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {showForm && (
          <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingId ? "Edit product" : "Add a product"}
            </h2>

            <form
              className="mt-6 grid gap-5 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <div>
                <label
                  htmlFor="product-name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Product name *
                </label>
                <input
                  id="product-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Edinburgh Inter Home Kit"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="product-price"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Price (£) *
                </label>
                <input
                  id="product-price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="35.00"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="product-description"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="product-description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the product..."
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="product-sizes"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Available sizes
                </label>
                <input
                  id="product-sizes"
                  value={sizes}
                  onChange={(event) => setSizes(event.target.value)}
                  placeholder="XS, S, M, L, XL"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-600">
                  Separate sizes with commas.
                </p>
              </div>

              <div>
                <label
                  htmlFor="product-colours"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Available colours
                </label>
                <input
                  id="product-colours"
                  value={colours}
                  onChange={(event) => setColours(event.target.value)}
                  placeholder="Black, White"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-600">
                  Separate colours with commas.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="product-image"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Product image
                </label>
                <input
                  id="product-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    handleImageChange(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-sm text-gray-900 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />

                <p className="mt-1 text-xs text-gray-600">
                  Leave empty to keep the current image.
                </p>

                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="mt-4 h-40 w-40 rounded-lg border border-gray-200 object-cover"
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="available"
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(event) => setIsAvailable(event.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <label htmlFor="available" className="text-sm text-gray-800">
                  Product is available
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="published"
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <label htmlFor="published" className="text-sm text-gray-800">
                  Publish in the public shop
                </label>
              </div>

              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Save product"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Products</h2>

            <span className="text-sm text-gray-600">
              {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </span>
          </div>

          {loading && (
            <p className="mt-4 text-gray-600">Loading products...</p>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="mt-6 rounded-lg bg-gray-50 p-8 text-center">
              <h3 className="font-semibold text-gray-900">No products yet</h3>
              <p className="mt-2 text-sm text-gray-600">
                Click Add product to create your first shop item.
              </p>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="px-3 py-3 font-medium">Product</th>
                    <th className="px-3 py-3 font-medium">Price</th>
                    <th className="px-3 py-3 font-medium">Availability</th>
                    <th className="px-3 py-3 font-medium">Visibility</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-14 w-14 rounded-lg border border-gray-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                              No image
                            </div>
                          )}

                          <div>
                            <p className="font-medium text-gray-900">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              {product.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-gray-900">
                        £{Number(product.price).toFixed(2)}
                      </td>

                      <td className="px-3 py-4 text-gray-800">
                        {product.is_available ? "Available" : "Unavailable"}
                      </td>

                      <td className="px-3 py-4 text-gray-800">
                        {product.is_published ? "Published" : "Hidden"}
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(product)}
                            disabled={saving || deletingId !== null}
                            className="rounded-md border border-indigo-200 px-3 py-2 font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            disabled={saving || deletingId !== null}
                            className="rounded-md border border-red-200 px-3 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === product.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}