import type { NextConfig } from "next";
import path from "path";

const repo = "/edufees";

const nextConfig: NextConfig = {
  output: "export",
  basePath: repo,
  assetPrefix: repo,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
