import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPlatformApplicationsServer } from "@/platform/registry/application-registry-client";
import { validateApplicationPathSegments } from "@/platform/registry/application-routes";
import { ApplicationHost } from "@/platform/runtime/application-host";
import { ApplicationUnavailableState } from "@/platform/shell/application-frame";

const APPLICATION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ applicationId: string; appPath?: string[] }>;
}): Promise<Metadata> {
  const { applicationId } = await params;

  if (!APPLICATION_ID_PATTERN.test(applicationId)) {
    return {
      title: "Aentx Space OS",
    };
  }

  try {
    const applications = await fetchPlatformApplicationsServer();
    const application = applications.find((candidate) => candidate.applicationId === applicationId);

    return {
      title: application ? `${application.title} - Aentx Space OS` : "Aentx Space OS",
    };
  } catch {
    return {
      title: "Aentx Space OS",
    };
  }
}

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
  const safeAppPath = validateApplicationPathSegments(appPath);
  if (!safeAppPath) {
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
      appPath={safeAppPath}
      searchParams={resolvedSearchParams}
    />
  );
}
