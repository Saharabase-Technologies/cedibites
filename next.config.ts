import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "beta-api.cedibites.com",
      },
      {
        protocol: "https",
        hostname: "api.cedibites.com",
      },
    ],
  },
};

export default nextConfig;
