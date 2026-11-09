import type { NextConfig } from "next";
const config: NextConfig = {
  allowedDevOrigins: ["terminal.local"],
  experimental: { optimizePackageImports: ["lucide-react"] },
};
export default config;
