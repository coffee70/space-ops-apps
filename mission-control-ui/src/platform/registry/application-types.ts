export type PlatformApplicationType = "native" | "embedded";

export interface PlatformApplicationDefinition {
  applicationId: string;
  title: string;
  description: string;
  iconKey: string;
  iconColor: string;
  iconBackground: string;
  applicationType: PlatformApplicationType;
  routePath: string;
  loaderKey?: string;
  embeddedUrl?: string;
  proxyBasePath?: string;
  version: string;
  enabled: boolean;
  iframeSandbox?: string;
  iframeAllow?: string;
  sortOrder: number;
  owner?: string;
  capabilities: string[];
  healthStatus: string;
  deploymentStatus: string;
}

const SAFE_COLOR_PATTERN =
  /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/;

export function sanitizeApplicationColor(value: string | undefined, fallback: string): string {
  return value && SAFE_COLOR_PATTERN.test(value) ? value : fallback;
}

export function sortApplications(applications: PlatformApplicationDefinition[]) {
  return [...applications].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.title.localeCompare(right.title);
  });
}
