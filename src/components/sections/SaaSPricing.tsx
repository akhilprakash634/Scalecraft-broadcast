'use client';

import React from 'react';
import { Check, ShieldCheck, Zap, Server } from 'lucide-react';
import { getFormattedPrice, GeoPaymentState } from '@/lib/pricing';

interface SaaSPricingProps {
  geoPayment?: GeoPaymentState;
  saasProduct?: any;
}

export default function SaaSPricing({ geoPayment, saasProduct }: SaaSPricingProps) {
  const geo = geoPayment || { isIndia: true, currency: 'INR', symbol: '₹' };
  const symbol = geo.symbol || (geo.isIndia ? '₹' : '$');

  const formattedSetup = getFormattedPrice(
    saasProduct || { price: 6999, international_price: 89 },
    geo
  );

  const plans = [
    {
      name: 'Starter',
      priceINR: '749',
      priceUSD: '9',
      limit: '500 messages / mo',
      description: 'Ideal for small retail shops and service consultants starting with AI sales.',
      features: [
        'AWS Lightsail VPS Managed Server',
        'SOUL Prompt instructions custom form',
        '24/7 client response gateway',
        'Google Sheets Lead sync (6h)',
        'Basic chat CRM overview',
      ],
      popular: false,
    },
    {
      name: 'Growth',
      priceINR: '1,199',
      priceUSD: '15',
      limit: '2,000 messages / mo',
      description: 'Built for scaling brands requiring active client conversation volumes.',
      features: [
        'AWS Lightsail VPS Managed Server',
        'SOUL Prompt instructions custom form',
        '24/7 client response gateway',
        'Google Sheets Lead sync (6h)',
        'Detailed chat CRM + lead memories',
        'Gemini 2.5 Flash API calls included',
        'Objections analysis dashboard',
      ],
      popular: true,
    },
    {
      name: 'Pro',
      priceINR: '1,999',
      priceUSD: '25',
      limit: 'Unlimited messages',
      description: 'Maximum performance for large agencies and high-traffic eCommerce storefronts.',
      features: [
        'Dedicated AWS Lightsail Nano Node',
        'SOUL Prompt instructions custom form',
        '24/7 client response gateway',
        'Real-time Sheets synchronization',
        'Full chat CRM + interactive replies',
        'Unlimited AI model API processing',
        'Voice messages transcription support',
        'Targeted broadcast campaign tools',
      ],
      popular: false,
    },
  ];

  return (
    <section id="saas-pricing" className="py-20 bg-[#F8FBF8] border-t border-[#EBEBEB]">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[11px] bg-[#E8F5E9] text-[#2E7D32] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Managed SaaS Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#111110] tracking-tight font-heading">
            SaaS Plans Built for Growing Brands
          </h2>
          <p className="text-sm text-[#6F6E69] leading-relaxed">
            Get your WhatsApp AI sales agent running 24/7. We handle server configuration, VPS instances, model updates, and OTP systems.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const displayPrice = geo.isIndia ? plan.priceINR : plan.priceUSD;
            return (
              <div
                key={plan.name}
                className={`bg-white rounded-3xl border p-8 flex flex-col justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.02)] transition-transform hover:-translate-y-1 duration-200 ${
                  plan.popular ? 'border-[#1B5E20] ring-1 ring-[#1B5E20]' : 'border-[#EBEBEB]'
                }`}
              >
                {plan.popular && (
                  <span className="absolute top-0 right-8 -translate-y-1/2 bg-[#1B5E20] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-[#111110] font-heading">{plan.name}</h3>
                    <p className="text-xs text-[#6F6E69] mt-1 min-h-[32px]">{plan.description}</p>
                  </div>

                  <div className="border-t border-[#EBEBEB] pt-4">
                    <div className="flex items-baseline text-[#111110]">
                      <span className="text-lg font-bold">{symbol}</span>
                      <span className="text-4xl font-black font-heading">{displayPrice}</span>
                      <span className="text-xs font-semibold text-[#6F6E69] ml-1">/ month</span>
                    </div>
                    <span className="text-[10px] text-[#2E7D32] bg-[#E8F5E9] font-black px-2 py-0.5 rounded uppercase mt-2 inline-block">
                      {plan.limit}
                    </span>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-3.5 text-xs text-[#6F6E69] border-t border-[#EBEBEB] pt-6">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start space-x-2.5">
                        <Check size={14} className="text-[#1B5E20] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="mt-8 pt-4">
                  <a
                    href="/dashboard/login"
                    className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer ${
                      plan.popular
                        ? 'bg-[#1B5E20] hover:bg-[#144317] text-white'
                        : 'bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-[#212121]'
                    }`}
                  >
                    <Zap size={14} />
                    <span>Start Managed Onboarding</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Extra Onboarding Pricing notes */}
        <div className="bg-white border border-[#EBEBEB] rounded-3xl p-8 max-w-3xl mx-auto shadow-[0_1px_3px_rgba(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <h4 className="text-base font-bold text-[#111110] flex items-center space-x-1.5 font-heading">
              <ShieldCheck className="text-[#1B5E20]" />
              <span>{formattedSetup.formattedPrice} Setup &amp; Activation Fee</span>
            </h4>
            <p className="text-xs text-[#6F6E69] leading-relaxed">
              Every managed account requires a one-time onboarding setup fee. We provision your dedicated AWS Lightsail VPS server, configure local WhatsApp pairing gateways, and initialize the agent prompts.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-[#F8FBF8] border border-[#EBEBEB] rounded-2xl">
            <Server size={24} className="text-[#1B5E20] mb-1" />
            <span className="text-[10px] uppercase font-bold text-[#6F6E69]">Includes VPS Rent</span>
            <span className="text-xs font-black text-[#111110] mt-0.5">First month free</span>
          </div>
        </div>
      </div>
    </section>
  );
}
