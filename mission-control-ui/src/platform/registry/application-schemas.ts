import { z } from "zod";

const OptionalNullableStringSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().optional(),
);

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
    embeddedUrl: OptionalNullableStringSchema,
    proxyBasePath: OptionalNullableStringSchema,
    version: z.string(),
    enabled: z.boolean(),
    iframeSandbox: OptionalNullableStringSchema,
    iframeAllow: OptionalNullableStringSchema,
    sortOrder: z.number(),
    owner: z.string().optional(),
    capabilities: z.array(z.string()),
    healthStatus: z.string(),
    deploymentStatus: z.string(),
  })
  .passthrough();
