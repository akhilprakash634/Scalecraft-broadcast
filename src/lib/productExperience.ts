import { Product } from '@/types/product';

export type ProductType = 'digital' | 'managed_saas' | 'saas' | 'service' | 'bundle';

export interface TrustBadge {
  label: string;
  icon?: 'zap' | 'refresh' | 'lock' | 'shield' | 'users' | 'server' | 'headphones' | 'check' | 'layers' | 'activity' | 'award';
}

export interface HowItWorksStep {
  number: number;
  title: string;
  desc: string;
}

export interface ProductExperienceConfig {
  productType: ProductType;
  checkoutTitle: string;
  checkoutDescription: string;
  ctaText: string;
  trustBadges: TrustBadge[];
  deliveryMessage: string;
  pricingSubtext: string;
  guaranteeTitle: string;
  guaranteeDescription: string;
  guaranteeBadge: string;
  socialProofBadge: string;
  successTitle: string;
  successMessage: string;
  successCtaText: string;
  successNextSteps: string[];
  emailSubject: string;
  emailHeadline: string;
  emailActionLabel: string;
}

/**
 * Product Experience Engine — Behavioral & UI Variant Controller
 *
 * NOTE: This engine determines ONLY UI behavioral variants, trust badge structures, and checkout flows.
 * It DOES NOT generate or inject product-specific marketing copy, sales claims, or feature lists.
 * ALL product copy (name, description, features, who is this for, requirements, use cases, expected results, how it works)
 * MUST originate directly from the Product object stored in Supabase.
 */
