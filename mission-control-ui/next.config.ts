import type { NextConfig } from "next";

const workspaceServerUrl =
  process.env.OPENVSCODE_SERVER_URL || "http://openvscode-server:3000";
const controlPlaneServerUrl =
  process.env.CONTROL_PLANE_SERVER_URL || "http://control-plane:8100";

const nextConfig: NextConfig = {
  output: "standalone",
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
        source: "/workspace",
        destination: `${workspaceServerUrl}/workspace`,
      },
      {
        source: "/workspace/:path*",
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
