import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The app is served from Lambda behind CloudFront (docs/ARCHITECTURE.md § Stack).
  // Poweredby header removed so we advertise nothing about the runtime.
  poweredByHeader: false,
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
