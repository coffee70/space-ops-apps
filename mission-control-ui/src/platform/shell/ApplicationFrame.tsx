import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ApplicationUnavailableState({
  title = "Application unavailable",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-10">
      <div className="bg-background/95 w-full max-w-xl rounded-2xl border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-300">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-300/90 uppercase">Platform Shell</p>
            <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
            <p className="text-muted-foreground mt-3 leading-6">{description}</p>
            <Button asChild className="mt-6">
              <Link href="/apps/overview">Return to Overview</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
