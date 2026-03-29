import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/menu', '/orders'],
        disallow: [
          '/checkout',
          '/order-history',
          '/orders/',
          '/staff/',
          '/admin/',
          '/kitchen/',
          '/pos/',
          '/menuaudit',
        ],
      },
    ],
    sitemap: 'https://app.cedibites.com/sitemap.xml',
  };
}
