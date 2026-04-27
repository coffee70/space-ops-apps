import type { NextConfig } from "next";

const workspaceServerUrl =
  process.env.OPENVSCODE_SERVER_URL || "http://openvscode-server:3000";
const controlPlaneServerUrl =
  process.env.CONTROL_PLANE_SERVER_URL || "http://control-plane:8100";

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
    ];
  },
};

export default nextConfig;
