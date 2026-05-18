import { z } from "zod";

export const PlatformApplicationDefinitionSchema = z
  .object({
    applicationId: z.string(),
    title: z.string(),
    description: z.string(),
    iconKey: z.string(),
    iconColor: z.string(),
    iconBackground: z.string(),
    applicationType: z.enum(["native", "embedded"]),
    routePath: z.string(),
    loaderKey: z.string().optional(),
    embeddedUrl: z.string().optional(),
    proxyBasePath: z.string().optional(),
    version: z.string(),
    enabled: z.boolean(),
    iframeSandbox: z.string().optional(),
    iframeAllow: z.string().optional(),
    sortOrder: z.number(),
    owner: z.string().optional(),
    capabilities: z.array(z.string()),
    healthStatus: z.string(),
    deploymentStatus: z.string(),
  })
  .passthrough();
