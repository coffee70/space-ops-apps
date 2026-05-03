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
    return [
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
    ];
  },
};

export default nextConfig;
