import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - ScaleCraft',
  description: 'Privacy Policy and data practices for ScaleCraft WhatsApp AI Agent SaaS.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#111110] font-body py-16 px-6 sm:px-10">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Brand Header */}
        <div className="border-b border-[#EBEBEB] pb-8 space-y-4">
          <Link href="/" className="inline-block text-xl font-extrabold tracking-tight uppercase font-heading">
            ScaleCraft<span className="text-[#1B5E20]">.</span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">Privacy Policy</h1>
            <p className="text-xs text-[#6F6E69] uppercase tracking-widest font-semibold">
              Effective Date: June 2026
            </p>
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-8 text-sm leading-relaxed text-[#3c3c3b]">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#111110] font-heading">1. Introduction</h2>
            <p>
              At ScaleCraft, we value your privacy and are committed to protecting your personal data. This Privacy Policy describes how we collect, use, and store information when you subscribe to our Managed WhatsApp AI Agent SaaS or use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#111110] font-heading">2. What Data We Collect</h2>
            <p>
              To set up and maintain your dedicated WhatsApp AI Agent, we collect the following information during checkout and configuration:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Contact Information:</strong> Your name, email address, and personal phone number.</li>
              <li><strong>Business Information:</strong> Your business/brand name, description, products list, and pricing details.</li>
              <li><strong>Technical Credentials:</strong> The WhatsApp Bot Number you wish to pair with the agent and your Google Sheet IDs.</li>
              <li><strong>API Keys:</strong> The Gemini API Key you provide to power your agent's language processing.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#111110] font-heading">3. How We Use Your Data</h2>
            <p>
              We process your data strictly to provision, run, and support your AI Agent:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To deploy a private VPS instance dedicated to your agent.</li>
              <li>To route and synchronize incoming WhatsApp messages with your agent's model and Google Sheets lead logs.</li>
              <li>To send service notifications, login OTPs, or setup passwords to your email.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#111110] font-heading">4. Data Storage & Hosting</h2>
            <p>
              All agent deployments, databases, and message logs are hosted on <strong>AWS (Amazon Web Services) Mumbai, India data centers</strong>. Your data is stored on secure, isolated instances. We use standard industry practices (SSL/TLS encryption in transit and encrypted disks at rest) to protect your workspace environment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#111110] font-heading">5. Data Ownership</h2>
            <p>
              <strong>You own all of your conversation data.</strong> ScaleCraft does not claim ownership over any messages, lead logs, or prompt data that pass through your agent's database. We do not sell, rent, or distribute your customer conversations or business prompt setups to any third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#111110] font-heading">6. Payment Processing</h2>
            <p>
              All billing transactions are securely handled by our payment gateway partner, <strong>Razorpay</strong>. ScaleCraft does not collect or store your payment details (such as credit card numbers or UPI PINs) directly on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#111110] font-heading">7. Contact Information</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact us:
            </p>
            <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 mt-2 space-y-1">
              <p className="font-bold text-[#111110]">ScaleCraft Support</p>
              <p>Email: <a href="mailto:support@thescalecraft.in" className="text-[#0055ff] hover:underline">support@thescalecraft.in</a></p>
              <p>WhatsApp Support: <a href="https://wa.me/918078004732" target="_blank" rel="noopener noreferrer" className="text-[#0055ff] hover:underline">+91 80780 04732</a></p>
            </div>
          </section>

        </div>

        {/* Footer Link */}
        <div className="border-t border-[#EBEBEB] pt-8 flex justify-between items-center text-xs text-[#AEACA5]">
          <span>© 2026 ScaleCraft. All rights reserved.</span>
          <Link href="/" className="text-[#0055ff] hover:underline font-bold">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
