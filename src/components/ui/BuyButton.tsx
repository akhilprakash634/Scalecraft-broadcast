'use client';

import React, { useState } from 'react';
import CheckoutModal from './CheckoutModal';
import { initiateCheckout } from '@/utils/razorpay';
import { Product } from '@/types/product';
import { getDynamicCTA } from '@/lib/validateProduct';

interface BuyButtonProps {
  productId: string;
  price: number;
  name: string;
  currency?: string;
  symbol?: string;
  text?: string;
  className?: string;
  loading?: boolean;
  product?: Product | any;
  prefilledCouponCode?: string;
}

export default function BuyButton({ 
  productId, 
  price, 
  name, 
  currency = 'INR', 
  symbol = '₹', 
  text, 
  className,
  loading = false,
  product,
  prefilledCouponCode
}: BuyButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfirm = async (buyerName: string, buyerEmail: string, couponCode?: string, discountedPrice?: number) => {
    setIsModalOpen(false);
    
    const finalAmount = discountedPrice !== undefined ? discountedPrice : price;
    
    await initiateCheckout({
      amount: finalAmount,
      currency: currency ?? 'INR',
      name: 'ScaleCraft',
      description: name,
      productId: productId,
      notionUrl: (product?.product_type === 'digital' || product?.product_type === 'template' || !product?.product_type || product?.product_type !== 'saas')
        ? (product?.notion_url || product?.url || product?.section_visibility?.notion_url || product?.section_visibility?.url || '')
        : '',
      buyerName,
      buyerEmail,
      couponCode,
      onSuccess: (response, email) => {
        // Secure redirect to verification & onboarding thank-you page
        let redirectUrl = `/thank-you?payment_id=${response.razorpay_payment_id}&product_id=${productId}&email=${encodeURIComponent(email || '')}&name=${encodeURIComponent(buyerName)}`;
        if (couponCode) {
          redirectUrl += `&coupon=${encodeURIComponent(couponCode)}`;
        }
        window.location.href = redirectUrl;
      },
      onCancel: () => {
        console.log('Checkout closed by buyer');
      }
    });
  };

  const buttonText = text || getDynamicCTA(product || { name, price, product_type: name?.toLowerCase().includes('agent') ? 'saas' : 'digital' }, 'landing');

  if (loading) {
    return (
      <div className={`w-full h-[46px] bg-foreground/5 animate-pulse rounded-[9px] ${className || ''}`} />
    );
  }

  return (
    <>
      <button 
        type="button"
        onClick={() => {
          if (typeof window !== 'undefined' && (window as any).fbq) {
            const isINR = currency === 'INR';
            (window as any).fbq('track', 'InitiateCheckout', {
              content_name: name,
              content_type: 'product',
              value: isINR ? price : Math.round(price / 80),
              currency: isINR ? 'INR' : 'USD',
              num_items: 1
            });
            console.log('Pixel: InitiateCheckout fired');
          }
          
          // Redirect SaaS products to the dedicated onboarding checkout page
          const isSaaS = product?.product_type === 'saas' || productId === 'scalecraft-agent-saas' || productId === 'mOBd3I07NrgTLn79T01oEq';
          if (isSaaS) {
            const searchStr = typeof window !== 'undefined' ? window.location.search : '';
            window.location.href = `/saas/checkout${searchStr}`;
            return;
          }

          setIsModalOpen(true);
        }}
        className={`block w-full py-[13px] bg-accent text-white text-center border-none rounded-[12px] text-[14px] font-bold cursor-pointer font-body hover:bg-blue-600 shadow-md hover:shadow-lg transition-all ${className || ''}`}
      >
        {buttonText}
      </button>

      <CheckoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        productName={name}
        price={price}
        productId={productId}
        currency={currency}
        symbol={symbol}
        product={product}
        prefilledCouponCode={prefilledCouponCode}
      />
    </>
  );
}
