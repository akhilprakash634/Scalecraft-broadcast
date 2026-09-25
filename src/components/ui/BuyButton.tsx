import React from 'react';

interface BuyButtonProps {
  productId: string;
  price: number;
  currency: string;
  symbol: string;
  name: string;
  loading?: boolean;
  text: string;
  product: any;
  prefilledCouponCode?: string;
  className?: string;
}

export default function BuyButton({
  productId,
  price,
  currency,
  symbol,
  name,
  loading,
  text,
  product,
  prefilledCouponCode,
  className
}: BuyButtonProps) {
  return (
    <button 
      className={`bg-accent text-white font-bold rounded flex items-center justify-center ${className || ''}`}
      disabled={loading}
    >
      {loading ? 'Loading...' : text || 'Buy Now'}
    </button>
  );
}
