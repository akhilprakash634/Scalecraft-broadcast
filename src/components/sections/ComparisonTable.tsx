'use client';

import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { CTA_LABELS, LOCAL_PRODUCTS } from '@/lib/content';
import { getFormattedPrice, GeoPaymentState } from '@/lib/pricing';

interface ComparisonTableProps {
  liveProducts?: any[];
  geoPayment?: GeoPaymentState;
  comparisonConfig?: {
    product_slugs?: string[];
    recommended_texts?: string[];
    outcomes?: Array<{ name: string; leadFinder: boolean; blueprint: boolean; combo: boolean }>;
  };
}

export default function ComparisonTable({ liveProducts, geoPayment, comparisonConfig }: ComparisonTableProps) {
  const geo = geoPayment || { isIndia: true, currency: 'INR', symbol: '₹' };

  // Find products from database or fallback to authority
  const getProductObj = (slug: string) => {
    const dbP = liveProducts?.find((p) => p.slug === slug || p.slug?.current === slug);
    if (dbP) return dbP;
    return LOCAL_PRODUCTS[slug] || {};
  };

  const bpProduct = getProductObj('freelance-client-pipeline-blueprint');
  const lfProduct = getProductObj('ai-lead-finder-system');
  const comboProduct = getProductObj('ai-systems-combo');

  const pBp = getFormattedPrice(bpProduct, geo);
  const pLf = getFormattedPrice(lfProduct, geo);
  const pCombo = getFormattedPrice(comboProduct, geo);

  const separateSumNum = pBp.price + pLf.price;
  const comboSavingsNum = Math.max(0, separateSumNum - pCombo.price);

  const formattedSeparateSum = `${pCombo.symbol}${geo.isIndia ? separateSumNum.toLocaleString('en-IN') : separateSumNum.toLocaleString('en-US')}`;
  const formattedComboSavings = `${pCombo.symbol}${geo.isIndia ? comboSavingsNum.toLocaleString('en-IN') : comboSavingsNum.toLocaleString('en-US')}`;

  const getProductName = (p: any, fallback: string) => {
    if (!p || !p.name) return fallback;
    if (typeof p.name === 'string') return p.name;
    if (typeof p.name?.en === 'string') return p.name.en;
    return fallback;
  };

  const lfName = getProductName(lfProduct, 'Lead Finder');
  const bpName = getProductName(bpProduct, 'Pipeline Blueprint');
  const comboName = getProductName(comboProduct, 'AI Systems Combo');

  const outcomes = comparisonConfig?.outcomes || [
    { name: 'Need qualified leads', blueprint: false, leadFinder: true, combo: true },
    { name: 'Need outreach templates', blueprint: true, leadFinder: false, combo: true },
    { name: 'Need proposal system', blueprint: true, leadFinder: false, combo: true },
    { name: 'Need client tracking', blueprint: true, leadFinder: false, combo: true },
    { name: 'Need complete workflow', blueprint: false, leadFinder: false, combo: true },
  ];

  const recommendedLf = comparisonConfig?.recommended_texts?.[0] || 'Finding qualified businesses';
  const recommendedBp = comparisonConfig?.recommended_texts?.[1] || 'Converting leads into paying clients';
  const recommendedCombo = comparisonConfig?.recommended_texts?.[2] || 'Building a complete business workflow';

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 max-w-[1100px] mx-auto border-t border-border-primary" id="comparison">
      <div className="max-w-[620px] mb-12">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          CHOOSE YOUR WORKFLOW
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-4">
          Which product is right for you?
        </h2>
        <p className="text-[15px] text-text-muted leading-relaxed">
          Compare what you get in each package to choose the one that fits your goals.
        </p>
      </div>

      <div className="border border-border-primary rounded-[20px] overflow-hidden bg-white shadow-xs max-w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px] font-sans text-xs">
          <thead>
            <tr className="bg-bg-secondary border-b border-border-primary text-text-primary font-bold">
              <th className="p-4 md:p-5 text-[13px] font-black w-2/5">Outcome Overview</th>
              <th className="p-4 text-center text-text-muted font-bold">
                {lfName}
                <span className="block text-[10px] font-normal mt-0.5">{pLf.formattedPrice}</span>
              </th>
              <th className="p-4 text-center text-text-muted font-bold">
                {bpName}
                <span className="block text-[10px] font-normal mt-0.5">{pBp.formattedPrice}</span>
              </th>
              <th className="p-4 text-center text-accent font-black bg-accent/5">
                {comboName}
                <span className="block text-[10px] font-bold text-accent mt-0.5">
                  {pCombo.formattedPrice} &middot; Best Value
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary text-text-primary">
            {/* Recommended For Top Row */}
            <tr className="bg-accent/2 hover:bg-accent/3 transition-colors font-bold border-b border-border-primary">
              <td className="p-4 md:p-5 font-bold text-text-primary text-[12.5px]">Recommended For</td>
              <td className="p-4 text-center text-text-muted text-[11px] font-semibold leading-normal">{recommendedLf}</td>
              <td className="p-4 text-center text-text-muted text-[11px] font-semibold leading-normal">{recommendedBp}</td>
              <td className="p-4 text-center text-accent bg-accent/5 text-[11px] font-bold leading-normal">{recommendedCombo}</td>
            </tr>

            {outcomes.map((outcome, i) => (
              <tr key={i} className="hover:bg-bg-secondary/40 transition-colors">
                <td className="p-4 md:p-5 font-medium text-text-primary text-[12.5px]">{outcome.name}</td>
                <td className="p-4 text-center">
                  {outcome.leadFinder ? (
                    <Check className="w-4.5 h-4.5 text-green mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-text-light mx-auto" />
                  )}
                </td>
                <td className="p-4 text-center">
                  {outcome.blueprint ? (
                    <Check className="w-4.5 h-4.5 text-green mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-text-light mx-auto" />
                  )}
                </td>
                <td className="p-4 text-center bg-accent/5">
                  {outcome.combo ? (
                    <Check className="w-4.5 h-4.5 text-accent mx-auto font-bold" />
                  ) : (
                    <X className="w-4 h-4 text-text-light mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-bg-secondary border border-border-primary rounded-[20px] p-6 text-xs text-text-muted leading-relaxed">
        <p>
          💡 <strong>Pricing note:</strong> The {comboName} includes full copies of both products. Buying them separately costs {formattedSeparateSum}. Selecting the combo saves you {formattedComboSavings}.
        </p>
        <Link 
          href="/products/ai-systems-combo"
          className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shrink-0"
        >
          {CTA_LABELS.access}
        </Link>
      </div>
    </section>
  );
}
