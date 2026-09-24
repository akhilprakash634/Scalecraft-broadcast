/**
 * Centralized Pricing Utility Authority for ScaleCraft
 * Handles dynamic INR / USD selection, discount calculation, and symbol formatting
 * based strictly on stored database values.
 */

export interface GeoPaymentState {
  isIndia: boolean;
  currency: string;
  symbol: string;
  loading?: boolean;
}

export interface PricingData {
  price?: number;
  originalPrice?: number;
  original_price?: number;
  internationalPrice?: number;
  international_price?: number;
  internationalActualPrice?: number;
  international_actual_price?: number;
  priceINR?: number;
  priceUSD?: number;
  originalPriceINR?: number;
  originalPriceUSD?: number;
  [key: string]: any;
}

export interface FormattedPriceResult {
  isIndia: boolean;
  currency: string;
  symbol: string;
  price: number;
  originalPrice: number;
  hasDiscount: boolean;
  discountPct: number;
  savingsAmount: number;
  formattedPrice: string;
  formattedOriginalPrice: string;
  formattedSavings: string;
}

/**
 * Main pricing formatter function
 */
export function getFormattedPrice(
  product: PricingData,
  geo: GeoPaymentState = { isIndia: true, currency: 'INR', symbol: '₹' }
): FormattedPriceResult {
  if (!product) {
    return {
      isIndia: geo.isIndia !== false,
      currency: geo.isIndia !== false ? 'INR' : 'USD',
      symbol: geo.isIndia !== false ? '₹' : '$',
      price: 0,
      originalPrice: 0,
      hasDiscount: false,
      discountPct: 0,
      savingsAmount: 0,
      formattedPrice: geo.isIndia !== false ? '₹0' : '$0',
      formattedOriginalPrice: geo.isIndia !== false ? '₹0' : '$0',
      formattedSavings: geo.isIndia !== false ? '₹0' : '$0',
    };
  }

  // Extract INR prices
  const inrPrice = Number(product.priceINR ?? product.price ?? 0);
  const inrOriginal = Number(
    product.originalPriceINR ?? product.original_price ?? product.originalPrice ?? inrPrice
  );

  // Extract USD prices
  const rawUsdPrice = Number(
    product.priceUSD ?? product.international_price ?? product.internationalPrice ?? 0
  );
  const usdPrice = rawUsdPrice > 0 ? rawUsdPrice : Math.round(inrPrice / 80);

  const rawUsdOriginal = Number(
    product.originalPriceUSD ??
      product.international_actual_price ??
      product.internationalActualPrice ??
      0
  );
  const usdOriginal =
    rawUsdOriginal > 0 ? rawUsdOriginal : (inrOriginal > 0 ? Math.round(inrOriginal / 80) : usdPrice);

  const isIndia = geo.isIndia !== false;
  const currency = isIndia ? 'INR' : 'USD';
  const symbol = isIndia ? '₹' : '$';

  const price = isIndia ? inrPrice : usdPrice;
  const originalPrice = isIndia ? inrOriginal : usdOriginal;

  const hasDiscount = originalPrice > price;
  const discountPct = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const savingsAmount = originalPrice - price;

  const formattedPrice = `${symbol}${isIndia ? price.toLocaleString('en-IN') : price.toLocaleString('en-US')}`;
  const formattedOriginalPrice = `${symbol}${isIndia ? originalPrice.toLocaleString('en-IN') : originalPrice.toLocaleString('en-US')}`;
  const formattedSavings = `${symbol}${isIndia ? savingsAmount.toLocaleString('en-IN') : savingsAmount.toLocaleString('en-US')}`;

  return {
    isIndia,
    currency,
    symbol,
    price,
    originalPrice,
    hasDiscount,
    discountPct,
    savingsAmount,
    formattedPrice,
    formattedOriginalPrice,
    formattedSavings,
  };
}
