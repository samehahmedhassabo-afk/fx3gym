import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Type errors are caught by `npm run typecheck` (a standalone tsc process
  // with its own incremental cache) instead of here. Running the full
  // project's typecheck inside next build shares memory with the already
  // -compiled bundler output in the same process, and as the codebase grew
  // that combination started needing 8GB+ heap and blowing up mid-package.
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "@prisma/client",
    "bcryptjs",
  ],
  images: {
    formats: ["image/webp"],
  },
};

export default nextConfig;
