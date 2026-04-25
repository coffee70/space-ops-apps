"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { PlatformApplicationDefinition } from "@/platform/registry/application-types";
import {
  sanitizeApplicationColor,
  sortApplications,
} from "@/platform/registry/application-types";
import { resolveApplicationIcon } from "@/platform/shell/application-icons";
import { cn } from "@/lib/utils";

export function ApplicationsLauncher({
  applications,
  currentApplicationId,
  open,
  onOpenChange,
  onOpenApplication,
}: {
  applications: PlatformApplicationDefinition[];
  currentApplicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenApplication: (application: PlatformApplicationDefinition) => void;
}) {
  const [search, setSearch] = useState("");
  const enabledApplications = useMemo(
    () => sortApplications(applications.filter((application) => application.enabled)),
    [applications],
  );
  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return enabledApplications;
    return enabledApplications.filter((application) => {
      const haystack = `${application.title} ${application.description}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [enabledApplications, search]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedApplicationId(currentApplicationId ?? enabledApplications[0]?.applicationId ?? null);
  }, [currentApplicationId, enabledApplications, open]);

  const selectedApplication =
    filteredApplications.find((application) => application.applicationId === selectedApplicationId) ??
    filteredApplications[0] ??
    null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        aria-describedby="applications-launcher-description"
        className="h-[85vh] min-h-[34rem] w-[min(92vw,80rem)] max-w-none overflow-hidden p-0 md:min-w-[50vw]"
      >
        <div className="bg-background/95 flex h-full min-h-0 flex-col">
          <div className="border-border/70 border-b px-6 py-5">
            <DialogTitle className="text-left text-xl">Applications</DialogTitle>
            <DialogDescription id="applications-launcher-description" className="mt-1 text-left">
              Search, inspect, and open platform applications.
            </DialogDescription>
            <label className="relative mt-4 block">
              <span className="sr-only">Search applications</span>
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search applications"
                data-testid="applications-launcher-search"
                className="pl-9"
              />
            </label>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
            <div className="border-border/70 min-h-0 overflow-hidden border-r">
              <div
                role="listbox"
                aria-label="Applications"
                data-testid="applications-launcher-list"
                className="flex h-full min-h-0 flex-col overflow-y-auto p-3"
              >
                {filteredApplications.length === 0 ? (
                  <div className="text-muted-foreground flex h-full items-center justify-center rounded-xl border border-dashed p-6 text-sm">
                    No applications match your search.
                  </div>
                ) : (
                  filteredApplications.map((application) => {
                    const Icon = resolveApplicationIcon(application.iconKey);
                    const isSelected = application.applicationId === selectedApplication?.applicationId;
                    return (
                      <button
                        key={application.applicationId}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-testid={`application-option-${application.applicationId}`}
                        onClick={() => setSelectedApplicationId(application.applicationId)}
                        onDoubleClick={() => onOpenApplication(application)}
                        className={cn(
                          "hover:bg-accent/60 flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                          isSelected ? "bg-accent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" : "",
                        )}
                      >
                        <span
                          className="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                          style={{
                            color: sanitizeApplicationColor(application.iconColor, "#e2e8f0"),
                            background: sanitizeApplicationColor(
                              application.iconBackground,
                              "rgba(148, 163, 184, 0.16)",
                            ),
                          }}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium">{application.title}</span>
                          <span className="text-muted-foreground mt-1 block text-sm leading-6">
                            {application.description}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-6 py-5">
              {selectedApplication ? (
                <div className="space-y-5" data-testid="applications-launcher-details">
                  <div className="flex items-start gap-4">
                    <span
                      className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_18px_40px_rgba(0,0,0,0.2)]"
                      style={{
                        color: sanitizeApplicationColor(selectedApplication.iconColor, "#e2e8f0"),
                        background: sanitizeApplicationColor(
                          selectedApplication.iconBackground,
                          "rgba(148, 163, 184, 0.16)",
                        ),
                      }}
                    >
                      {(() => {
                        const Icon = resolveApplicationIcon(selectedApplication.iconKey);
                        return <Icon className="size-6" />;
                      })()}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold">{selectedApplication.title}</h2>
                      <p className="text-muted-foreground mt-2 text-sm leading-6">
                        {selectedApplication.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs">
                      {selectedApplication.applicationType === "embedded" ? "Embedded tool" : "Native application"}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs">
                      v{selectedApplication.version}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs">
                      {selectedApplication.healthStatus}
                    </span>
                    {selectedApplication.owner ? (
                      <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs">
                        {selectedApplication.owner}
                      </span>
                    ) : null}
                  </div>

                  {selectedApplication.capabilities.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                        Capabilities
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplication.capabilities.map((capability) => (
                          <span key={capability} className="rounded-full border px-3 py-1 text-xs">
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <Button
                    onClick={() => onOpenApplication(selectedApplication)}
                    data-testid="applications-launcher-open"
                  >
                    Open Application
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-dashed px-6 text-center text-sm">
                  <div>
                    <Sparkles className="mx-auto mb-3 size-5" />
                    Select an application to inspect it.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