export function getProductExperienceConfig(product: Partial<Product> | any): ProductExperienceConfig {
  const rawType = (product?.product_type || product?.type || '').toLowerCase();
  const prodName = (product?.name || product?.title || '').toLowerCase();
  const slug = (product?.slug?.current || product?.slug || '').toLowerCase();

  const isManagedSaaS = rawType === 'managed_saas' || slug === 'scalecraft-agent-saas' || (prodName.includes('agent') && (prodName.includes('saas') || prodName.includes('managed')));
  const isSaaS = !isManagedSaaS && (rawType === 'saas' || slug === 'scalecraft-agent' || prodName.includes('agent'));
  const isService = rawType === 'service' || prodName.includes('consultation') || prodName.includes('audit');
  const isBundle = rawType === 'bundle' || product?.is_combo || product?.isCombo || slug === 'ai-systems-combo' || prodName.includes('combo') || prodName.includes('bundle');

  const productType: ProductType = isManagedSaaS
    ? 'managed_saas'
    : isSaaS
    ? 'saas'
    : isService
    ? 'service'
    : isBundle
    ? 'bundle'
    : 'digital';

  // -------------------------------------------------------------
  // 1. Managed SaaS UI Behavior Config
  // -------------------------------------------------------------
  if (productType === 'managed_saas') {
    const defaults: ProductExperienceConfig = {
      productType: 'managed_saas',
      checkoutTitle: "Complete Order & Onboarding",
      checkoutDescription: "Provide your contact details to begin server configuration.",
      ctaText: "Continue to Onboarding →",
      trustBadges: [
        { label: "Managed Deployment", icon: "server" },
        { label: "Technical Support", icon: "headphones" },
        { label: "Direct Setup", icon: "shield" }
      ],
      deliveryMessage: product?.delivery_message || "Onboarding team contacts you after checkout.",
      pricingSubtext: "Managed deployment included",
      guaranteeTitle: product?.guarantee_title || "Technical Support & Onboarding Guarantee",
      guaranteeDescription: product?.guarantee_description || "Full setup support included with your deployment.",
      guaranteeBadge: product?.guarantee_badge || "Service Support Guarantee",
      socialProofBadge: "Managed Deployment",
      successTitle: "Order Confirmed — Onboarding Initiated",
      successMessage: "Thank you for your order. Our team will contact you on WhatsApp/Email for account setup.",
      successCtaText: "Open Onboarding Dashboard →",
      successNextSteps: [
        "Check your email inbox for order confirmation.",
        "Our team will contact your registered phone number / WhatsApp.",
        "Prepare your account preferences for quick onboarding."
      ],
      emailSubject: `Your ${product?.name || 'ScaleCraft'} Order Confirmation`,
      emailHeadline: "Order Received",
      emailActionLabel: "View Order Portal"
    };

    return mergeCustomProductSettings(product, defaults);
  }

  // -------------------------------------------------------------
  // 2. Self-Serve SaaS UI Behavior Config
  // -------------------------------------------------------------
  if (productType === 'saas') {
    const defaults: ProductExperienceConfig = {
      productType: 'saas',
      checkoutTitle: "SaaS Subscription Setup",
      checkoutDescription: "Complete payment to provision your workspace credentials.",
      ctaText: "Launch Software →",
      trustBadges: [
        { label: "Instant Setup", icon: "zap" },
        { label: "Secure Access", icon: "lock" },
        { label: "Cloud Hosted", icon: "activity" }
      ],
      deliveryMessage: product?.delivery_message || "Instant workspace access emailed after purchase.",
      pricingSubtext: "Instant account activation",
      guaranteeTitle: product?.guarantee_title || "Satisfaction Guarantee",
      guaranteeDescription: product?.guarantee_description || "Full access provided with software subscription.",
      guaranteeBadge: product?.guarantee_badge || "SaaS Guarantee",
      socialProofBadge: "Verified SaaS Access",
      successTitle: "Workspace Provisioned Successfully",
      successMessage: "Your SaaS workspace access is ready. Login details sent to your email.",
      successCtaText: "Go to Dashboard →",
      successNextSteps: [
        "Access your workspace using the link below.",
        "Check your email for login credentials."
      ],
      emailSubject: `Your ${product?.name || 'ScaleCraft'} SaaS Access`,
      emailHeadline: "Workspace Provisioned",
      emailActionLabel: "Access Dashboard"
    };

    return mergeCustomProductSettings(product, defaults);
  }

  // -------------------------------------------------------------
  // 3. Service UI Behavior Config
  // -------------------------------------------------------------
  if (productType === 'service') {
    const defaults: ProductExperienceConfig = {
      productType: 'service',
      checkoutTitle: "Reserve Service Kickoff",
      checkoutDescription: "Complete checkout to lock in your project slot.",
      ctaText: "Reserve Your Slot →",
      trustBadges: [
        { label: "1:1 Consultation", icon: "headphones" },
        { label: "Custom Scope", icon: "users" },
        { label: "Direct Support", icon: "shield" }
      ],
      deliveryMessage: product?.delivery_message || "Booking details emailed after purchase.",
      pricingSubtext: "1:1 consultation & custom delivery",
      guaranteeTitle: product?.guarantee_title || "Implementation Guarantee",
      guaranteeDescription: product?.guarantee_description || "We work with you to deliver according to agreed scope.",
      guaranteeBadge: product?.guarantee_badge || "Service Guarantee",
      socialProofBadge: "Client Service",
      successTitle: "Booking Confirmed — Kickoff Set",
      successMessage: "Thank you for booking! Check your email for scheduling instructions.",
      successCtaText: "Book Schedule Slot →",
      successNextSteps: [
        "Select your preferred call time on the calendar link.",
        "Check your email for kickoff details."
      ],
      emailSubject: `Your ${product?.name || 'ScaleCraft'} Service Booking`,
      emailHeadline: "Booking Confirmed",
      emailActionLabel: "Schedule Call"
    };

    return mergeCustomProductSettings(product, defaults);
  }

  // -------------------------------------------------------------
  // 4. Bundle UI Behavior Config
  // -------------------------------------------------------------
  if (productType === 'bundle') {
    const defaults: ProductExperienceConfig = {
      productType: 'bundle',
      checkoutTitle: "Unlock Product Bundle",
      checkoutDescription: "Complete checkout to receive access to all included resources.",
      ctaText: "Get Complete Bundle →",
      trustBadges: [
        { label: "Multi-Product Access", icon: "layers" },
        { label: "Lifetime Updates", icon: "refresh" },
        { label: "Direct Support", icon: "headphones" }
      ],
      deliveryMessage: product?.delivery_message || "All bundle links delivered instantly via email.",
      pricingSubtext: "Access all included items with one payment",
      guaranteeTitle: product?.guarantee_title || "Bundle Satisfaction Guarantee",
      guaranteeDescription: product?.guarantee_description || "Access all included resources risk-free.",
      guaranteeBadge: product?.guarantee_badge || "Bundle Guarantee",
      socialProofBadge: "Complete System Bundle",
      successTitle: "Bundle Access Unlocked",
      successMessage: "Thank you for your purchase! All included resource links are available below.",
      successCtaText: "Access Bundle Items →",
      successNextSteps: [
        "Click below to access all included resources.",
        "Check your email for your receipt and download links."
      ],
      emailSubject: `Your ${product?.name || 'ScaleCraft'} Bundle Access Links`,
      emailHeadline: "Bundle Unlocked",
      emailActionLabel: "Access Resources"
    };

    return mergeCustomProductSettings(product, defaults);
  }

  // -------------------------------------------------------------
  // 5. Digital Product UI Behavior Config (Default)
  // -------------------------------------------------------------
  const defaults: ProductExperienceConfig = {
    productType: 'digital',
    checkoutTitle: "Complete Your Order",
    checkoutDescription: "Instant delivery link will be sent to your email after checkout.",
    ctaText: "Get Instant Access →",
    trustBadges: [
      { label: "Instant Delivery", icon: "zap" },
      { label: "Lifetime Updates", icon: "refresh" },
      { label: "Secure Checkout", icon: "lock" }
    ],
    deliveryMessage: product?.delivery_message || "Delivered instantly to your email after checkout.",
    pricingSubtext: "Instant digital access",
    guaranteeTitle: product?.guarantee_title || "Satisfaction Guarantee",
    guaranteeDescription: product?.guarantee_description || "Access your purchase with full satisfaction support.",
    guaranteeBadge: product?.guarantee_badge || "Digital Guarantee",
    socialProofBadge: "Instant Digital Access",
    successTitle: "Purchase Successful",
    successMessage: "Thank you for your order! Click below to access your digital resource.",
    successCtaText: "Access Purchase →",
    successNextSteps: [
      "Click the access button below to open your resource.",
      "Check your email for your receipt and access link."
    ],
    emailSubject: `Your ${product?.name || 'ScaleCraft'} Access & Receipt`,
    emailHeadline: "Digital Delivery Ready",
    emailActionLabel: "Access Resource"
  };

  return mergeCustomProductSettings(product, defaults);
}

