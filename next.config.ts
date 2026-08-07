import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Where the build lands. `next build` erases this directory before it writes
  // anything, so building straight into the live `.next` means an interrupted
  // build leaves the running server with no static assets at all. The deploy
  // therefore builds into a scratch dir and renames it into place; this env var
  // is how it points the build somewhere else. `next start` reads this file
  // fresh with the var unset, so the served build is always plain `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "beta-api.cedibites.com",
      },
      {
        protocol: "https",
        hostname: "app.cedibites.com",
      },
    ],
  },
};

export default nextConfig;
