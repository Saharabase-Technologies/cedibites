import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/menu', '/track'],
        disallow: [
          '/checkout',
          '/orders',
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
