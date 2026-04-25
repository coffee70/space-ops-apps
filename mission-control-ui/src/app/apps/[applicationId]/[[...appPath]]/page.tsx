import { notFound } from "next/navigation";
import { fetchPlatformApplicationsServer } from "@/platform/registry/application-registry-client";
import { ApplicationHost } from "@/platform/runtime/ApplicationHost";
import { ApplicationUnavailableState } from "@/platform/shell/ApplicationFrame";

const APPLICATION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function PlatformApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string; appPath?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { applicationId, appPath = [] } = await params;
  if (!APPLICATION_ID_PATTERN.test(applicationId)) {
    notFound();
  }

  const applications = await fetchPlatformApplicationsServer();
  const application = applications.find((candidate) => candidate.applicationId === applicationId);
  if (!application) {
    return (
      <ApplicationUnavailableState description="The requested application is not registered in this platform runtime." />
    );
  }

  if (!application.enabled) {
    return (
      <ApplicationUnavailableState description="The requested application is currently disabled." />
    );
  }

  const resolvedSearchParams = await searchParams;
  return (
    <ApplicationHost
      application={application}
      appPath={appPath}
      searchParams={resolvedSearchParams}
    />
  );
}
