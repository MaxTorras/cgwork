import Link from "next/link";

const sections = [
  {
    title: "Workspace",
    description: "Organise your tasks, notes and projects.",
  },
  {
    title: "Forms",
    description: "Create forms and collect responses.",
  },
  {
    title: "Information",
    description: "Share useful information with others.",
  },
  {
    title: "Events & Tournaments",
    description: "Manage events, schedules and results.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
  <div>
    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
      CG
    </h1>

<p className="mt-2 text-gray-600">
  Your shared workspace.
</p>

  </div>

  <Link
    href="/admin/login"
    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-700"
  >
    Admin Login
  </Link>
</header>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome!
          </h2>

          <p className="mt-2 text-gray-600">
            Everything you need to work together, in one place.
          </p>
        </section>

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                {section.title}
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                {section.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}