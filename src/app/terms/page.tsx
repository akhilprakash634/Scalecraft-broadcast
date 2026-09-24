import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | ScaleCraft',
  description: 'The terms governing your use of ScaleCraft products and services.',
  alternates: {
    canonical: 'https://thescalecraft.in/terms',
  },
  openGraph: {
    title: 'Terms of Service | ScaleCraft',
    description: 'The terms governing your use of ScaleCraft products and services.',
    url: 'https://thescalecraft.in/terms',
  },
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen py-20 px-10 max-w-[800px] mx-auto">
      <h1 className="font-heading text-clamp-h2 font-black tracking-[-1.5px] leading-tight mb-10">
        Terms of Service
      </h1>
      
      <div className="prose prose-zinc max-w-none text-text-muted leading-[1.8] space-y-8">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">1. Digital Products</h2>
          <p>
            ScaleCraft products are digital assets delivered as Notion templates. By purchasing or accessing these products, you agree that they are for your personal or business use only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">2. No Redistribution</h2>
          <p>
            You are not permitted to resell, redistribute, or share the access links to ScaleCraft Notion workspaces with anyone else. Each purchase is for a single user/agency.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">3. Refund Policy</h2>
          <p>
            Due to the nature of digital products (once you have access, you have the content), we generally do not offer refunds. However, if you are unsatisfied, please message Akhil on WhatsApp. We prefer to help you get results rather than just processing a refund.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">4. "As-Is" Basis</h2>
          <p>
            ScaleCraft systems are provided on an "as-is" basis. While they are built from real-world experience, we cannot guarantee specific financial results. Your success depends on your implementation and market conditions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">5. Support</h2>
          <p>
            As an early customer, you get direct support from the founder (Akhil) via WhatsApp. This is provided on a best-effort basis and does not constitute a 24/7 service level agreement.
          </p>
        </section>

        <section className="pt-10 border-t border-border-primary">
          <p className="text-[13px] text-text-light">
            Last Updated: May 14, 2026
          </p>
        </section>
      </div>
    </div>
  );
}
