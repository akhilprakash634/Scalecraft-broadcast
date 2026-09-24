import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | ScaleCraft',
  description: 'How we handle your data at ScaleCraft.',
  alternates: {
    canonical: 'https://thescalecraft.in/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | ScaleCraft',
    description: 'How we handle your data at ScaleCraft.',
    url: 'https://thescalecraft.in/privacy',
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-20 px-10 max-w-[800px] mx-auto">
      <h1 className="font-heading text-clamp-h2 font-black tracking-[-1.5px] leading-tight mb-10">
        Privacy Policy
      </h1>
      
      <div className="prose prose-zinc max-w-none text-text-muted leading-[1.8] space-y-8">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">1. Information We Collect</h2>
          <p>
            We collect minimal information to provide our services. This includes:
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Email & Name:</strong> Collected when you subscribe to our newsletter.</li>
            <li><strong>WhatsApp Number:</strong> Collected only if you initiate a chat with us.</li>
            <li><strong>Usage Data:</strong> Basic analytics via our website to improve user experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">2. How We Use Your Data</h2>
          <p>
            Your data is used strictly for:
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Sending the ScaleCraft Weekly newsletter.</li>
            <li>Responding to your inquiries on WhatsApp.</li>
            <li>Providing access to our Notion-based systems.</li>
          </ul>
          <p className="mt-4">
            We never sell your data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">3. Third-Party Services</h2>
          <p>
            We use a few trusted third-party services to operate:
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Notion:</strong> Our products are delivered as Notion templates.</li>
            <li><strong>Resend:</strong> Used to manage and send our newsletter.</li>
            <li><strong>Vercel:</strong> Used to host our website.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">4. Your Rights</h2>
          <p>
            You can unsubscribe from our newsletter at any time using the link in the footer of our emails. If you wish to have your data removed from our systems, please contact Akhil on WhatsApp.
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
