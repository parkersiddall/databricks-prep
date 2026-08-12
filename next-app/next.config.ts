import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a minimal server.js and only the traced
  // node_modules, so the production image doesn't ship the full dependency
  // tree. Required by the `runner` stage in the Dockerfile.
  output: "standalone",
};

export default nextConfig;
