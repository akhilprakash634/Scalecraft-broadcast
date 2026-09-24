import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import LaunchBanner from "@/components/layout/LaunchBanner";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import FlashOfferPopup from "@/components/layout/FlashOfferPopup";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://thescalecraft.in'),
  title: {
    default: 'ScaleCraft - AI Systems for Freelancers Worldwide',
    template: '%s | ScaleCraft'
  },
  description: 'AI-powered client acquisition systems, lead finding workflows, outreach templates, and business operating systems for freelancers, agencies, and consultants.',
  keywords: ['freelance clients', 'AI tools for freelancers', 'client acquisition system', 'outreach scripts', 'freelance client acquisition system', 'digital products for freelancers', 'digital marketing worldwide'],
  authors: [{ name: 'Akhil', url: 'https://thescalecraft.in/about' }],
  creator: 'Akhil',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thescalecraft.in',
    siteName: 'ScaleCraft',
    title: 'ScaleCraft - AI Systems for Freelancers Worldwide',
    description: 'AI-powered client acquisition systems, lead finding workflows, outreach templates, and business operating systems for freelancers, agencies, and consultants.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'ScaleCraft - AI Systems for Freelancers Worldwide' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScaleCraft - AI Systems for Freelancers Worldwide',
    description: 'AI-powered client acquisition systems, lead finding workflows, outreach templates, and business operating systems for freelancers, agencies, and consultants.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/scalecraft-favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/scalecraft-favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' }
  },
  verification: {
    google: 'VQqzzGDFXLFu2uPfEati2_nwFasXNAld9Napt5_eCrc',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "ScaleCraft",
    "url": "https://thescalecraft.in",
    "logo": "https://thescalecraft.in/scalecraft-logo-light.svg",
    "description": "AI-powered systems for freelancers worldwide",
    "founder": {
      "@type": "Person",
      "name": "Akhil",
      "jobTitle": "Founder",
      "address": { "@type": "PostalAddress", "addressCountry": "IN" }
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "availableLanguage": ["English"]
    },
    "areaServed": "Worldwide",
    "sameAs": [
      "https://instagram.com/thescalecraft",
      "https://linkedin.com/company/scalecraft"
    ]
  };

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;
              n.version='2.0';n.queue=[];t=b.createElement(e);
              t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,
              'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '2099180930981015');
              fbq('init', '1335606705156211');
              fbq('track', 'PageView');
            `
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=2099180930981015&ev=PageView&noscript=1"
            alt=""
          />
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1335606705156211&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-body bg-background text-foreground`} suppressHydrationWarning>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7KZGET0KL1"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7KZGET0KL1');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wrcu6hwq5w");
          `}
        </Script>
        <LaunchBanner />
        <Nav />
        <main>{children}</main>
        <FlashOfferPopup />
        <Footer />
      </body>
    </html>
  );
}
