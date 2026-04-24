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
        source: "/workspace",
        destination: `${workspaceServerUrl}/workspace`,
      },
      {
        source: "/workspace/:path*",
        destination: `${workspaceServerUrl}/workspace/:path*`,
      },
      {
        source: "/runtime-modules/:slug",
        destination: `${controlPlaneServerUrl}/proxy/modules/:slug`,
      },
      {
        source: "/runtime-modules/:slug/:path*",
        destination: `${controlPlaneServerUrl}/proxy/modules/:slug/:path*`,
      },
    ];
  },
};

export default nextConfig;
