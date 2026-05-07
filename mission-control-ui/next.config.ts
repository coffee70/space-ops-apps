import type { NextConfig } from "next";

const apiServerUrl = process.env.API_SERVER_URL ?? "http://localhost:8000";
const controlPlaneServerUrl = process.env.CONTROL_PLANE_SERVER_URL ?? "http://localhost:8100";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/registry/applications",
          destination: `${controlPlaneServerUrl}/registry/applications`,
        },
        {
          source: "/registry/applications/:applicationId",
          destination: `${controlPlaneServerUrl}/registry/applications/:applicationId`,
        },
        {
          source: "/registry/services",
          destination: `${controlPlaneServerUrl}/registry/services`,
        },
        {
          source: "/registry/services/:serviceSlug",
          destination: `${controlPlaneServerUrl}/registry/services/:serviceSlug`,
        },
        {
          source: "/internal/runtime-services/:serviceSlug/:path*",
          destination: `${controlPlaneServerUrl}/internal/runtime-services/:serviceSlug/:path*`,
        },
        {
          source: "/runtime-applications/:applicationId",
          destination: `${controlPlaneServerUrl}/runtime-applications/:applicationId`,
        },
        {
          source: "/runtime-applications/:applicationId/:path*",
          destination: `${controlPlaneServerUrl}/runtime-applications/:applicationId/:path*`,
        },
        {
          source: "/telemetry/position/config",
          destination: `${apiServerUrl}/telemetry/position/config`,
        },
        {
          source: "/telemetry/position/config/:path*",
          destination: `${apiServerUrl}/telemetry/position/config/:path*`,
        },
        {
          source: "/telemetry/position/latest",
          destination: `${apiServerUrl}/telemetry/position/latest`,
        },
        {
          source: "/telemetry/orbit/status",
          destination: `${apiServerUrl}/telemetry/orbit/status`,
        },
      ],
      fallback: [
        {
          source: "/telemetry",
          destination: `${apiServerUrl}/telemetry`,
        },
        {
          source: "/telemetry/:path*",
          destination: `${apiServerUrl}/telemetry/:path*`,
        },
        {
          source: "/vehicle-configs",
          destination: `${apiServerUrl}/vehicle-configs`,
        },
        {
          source: "/vehicle-configs/:path*",
          destination: `${apiServerUrl}/vehicle-configs/:path*`,
        },
        {
          source: "/ops/:path*",
          destination: `${apiServerUrl}/ops/:path*`,
        },
        {
          source: "/simulator/:path*",
          destination: `${apiServerUrl}/simulator/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
