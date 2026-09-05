import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Docraft runs entirely in the browser - documents live in local storage and
  // the layout engine and PDF export are client code. Nothing needs a server at
  // request time, so the whole site ships as static files.
  output: 'export',
  images: { unoptimized: true },
  reactCompiler: true,
};

export default nextConfig;
