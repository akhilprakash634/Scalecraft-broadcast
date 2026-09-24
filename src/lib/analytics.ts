/**
 * Unified Analytics Tracking Wrapper
 * Decouples individual tracking tools from react components
 */

interface EventData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  search_term?: string;
  [key: string]: any;
}

export function trackEvent(name: string, data?: EventData) {
  if (typeof window === 'undefined') return;

  try {
    // 1. Google Analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', name, data);
    }

    // 2. Facebook Pixel (Mapping standard checkout actions)
    if ((window as any).fbq) {
      if (name === 'checkout_initiated') {
        (window as any).fbq('track', 'InitiateCheckout', {
          content_name: data?.content_name,
          value: data?.value,
          currency: data?.currency || 'INR',
        });
      } else if (name === 'purchase_success') {
        (window as any).fbq('track', 'Purchase', {
          content_name: data?.content_name,
          value: data?.value,
          currency: data?.currency || 'INR',
        });
      } else if (name === 'product_viewed') {
        (window as any).fbq('track', 'ViewContent', {
          content_name: data?.content_name,
          value: data?.value,
          currency: data?.currency || 'INR',
          content_type: 'product',
        });
      } else {
        (window as any).fbq('trackCustom', name, data);
      }
    }

    // 3. Microsoft Clarity
    if ((window as any).clarity) {
      (window as any).clarity('event', name, data);
    }
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
}
