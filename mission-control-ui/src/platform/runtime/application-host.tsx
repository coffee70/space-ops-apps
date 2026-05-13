import { applicationLoaderManifest } from "@/platform/registry/application-loader-manifest.generated";
import type { PlatformApplicationDefinition } from "@/platform/registry/application-types";
import type { NativeApplicationProps } from "@/platform/sdk/native-application-contract";
import { ApplicationUnavailableState } from "@/platform/shell/application-frame";
import { EmbeddedApplicationHost } from "@/platform/runtime/embedded-application-host";
import { NativeApplicationHost } from "@/platform/runtime/native-application-host";

export async function ApplicationHost({
  application,
  appPath,
  searchParams,
}: {
  application: PlatformApplicationDefinition;
  appPath: string[];
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (application.applicationType === "embedded") {
    return (
      <div className="min-h-0 flex-1 overflow-hidden">
        <EmbeddedApplicationHost application={application} />
      </div>
    );
  }

  if (!application.loaderKey) {
    return (
      <ApplicationUnavailableState description="The native application is missing its loader registration." />
    );
  }

  const loader = applicationLoaderManifest[application.loaderKey];
  if (!loader) {
    return (
      <ApplicationUnavailableState description="The application registry points to a loader that is not part of this build." />
    );
  }

  const props: NativeApplicationProps = {
    application,
    appPath,
    searchParams,
    platform: {
      activeApplicationId: application.applicationId,
    },
  };

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <NativeApplicationHost loader={loader} props={props} />
    </div>
  );
}
