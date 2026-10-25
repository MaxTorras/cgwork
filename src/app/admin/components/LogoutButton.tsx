"use client";

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error logging out:", error);
      setLoading(false);
      alert("Unable to log out. Please try again.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <button
  type="button"
  onClick={handleLogout}
  disabled={loading}
  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
>
  {loading ? "Logging out..." : "Log out"}
</button>
  );
}