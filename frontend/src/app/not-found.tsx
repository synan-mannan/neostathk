import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg px-6 py-10 text-center sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-highlight">
          <CircleHelp className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
          Error 404
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text">
          Page not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          The page you’re looking for may have moved or no longer exists.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60 motion-reduce:transition-none"
        >
          <ArrowLeft className="h-4 w-4" />
          Return home
        </Link>
      </Card>
    </div>
  );
}
