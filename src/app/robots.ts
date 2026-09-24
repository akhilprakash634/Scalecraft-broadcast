import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/checkout/',
          '/dashboard/',
          '/thank-you/',
          '/_next/',
        ],
      },
    ],
    sitemap: 'https://thescalecraft.in/sitemap.xml',
  }
}
