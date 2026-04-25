import type { PlatformApplicationDefinition } from "@/platform/registry/application-types";
import { ApplicationUnavailableState } from "@/platform/shell/ApplicationFrame";

export function EmbeddedApplicationHost({
  application,
}: {
  application: PlatformApplicationDefinition;
}) {
  const iframeSrc = application.embeddedUrl ?? application.proxyBasePath;

  if (!iframeSrc) {
    return (
      <ApplicationUnavailableState description="The embedded application is missing its iframe target." />
    );
  }

  return (
    <div className="flex h-full min-h-full flex-col p-4 sm:p-6">
      <div className="bg-background/95 flex min-h-[calc(100dvh-2rem)] flex-1 flex-col overflow-hidden rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:min-h-[calc(100dvh-3rem)]">
        <div className="border-border/70 flex items-center justify-between border-b px-5 py-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-sky-300/80 uppercase">Embedded Application</p>
            <h1 className="mt-1 text-lg font-semibold">{application.title}</h1>
          </div>
        </div>
        <iframe
          src={iframeSrc}
          title={application.title}
          sandbox={application.iframeSandbox}
          allow={application.iframeAllow}
          className="min-h-0 flex-1 border-0"
          data-testid="embedded-application-frame"
        />
      </div>
    </div>
  );
}
