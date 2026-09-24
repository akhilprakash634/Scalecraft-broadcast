'use client';

import React from 'react';
import { Target, XCircle, Wrench, Truck, Briefcase, TrendingUp } from 'lucide-react';
import { getProductExperienceConfig } from '@/lib/productExperience';

interface ProductAiSearchBlockProps {
  product: any;
}

export default function ProductAiSearchBlock({ product }: ProductAiSearchBlockProps) {
  if (!product) return null;

  const exp = getProductExperienceConfig(product);

  // Read ONLY from the authoritative Product object stored in Supabase
  const targetAudience = product.who_is_this_for || product.target_audience;
  const whoShouldNotBuy = product.who_should_not_buy;
  const requirements = product.requirements;
  const useCases = product.use_cases;
  const expectedResults = product.expected_results;

  const hasAudience = Array.isArray(targetAudience) ? targetAudience.length > 0 : Boolean(targetAudience);
  const hasWhoNot = Array.isArray(whoShouldNotBuy) ? whoShouldNotBuy.length > 0 : Boolean(whoShouldNotBuy);
  const hasReqs = Array.isArray(requirements) ? requirements.length > 0 : Boolean(requirements);
  const hasUseCases = Array.isArray(useCases) ? useCases.length > 0 : Boolean(useCases);
  const hasResults = Array.isArray(expectedResults) ? expectedResults.length > 0 : Boolean(expectedResults);
  const hasGuarantee = Boolean(product.guarantee_description || product.guarantee_title);
  const hasDelivery = Boolean(product.delivery_message);

  // If NO custom content fields exist on the product object, hide the entire section!
  if (!hasAudience && !hasWhoNot && !hasReqs && !hasUseCases && !hasResults && !hasGuarantee && !hasDelivery) {
    return null;
  }

  return (
    <section id="ai-specifications" className="space-y-8 pt-6 border-t border-border-primary">
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block">
          SYSTEM SPECIFICATIONS &amp; GOVERNANCE
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
          Product Details &amp; Eligibility
        </h2>
        <p className="text-[13.5px] text-text-muted">
          Specific parameters, prerequisites, use cases, and risk reversal terms for {product.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Who is this for */}
        {hasAudience && (
          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 font-heading text-[15px] font-black text-text-primary">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <span>Who is this for?</span>
            </div>
            <ul className="space-y-2 text-[12.5px] text-text-muted">
              {Array.isArray(targetAudience) ? targetAudience.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              )) : <li className="text-[12.5px] text-text-muted">{targetAudience}</li>}
            </ul>
          </div>
        )}

        {/* Who should not buy */}
        {hasWhoNot && (
          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 font-heading text-[15px] font-black text-text-primary">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <span>Who should NOT buy?</span>
            </div>
            <ul className="space-y-2 text-[12.5px] text-text-muted">
              {Array.isArray(whoShouldNotBuy) ? whoShouldNotBuy.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              )) : <li className="text-[12.5px] text-text-muted">{whoShouldNotBuy}</li>}
            </ul>
          </div>
        )}

        {/* Requirements */}
        {hasReqs && (
          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 font-heading text-[15px] font-black text-text-primary">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <span>System Requirements</span>
            </div>
            <ul className="space-y-2 text-[12.5px] text-text-muted">
              {Array.isArray(requirements) ? requirements.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              )) : <li className="text-[12.5px] text-text-muted">{requirements}</li>}
            </ul>
          </div>
        )}

        {/* Delivery & Protocol */}
        {hasDelivery && (
          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 font-heading text-[15px] font-black text-text-primary">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <span>Delivery Protocol</span>
            </div>
            <p className="text-[12.5px] text-text-muted leading-relaxed">
              {exp.deliveryMessage}
            </p>
          </div>
        )}

        {/* Use Cases */}
        {hasUseCases && (
          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 font-heading text-[15px] font-black text-text-primary">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <span>Primary Use Cases</span>
            </div>
            <ul className="space-y-2 text-[12.5px] text-text-muted">
              {Array.isArray(useCases) ? useCases.map((uc: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent font-bold shrink-0">→</span>
                  <span>{uc}</span>
                </li>
              )) : <li className="text-[12.5px] text-text-muted">{useCases}</li>}
            </ul>
          </div>
        )}

        {/* Expected Results */}
        {hasResults && (
          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 font-heading text-[15px] font-black text-text-primary">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span>Expected Results</span>
            </div>
            <ul className="space-y-2 text-[12.5px] text-text-muted">
              {Array.isArray(expectedResults) ? expectedResults.map((er: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent font-bold shrink-0">✓</span>
                  <span>{er}</span>
                </li>
              )) : <li className="text-[12.5px] text-text-muted">{expectedResults}</li>}
            </ul>
          </div>
        )}

      </div>

      {/* Guarantee & Terms Box */}
      {hasGuarantee && (
        <div className="bg-accent/5 border border-accent/15 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            {exp.guaranteeBadge && (
              <span className="text-[10px] font-black uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                {exp.guaranteeBadge}
              </span>
            )}
            {exp.guaranteeTitle && (
              <h4 className="font-heading text-base font-bold text-text-primary">
                {exp.guaranteeTitle}
              </h4>
            )}
            {exp.guaranteeDescription && (
              <p className="text-[12.5px] text-text-muted leading-relaxed">
                {exp.guaranteeDescription}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
