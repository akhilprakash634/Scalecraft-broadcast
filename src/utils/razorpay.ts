declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOptions {
  amount: number;
  currency?: string;
  name: string;
  description: string;
  productId: string;
  notionUrl?: string;
  image?: string;
  buyerName?: string;
  buyerEmail?: string;
  couponCode?: string;
  businessName?: string;
  botPhone?: string;
  ownerPhone?: string;
  geminiApiKey?: string;
  clientId?: string;
  plan_type?: string;
  onSuccess: (response: any, buyerEmail?: string) => void;
  onCancel?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://paymentgateway.growyourbusiness.today';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const initiateCheckout = async (options: PaymentOptions) => {
  try {
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      throw new Error('Razorpay SDK failed to load. Please check your internet connection or disable any adblockers.');
    }

    // 1. Create order on the backend (pass buyer info for storage)
    const orderResponse = await fetch(`${API_URL}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(options.amount * 100), // Convert INR to paise for Razorpay
        currency: options.currency,
        name: options.buyerName,
        buyer_name: options.buyerName,
        buyerName: options.buyerName,
        email: options.buyerEmail,
        buyer_email: options.buyerEmail,
        buyerEmail: options.buyerEmail,
        productId: options.productId,
        product_id: options.productId,
        productName: options.description || options.name,
        product_name: options.description || options.name,
        notionUrl: options.notionUrl,
        notion_url: options.notionUrl,
        couponCode: options.couponCode,
        coupon_code: options.couponCode,
        businessName: options.businessName,
        business_name: options.businessName,
        botPhone: options.botPhone,
        bot_phone: options.botPhone,
        ownerPhone: options.ownerPhone,
        owner_phone: options.ownerPhone,
        geminiApiKey: options.geminiApiKey,
        gemini_api_key: options.geminiApiKey,
        clientId: options.clientId,
        client_id: options.clientId,
        plan_type: options.plan_type,
        planType: options.plan_type,
      }),
    });

    if (!orderResponse.ok) {
      throw new Error('Failed to create order. Please try again.');
    }

    const orderData = await orderResponse.json();

    // 2. Open Razorpay Checkout
    const rzpOptions = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: options.currency ?? 'INR',
      name: options.name,
      description: options.description,
      image: options.image || 'https://static.readdy.ai/image/3a79f3d26d575281f009959c52307d03/4faeac9cacf9a888180dbe48ffa35e91.png',
      order_id: orderData.id,
      handler: async (response: any) => {
        // 3. Verify payment on the backend (include buyer info)
        try {
          const verifyResponse = await fetch(`${API_URL}/api/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              buyer_email: options.buyerEmail,
              buyerEmail: options.buyerEmail,
              buyer_name: options.buyerName,
              buyerName: options.buyerName,
              product_id: options.productId,
              productId: options.productId,
              product_name: options.description || options.name,
              productName: options.description || options.name,
              notion_url: options.notionUrl,
              notionUrl: options.notionUrl,
              amount: Math.round(options.amount * 100), // Send paise to backend for verification & Sanity sync
              currency: options.currency || 'INR',
              couponCode: options.couponCode,
              coupon_code: options.couponCode,
              businessName: options.businessName,
              business_name: options.businessName,
              botPhone: options.botPhone,
              bot_phone: options.botPhone,
              ownerPhone: options.ownerPhone,
              owner_phone: options.ownerPhone,
              geminiApiKey: options.geminiApiKey,
              gemini_api_key: options.geminiApiKey,
              clientId: options.clientId,
              client_id: options.clientId,
              plan_type: options.plan_type,
              planType: options.plan_type,
            }),
          });

          if (verifyResponse.ok) {
            options.onSuccess(response, options.buyerEmail);
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        } catch (error) {
          console.error('Verification error:', error);
          alert('Error verifying payment.');
        }
      },
      prefill: {
        name: options.buyerName || '',
        email: options.buyerEmail || '',
        contact: '',
      },
      theme: {
        color: '#10b981', // Sleek green accent
      },
      modal: {
        ondismiss: () => {
          if (options.onCancel) options.onCancel();
        },
      },
    };

    if (typeof window.Razorpay !== 'function') {
      throw new Error('Razorpay SDK failed to load. Please disable your adblocker or check your internet connection.');
    }

    const rzp = new window.Razorpay(rzpOptions);
    rzp.open();
  } catch (error: any) {
    console.error('Checkout error:', error);
    alert(`Checkout failed: ${error.message || 'An unexpected error occurred.'}`);
  }
};
