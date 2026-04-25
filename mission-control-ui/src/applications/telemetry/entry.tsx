import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { TelemetryInventoryPage } from "@/components/telemetry-inventory-page";
import { TelemetryDetailRoutePage } from "@/app/telemetry/[sourceId]/[name]/page";
import type { NativeApplicationEntry, NativeApplicationProps } from "@/platform/sdk/native-application-contract";

async function TelemetryApplication({ appPath, searchParams }: NativeApplicationProps) {
  if (appPath.length >= 2) {
    return (
      <TelemetryDetailRoutePage
        params={Promise.resolve({
          sourceId: appPath[0] ?? "",
          name: appPath[1] ?? "",
        })}
        searchParams={Promise.resolve(searchParams)}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
          <Spinner size="lg" className="h-10 w-10" />
        </div>
      }
    >
      <TelemetryInventoryPage />
    </Suspense>
  );
}

export const applicationEntry: NativeApplicationEntry = {
  Component: TelemetryApplication,
};
