import { useEffect, useRef } from 'react';

interface PayPalButtonProps {
  product: { _id: string; title: string };
  price: number;
  onSuccess: (orderId: string) => void;
}

declare global {
  interface Window { paypal?: any; }
}

export default function PayPalButton({ product, price, onSuccess }: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (rendered.current || !containerRef.current) return;

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

    const renderButton = () => {
      if (!window.paypal || !containerRef.current || rendered.current) return;
      rendered.current = true;
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'black',
          shape: 'rect',
          label: 'pay',
          height: 55,
        },
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              amount: { value: price.toString(), currency_code: 'USD' },
              description: product.title,
              custom_id: product._id,
            }],
          });
        },
        onApprove: async (_data: any, actions: any) => {
          const order = await actions.order.capture();
          onSuccess(order.id);
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          alert('Payment failed. Please try again or contact support.');
        },
      }).render(containerRef.current);
    };

    if (document.getElementById('paypal-sdk')) {
      renderButton();
    } else {
      const script = document.createElement('script');
      script.id = 'paypal-sdk';
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.onload = renderButton;
      document.body.appendChild(script);
    }
  }, [product._id, price]);

  return (
    <div className="w-full">
      <div ref={containerRef} className="rounded-2xl overflow-hidden" />
      <p className="text-center text-[10px] text-gray-600 mt-2">
        Powered by PayPal · 256-bit encrypted · Instant access after payment
      </p>
    </div>
  );
}
