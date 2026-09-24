import { Product } from '@/types/product';

export interface ProductValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates product data integrity at runtime.
 * Logs warnings in development if missing critical fields or mixed IDs.
 */
export function validateProduct(product: any, componentName?: string): ProductValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!product) {
    errors.push('Product object is null or undefined.');
    return { isValid: false, errors, warnings };
  }

  if (!product.id && !product._id) {
    errors.push('Missing product.id');
  }

  const productName = typeof product.name === 'string' ? product.name : product.name?.en;
  if (!productName || !productName.trim()) {
    errors.push('Missing product.name');
  }

  const slug = typeof product.slug === 'string' ? product.slug : product.slug?.current;
  if (!slug || !slug.trim()) {
    errors.push('Missing product.slug');
  }

  if (typeof product.price !== 'number' && typeof product.priceINR !== 'number') {
    errors.push('Missing product.price number');
  }

  // Warnings
  if (!product.thumbnail_url && !product.banner_url && !product.mainImage) {
    warnings.push('Missing product thumbnail or banner image');
  }

  const desc = typeof product.description === 'string' ? product.description : product.description?.en;
  if (!desc || !desc.trim()) {
    warnings.push('Missing product.description');
  }

  // Validate relational IDs match product.id
  const mainId = product.id || product._id;
  if (mainId) {
    if (Array.isArray(product.media)) {
      product.media.forEach((m: any, i: number) => {
        if (m.product_id && m.product_id !== mainId) {
          warnings.push(`Media item #${i} has mismatched product_id (${m.product_id} vs ${mainId})`);
        }
      });
    }

    if (Array.isArray(product.faqs)) {
      product.faqs.forEach((f: any, i: number) => {
        if (f.product_id && f.product_id !== mainId) {
          warnings.push(`FAQ item #${i} has mismatched product_id (${f.product_id} vs ${mainId})`);
        }
      });
    }
  }

  if (process.env.NODE_ENV === 'development') {
    if (errors.length > 0) {
      console.error(`[Product Integrity Error] (${componentName || 'Component'}):`, errors, product);
    } else if (warnings.length > 0) {
      console.warn(`[Product Integrity Warning] (${componentName || 'Component'}):`, warnings, product);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Dynamic CTA Resolver
 * Derives primary action button text automatically based on product attributes
 */
export function getDynamicCTA(product: Partial<Product> | any, fallbackType: 'card' | 'landing' = 'card'): string {
  if (product?.custom_cta?.trim()) return product.custom_cta;
  if (product?.cta_text?.trim()) return product.cta_text;

  const type = (product?.product_type || '').toLowerCase();
  const isCombo = product?.is_combo || product?.isCombo || type === 'bundle' || product?.slug === 'ai-systems-combo';

  if (isCombo) {
    return fallbackType === 'landing' ? 'Get Complete Systems Combo →' : 'See Bundle Details →';
  }

  if (type === 'saas') {
    return fallbackType === 'landing' ? 'Start Managed Onboarding →' : 'See Agent Details →';
  }

  if (type === 'service') {
    return 'Book Consultation →';
  }

  return fallbackType === 'landing' ? 'Get Instant Access →' : 'See Product Details →';
}
