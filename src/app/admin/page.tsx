// src\app\admin\page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase-server";
import { connection } from "next/server";
import type { Metadata } from "next";
import LogoutButton from "@/app/admin/components/LogoutButton";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading admin...</p>}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900">
          cgwork Admin
        </h1>

       <div className="mt-2 flex flex-wrap items-center gap-4">
  <p className="text-gray-600">
    Welcome to your workspace.
  </p>

  <Link
    href="/"
    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
  >
    ← Main website
  </Link>

  <LogoutButton />
</div>

       <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/forms"
            className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-indigo-400 hover:shadow-sm"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              Forms
            </h2>
            <p className="mt-2 text-gray-600">
              Create forms, publish them, and manage existing forms.
            </p>
            <span className="mt-4 inline-block font-medium text-indigo-600">
              Manage forms →
            </span>
          </Link>

          <Link
            href="/admin/submissions"
            className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-indigo-400 hover:shadow-sm"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              Submissions
            </h2>
            <p className="mt-2 text-gray-600">
              View the answers people have submitted.
            </p>
            <span className="mt-4 inline-block font-medium text-indigo-600">
              View submissions →
            </span>
          </Link>
          <Link
  href="/admin/calendar"
  className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-indigo-400 hover:shadow-sm"
>
  <h2 className="text-xl font-semibold text-gray-900">
    Calendar
  </h2>

  <p className="mt-2 text-gray-600">
    Organise events, meetings and deadlines in one place.
  </p>

  <span className="mt-4 inline-block font-medium text-indigo-600">
    Open calendar →
  </span>
</Link>
<Link
  href="/admin/shop"
  className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-indigo-400 hover:shadow-sm"
>
  <h2 className="text-xl font-semibold text-gray-900">
    Shop
  </h2>

  <p className="mt-2 text-gray-600">
    Manage club merchandise, products and availability.
  </p>

  <span className="mt-4 inline-block font-medium text-indigo-600">
    Manage shop →
  </span>
</Link>
        </section>
      </div>
    </main>
  );
}