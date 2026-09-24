import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, User, ArrowRight, ShieldCheck, Loader2, Tag } from 'lucide-react';
import { Product } from '@/types/product';
import { getProductExperienceConfig } from '@/lib/productExperience';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, email: string, couponCode?: string, discountedPrice?: number) => void;
  productName: string;
  price: number;
  productId: string;
  currency?: string;
  symbol?: string;
  product?: Product | any;
  prefilledCouponCode?: string;
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  productName, 
  price,
  productId,
  currency = 'INR',
  symbol = '₹',
  product,
  prefilledCouponCode
}: CheckoutModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Coupon code states
  const [couponInput, setCouponInput] = useState(prefilledCouponCode || '');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    discountedPrice: number;
    originalPrice: number;
    type: string;
    value: number;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponError, setCouponError] = useState(false);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && prefilledCouponCode && !appliedCoupon) {
      setCouponInput(prefilledCouponCode);
    }
  }, [isOpen, prefilledCouponCode, appliedCoupon]);

  if (!isOpen || !mounted) return null;

  // Product Experience Engine resolution
  const exp = getProductExperienceConfig(product || { name: productName, price });
  const isFree = price === 0;

  let modalHeading = exp.checkoutTitle;
  let modalDescription = exp.checkoutDescription;
  let modalCtaText = exp.ctaText;
  let modalFooterNote = currency === 'INR'
    ? `🔒 Secure payment via Razorpay · ${exp.deliveryMessage}`
    : `🔒 Charged in USD · Secure payment via PayPal · ${exp.deliveryMessage}`;

  if (isFree) {
    modalHeading = 'Get Instant Access';
    modalDescription = 'Enter your email address to receive your free resource immediately.';
    modalCtaText = 'Claim Free Access →';
    modalFooterNote = '🔒 Zero cost · Instant access link';
  }

  const handleApplyCoupon = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponMessage('');
    setCouponError(false);
    setIsValidatingCoupon(true);

    try {
      const res = await fetch(`/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim(),
          productId: productId,
          price: price,
          currency: currency
        })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
        const savedSymbol = currency === 'INR' ? '₹' : '$';
        setCouponMessage(`Coupon "${data.code}" applied! Saved ${savedSymbol}${data.discount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}.`);
        setCouponError(false);
      } else {
        setAppliedCoupon(null);
        setCouponMessage(data.error || 'Invalid coupon code');
        setCouponError(true);
      }
    } catch (err) {
      console.error('Coupon validation error:', err);
      setAppliedCoupon(null);
      setCouponMessage('Error validating coupon. Please try again.');
      setCouponError(true);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMessage('');
    setCouponError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    onConfirm(
      name, 
      email, 
      appliedCoupon ? appliedCoupon.code : undefined,
      appliedCoupon ? appliedCoupon.discountedPrice : undefined
    );
    setIsSubmitting(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Modal */}
      <div className="relative bg-background w-full max-w-md rounded-[2rem] border border-border-primary shadow-[0_24px_60px_rgba(0,0,0,0.08)] max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0055ff]/5 rounded-full blur-[40px] -z-0"></div>
        
        <div className="relative z-10 p-5 sm:p-6 space-y-5">
          <div className="flex justify-between items-start">
            <div className="space-y-1 pr-4">
              <h3 id="modal-title" className="text-2xl font-black text-foreground leading-tight">{modalHeading}</h3>
              <p className="text-text-muted text-sm leading-relaxed font-medium">
                {modalDescription}
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 hover:bg-bg-secondary rounded-full text-text-light hover:text-foreground transition-colors shrink-0"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[9px] text-text-muted uppercase font-black tracking-widest">Product</p>
                <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{productName}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-text-muted uppercase font-black tracking-widest">Price</p>
                <p className={`text-sm font-bold text-foreground ${appliedCoupon ? 'line-through text-text-muted' : ''}`}>
                  {symbol}{currency === 'INR' ? price.toLocaleString('en-IN') : price.toLocaleString('en-US')}
                </p>
              </div>
            </div>
            {appliedCoupon && (
              <div className="flex items-center justify-between text-xs text-[#047857] font-semibold border-t border-border-primary/50 pt-2">
                <span className="flex items-center gap-1"><Tag size={10} /> Discount ({appliedCoupon.code})</span>
                <span>-{symbol}{appliedCoupon.discount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border-primary/50 pt-2">
              <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">Total Due</span>
              <span className="text-xl font-black text-[#0055ff]">
                {symbol}{currency === 'INR' 
                  ? (appliedCoupon ? appliedCoupon.discountedPrice : price).toLocaleString('en-IN') 
                  : (appliedCoupon ? appliedCoupon.discountedPrice : price).toLocaleString('en-US')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="checkout-name" className="text-xs font-bold uppercase tracking-wider text-text-muted ml-1">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                  <input
                    id="checkout-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-bg-secondary border border-border-primary rounded-xl pl-12 pr-4 py-3 text-foreground placeholder-text-light focus:outline-none focus:bg-background focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm font-semibold"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="checkout-email" className="text-xs font-bold uppercase tracking-wider text-text-muted ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                  <input
                    id="checkout-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-bg-secondary border border-border-primary rounded-xl pl-12 pr-4 py-3 text-foreground placeholder-text-light focus:outline-none focus:bg-background focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm font-semibold"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Coupon Field */}
              <div className="space-y-2 border-t border-border-primary/50 pt-4 mt-2">
                <label htmlFor="checkout-coupon" className="text-xs font-bold uppercase tracking-wider text-text-muted ml-1 flex items-center gap-1.5">
                  <Tag size={12} className="text-[#0055ff]" /> Have a coupon code?
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="checkout-coupon"
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="e.g. WELCOME10"
                      disabled={!!appliedCoupon || isValidatingCoupon}
                      className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-2.5 text-foreground placeholder-text-light focus:outline-none focus:bg-background focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm uppercase font-semibold tracking-wider"
                    />
                  </div>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-all uppercase tracking-wider shrink-0"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || isValidatingCoupon}
                      className="px-4 py-2.5 bg-[#0055ff] text-white rounded-xl text-xs font-bold hover:bg-[#0033cc] transition-all uppercase tracking-wider disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[70px]"
                    >
                      {isValidatingCoupon ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                  )}
                </div>
                {couponMessage && (
                  <p className={`text-xs ml-1 transition-all ${couponError ? 'text-red-500' : 'text-[#047857] font-semibold'}`}>
                    {couponMessage}
                  </p>
                )}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm ml-1" role="alert">{error}</p>}

            <p className="text-[11px] text-text-muted text-center leading-relaxed">
              {modalFooterNote}
            </p>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0055ff] text-white py-3.5 rounded-xl font-black text-[17px] hover:bg-[#0033cc] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(0,85,255,0.2)] disabled:opacity-70 group cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <span>{modalCtaText}</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </>
                )}
              </button>
              
              <p className="text-center text-[10px] text-text-muted uppercase font-bold tracking-widest flex items-center justify-center gap-2">
                <ShieldCheck size={12} className="text-[#0055ff]" aria-hidden="true" />{' '}
                {currency === 'INR' ? 'Secure payment via Razorpay' : 'Secure payment via PayPal'}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

