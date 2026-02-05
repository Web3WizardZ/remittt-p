import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6">
        <div className="text-lg font-semibold">Page not found</div>
        <p className="mt-2 text-sm text-[var(--re-muted)]">
          The page you’re looking for doesn’t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block font-semibold text-[var(--re-primary)]"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