/**
 * Merges custom database product overrides into the experience configuration.
 * Priority: Custom Product DB Settings -> Behavioral UI Defaults
 */
function mergeCustomProductSettings(product: any, defaults: ProductExperienceConfig): ProductExperienceConfig {
  if (!product) return defaults;

  return {
    productType: defaults.productType,
    checkoutTitle: product.checkout_title || product.checkoutTitle || defaults.checkoutTitle,
    checkoutDescription: product.checkout_description || product.checkoutDescription || defaults.checkoutDescription,
    ctaText: product.custom_cta || product.cta_text || product.ctaText || defaults.ctaText,
    trustBadges: Array.isArray(product.trust_badges) && product.trust_badges.length > 0 ? product.trust_badges : defaults.trustBadges,
    deliveryMessage: product.delivery_message || product.deliveryMessage || defaults.deliveryMessage,
    pricingSubtext: product.pricing_subtext || product.pricingSubtext || defaults.pricingSubtext,
    guaranteeTitle: product.guarantee_title || product.guaranteeTitle || defaults.guaranteeTitle,
    guaranteeDescription: product.guarantee_description || product.guaranteeDescription || defaults.guaranteeDescription,
    guaranteeBadge: product.guarantee_badge || product.guaranteeBadge || defaults.guaranteeBadge,
    socialProofBadge: product.social_proof_badge || product.socialProofBadge || defaults.socialProofBadge,
    successTitle: product.success_title || product.successTitle || defaults.successTitle,
    successMessage: product.success_message || product.successMessage || defaults.successMessage,
    successCtaText: product.success_cta_text || product.successCtaText || defaults.successCtaText,
    successNextSteps: Array.isArray(product.success_next_steps) && product.success_next_steps.length > 0 ? product.success_next_steps : defaults.successNextSteps,
    emailSubject: product.email_subject || product.emailSubject || defaults.emailSubject,
    emailHeadline: product.email_headline || product.emailHeadline || defaults.emailHeadline,
    emailActionLabel: product.email_action_label || product.emailActionLabel || defaults.emailActionLabel,
  };
}
