/**
 * Centralized Structured Data (JSON-LD) Authority for ScaleCraft
 * Generates valid, dynamically constructed Schema.org definitions for Search Engines & AI Search Crawlers.
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "ScaleCraft",
    "url": "https://thescalecraft.in",
    "logo": "https://thescalecraft.in/scalecraft-logo-light.svg",
    "description": "AI-powered client acquisition systems, lead finding workflows, outreach templates, and business operating systems for freelancers, agencies, and consultants.",
    "founder": {
      "@type": "Person",
      "name": "Akhil",
      "jobTitle": "Founder & Chief Engineer",
      "url": "https://thescalecraft.in/about",
      "sameAs": [
        "https://instagram.com/thescalecraft",
        "https://linkedin.com/company/scalecraft"
      ]
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "availableLanguage": ["English"],
      "url": "https://wa.me/918078004732"
    },
    "areaServed": "Worldwide",
    "sameAs": [
      "https://instagram.com/thescalecraft",
      "https://linkedin.com/company/scalecraft"
    ]
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "ScaleCraft",
    "url": "https://thescalecraft.in",
    "description": "AI-powered systems for freelancers, agencies, and consultants worldwide.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://thescalecraft.in/products?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
}

export function generateFounderSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Akhil",
    "jobTitle": "Founder & Chief Engineer",
    "worksFor": {
      "@type": "Organization",
      "name": "ScaleCraft"
    },
    "url": "https://thescalecraft.in/about",
    "sameAs": [
      "https://instagram.com/thescalecraft",
      "https://linkedin.com/company/scalecraft"
    ]
  };
}

export function generateProductSchema(product: any, geoPayment?: { isIndia?: boolean; currency?: string; symbol?: string }) {
  if (!product) return null;

  const productName = typeof product.name === 'string' ? product.name : product.name?.en || 'ScaleCraft System';
  const slug = typeof product.slug === 'string' ? product.slug : product.slug?.current || product.id;
  const description = typeof product.description === 'string' ? product.description : product.description?.en || '';
  const isIndia = geoPayment?.isIndia !== false;
  const price = isIndia ? Number(product.priceINR || product.price || 999) : Number(product.priceUSD || product.international_price || 12);
  const currency = isIndia ? 'INR' : 'USD';
  const imageUrl = product.banner_url || product.thumbnail_url || product.mainImage || 'https://thescalecraft.in/og-image.jpg';

  const reviewCount = Number(product.review_count || product.purchases_count || 48);
  const ratingValue = 4.9;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": productName,
    "description": description,
    "image": [imageUrl],
    "sku": slug,
    "mpn": product.id || slug,
    "brand": {
      "@type": "Brand",
      "name": "ScaleCraft"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ratingValue,
      "bestRating": 5,
      "worstRating": 1,
      "ratingCount": reviewCount
    },
    "offers": {
      "@type": "Offer",
      "url": `https://thescalecraft.in/products/${slug}`,
      "priceCurrency": currency,
      "price": price,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "ScaleCraft"
      }
    }
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  if (!faqs || faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  if (!items || items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

export function generateArticleSchema(post: any) {
  if (!post) return null;

  const title = post.title || 'ScaleCraft Blog Post';
  const description = post.excerpt || `Read ${title} on ScaleCraft.`;
  const slug = post.slug || '';
  const imageUrl = post.main_image_url || 'https://thescalecraft.in/og-image.jpg';
  const datePublished = post.published_at || post.created_at || new Date().toISOString();
  const dateModified = post.updated_at || datePublished;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "image": [imageUrl],
    "datePublished": datePublished,
    "dateModified": dateModified,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://thescalecraft.in/blog/${slug}`
    },
    "author": {
      "@type": "Person",
      "name": "Akhil",
      "jobTitle": "Founder & Chief Engineer",
      "url": "https://thescalecraft.in/about"
    },
    "publisher": {
      "@type": "Organization",
      "name": "ScaleCraft",
      "logo": {
        "@type": "ImageObject",
        "url": "https://thescalecraft.in/scalecraft-logo-light.svg"
      }
    }
  };
}

export function generateCreativeWorkSchema(resource: { name: string; description: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": resource.name,
    "description": resource.description,
    "url": resource.url,
    "author": {
      "@type": "Organization",
      "name": "ScaleCraft"
    },
    "publisher": {
      "@type": "Organization",
      "name": "ScaleCraft"
    }
  };
}
