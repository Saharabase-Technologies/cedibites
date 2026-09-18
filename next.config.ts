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
        hostname: "app.cedibites.com",
      },
    ],
  },

  /**
   * The partner portal moved to /partner/* in the 2026-06 redesign. The old
   * screens under /staff/partner/* are gone, so forward the paths at the
   * routing layer — a real 308 before any layout renders, rather than a page
   * that streams a client-side hop. Keeps existing partner bookmarks working.
   */
  async redirects() {
    return [
      { source: '/staff/partner', destination: '/partner/dashboard', permanent: true },
      { source: '/staff/partner/dashboard', destination: '/partner/dashboard', permanent: true },
      { source: '/staff/partner/orders', destination: '/partner/orders', permanent: true },
      { source: '/staff/partner/branch', destination: '/partner/branch', permanent: true },
      { source: '/staff/partner/analytics', destination: '/partner/analytics', permanent: true },
      { source: '/staff/partner/profile', destination: '/partner/profile', permanent: true },
      // The standalone staff screen was folded into My Branch as a team roster.
      { source: '/staff/partner/staff', destination: '/partner/branch', permanent: true },
      { source: '/staff/partner/:path*', destination: '/partner/dashboard', permanent: false },

      /**
       * The two customer order routes were named backwards.
       *
       * `/orders` was a box you typed a code into and `/order-history` was the
       * actual list, so the Orders tab took people to a form asking for
       * something they had come to the app to look up. `/orders` is the list
       * now, `/orders/AH637` is one of them, and `/track` is the code box.
       *
       * Old links are in SMS threads and browser history, so this stays.
       */
      { source: '/order-history', destination: '/orders', permanent: true },
    ];
  },
};

export default nextConfig;
