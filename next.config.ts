import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"],
  eslint: { ignoreDuringBuilds: true },
  // A parent package-lock.json exists at C:\Users\Mayco; pin tracing to this app
  // so Next doesn't infer the wrong workspace root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
