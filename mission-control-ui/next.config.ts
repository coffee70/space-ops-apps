import type { NextConfig } from "next";

const workspaceServerUrl =
  process.env.OPENVSCODE_SERVER_URL || "http://openvscode-server:3000";
const controlPlaneServerUrl =
  process.env.CONTROL_PLANE_SERVER_URL || "http://control-plane:8100";
const apiServerUrl = process.env.API_SERVER_URL || "http://platform-api:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/_embedded/workspace",
        has: [
          {
            type: "header",
            key: "sec-fetch-dest",
            value: "document",
          },
        ],
        destination: "/apps/workspace",
        permanent: false,
      },
      {
        source: "/_embedded/workspace/:path*",
        has: [
          {
            type: "header",
            key: "sec-fetch-dest",
            value: "document",
          },
        ],
        destination: "/apps/workspace",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      /**
       * afterFiles — control plane / upstream bundles (no collision with Next pages).
       * Fallback rewrites proxy platform-api paths only after App Router declines to handle the URL
       * (see `fallback`), so `/telemetry/:source/:channel` pages keep working beside `/telemetry/sources`.
       */
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
          source: "/_embedded/workspace",
          destination: `${workspaceServerUrl}/workspace`,
        },
        {
          source: "/_embedded/workspace/:path*",
          destination: `${workspaceServerUrl}/workspace/:path*`,
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
          source: "/internal/runtime-services/:serviceSlug/:path*",
          destination: `${controlPlaneServerUrl}/internal/runtime-services/:serviceSlug/:path*`,
        },
        {
          source: "/intelligence/:path*",
          destination: `${apiServerUrl}/intelligence/:path*`,
        },
        /**
         * Position/orbit APIs live under /telemetry/... but must not be captured by
         * `app/telemetry/[sourceId]/[name]` (e.g. sourceId=position, name=config).
         * Proxy these in afterFiles so they win over the dynamic page route; keep the
         * broad `/telemetry/:path*` fallback for true API paths that do not match pages.
         */
        {
          source: "/telemetry/position/latest",
          destination: `${apiServerUrl}/telemetry/position/latest`,
        },
        {
          source: "/telemetry/position/latest/:path*",
          destination: `${apiServerUrl}/telemetry/position/latest/:path*`,
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
          source: "/telemetry/orbit/status",
          destination: `${apiServerUrl}/telemetry/orbit/status`,
        },
        {
          source: "/telemetry/orbit/:path*",
          destination: `${apiServerUrl}/telemetry/orbit/:path*`,
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
