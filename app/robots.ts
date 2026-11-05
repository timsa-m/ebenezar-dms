import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/login', '/'],
      disallow: [
        '/api/',
        '/vehicles/',
        '/clients/',
        '/loans/',
        '/reports/',
        '/documents/',
        '/settings/',
      ],
    },
  };
}
