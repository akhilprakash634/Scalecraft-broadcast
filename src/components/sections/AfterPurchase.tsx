'use client';

import { CreditCard, Inbox, CheckCircle2, Server, Headphones, MessageSquare, ShieldCheck, Play } from 'lucide-react';
import { getProductExperienceConfig } from '@/lib/productExperience';
import { Product } from '@/types/product';

interface AfterPurchaseProps {
  product?: Product | any;
}

export default function AfterPurchase({ product }: AfterPurchaseProps) {
  const exp = getProductExperienceConfig(product);
  
  const steps = Array.isArray(product?.how_it_works_steps) && product.how_it_works_steps.length > 0
    ? product.how_it_works_steps
    : Array.isArray(product?.how_it_works) && product.how_it_works.length > 0
    ? product.how_it_works
    : null;

  if (!steps || steps.length === 0) return null;

  const getStepIcon = (idx: number, productType: string) => {
    if (productType === 'managed_saas' || productType === 'saas') {
      const saasIcons = [CreditCard, Headphones, Server, MessageSquare, CheckCircle2];
      return saasIcons[idx % saasIcons.length];
    }
    if (productType === 'service') {
      const serviceIcons = [CreditCard, Headphones, ShieldCheck, CheckCircle2];
      return serviceIcons[idx % serviceIcons.length];
    }
    const digitalIcons = [CreditCard, Inbox, CheckCircle2, Play];
    return digitalIcons[idx % digitalIcons.length];
  };

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 max-w-[1100px] mx-auto border-t border-border-primary" id="after-purchase">
      <div className="text-center max-w-[580px] mx-auto mb-10">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          OPERATIONAL PROCESS
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-3">
          What happens after you buy?
        </h2>
        <p className="text-[14px] text-text-muted leading-relaxed">
          Zero friction. Here is the exact step-by-step process from checkout to live deployment.
        </p>
      </div>

      <div className={`grid grid-cols-1 ${steps.length >= 5 ? 'md:grid-cols-5' : steps.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 text-left`}>
        {steps.map((step: any, idx: number) => {
          const IconComp = getStepIcon(idx, exp.productType);
          return (
            <div key={idx} className="bg-bg-secondary border border-border-primary rounded-2xl p-5 hover:bg-white hover:shadow-card transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black text-text-light uppercase tracking-wider bg-bg-tertiary px-2 py-0.5 rounded-md">
                    Step 0{step.number || idx + 1}
                  </span>
                </div>
                <h3 className="font-heading text-[14px] font-black text-text-primary leading-snug">
                  {step.title || step.name}
                </h3>
                <p className="text-[12.5px] text-text-muted leading-relaxed">
                  {step.desc || step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
