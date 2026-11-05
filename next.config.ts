import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi use the local test server (development only).
  // If your laptop's Wi-Fi address changes, update it here.
  allowedDevOrigins: ["192.168.0.159"],
  // The plan page reads the block files for each visitor, so they must ship with it.
  outputFileTracingIncludes: {
    "/plan": ["./content/blocks/**/*.json"],
  },
};

export default nextConfig;
