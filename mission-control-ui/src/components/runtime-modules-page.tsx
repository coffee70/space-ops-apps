"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PanelsTopLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchRuntimeModules, type RuntimeModuleRecord } from "@/lib/runtime-registry";
import { getErrorMessage } from "@/lib/api-client";

export function RuntimeModulesPage() {
  const [modules, setModules] = useState<RuntimeModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchRuntimeModules(controller.signal)
      .then((items) => setModules(items))
      .catch((err) => setError(getErrorMessage(err, "Failed to load runtime modules.")))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(67,162,255,0.12),_transparent_40%),linear-gradient(180deg,_rgba(6,18,29,0.98),_rgba(6,18,29,1))] px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-[0.22em] text-sky-300/80 uppercase">
            Runtime Registry
          </p>
          <div className="flex items-center gap-3">
            <PanelsTopLeft className="h-7 w-7 text-sky-300" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Modules</h1>
              <p className="text-sm text-slate-300">
                Active frontend modules discovered from the kernel registry.
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <Card className="border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            Loading runtime modules…
          </Card>
        ) : null}

        {error ? (
          <Card className="border-red-400/30 bg-red-500/10 p-6 text-sm text-red-100">{error}</Card>
        ) : null}

        {!loading && !error && modules.length === 0 ? (
          <Card className="border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No active modules are registered yet. Deploy a `frontend-module` through the control plane
            to surface it here.
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <Card
              key={module.unit_id}
              className="border-white/10 bg-slate-950/60 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.22em] text-sky-300/80 uppercase">
                    {module.status}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{module.display_name}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {module.description || "Registry-managed module"}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <code className="text-xs text-slate-400">{module.unit_id}</code>
                <Button asChild size="sm">
                  <Link href={`/modules/${module.route_slug}`}>Open Module</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
