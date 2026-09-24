'use client';

import { useState } from 'react';
import { Mail, IndianRupee, FileCheck, Calendar, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface ProofItem {
  title: string;
  icon: React.ComponentType<any>;
  caption: string;
  imagePath: string;
}

export default function ProofGallery() {
  const [activeTab, setActiveTab] = useState(0);

  const proofs: ProofItem[] = [
    {
      title: "WhatsApp Wins",
      icon: Mail,
      caption: "Real WhatsApp exchanges: Clients confirming payment retainers directly after deploying our outreach system.",
      imagePath: "/proof/whatsapp_chat.png"
    },
    {
      title: "Payout Dashboard",
      icon: IndianRupee,
      caption: "Stripe/Razorpay Payouts: Documented captured payments from international and domestic clients.",
      imagePath: "/proof/payment_dashboard.png"
    },
    {
      title: "Accepted Proposals",
      icon: FileCheck,
      caption: "Proposal Accepted: Onboarding responses received from eCommerce and tech clients.",
      imagePath: "/proof/proposal_email.png"
    },
    {
      title: "Discovery Calls",
      icon: Calendar,
      caption: "Calendly Bookings: Freelance calendar showing active bookings for discovery outbound campaigns.",
      imagePath: "/proof/calendly_bookings.png"
    }
  ];

  return (
    <section className="px-6 md:px-10 py-10 max-w-[1100px] mx-auto" id="proof-gallery">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2.5fr] gap-8 items-start">
        
        {/* Tab List */}
        <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {proofs.map((proof, i) => {
            const Icon = proof.icon;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[13px] font-bold text-left transition-all shrink-0 cursor-pointer ${
                  activeTab === i
                    ? 'bg-foreground text-white shadow-sm'
                    : 'bg-bg-secondary text-text-muted hover:text-text-primary border border-border-primary'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{proof.title}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content (Real Screenshots) */}
        <div className="bg-white border border-border-primary rounded-[20px] p-4 md:p-6 flex flex-col items-center justify-between min-h-[440px] shadow-sm">
          
          <div className="w-full relative aspect-[4/3] max-w-[500px] border border-border-primary rounded-xl overflow-hidden bg-bg-secondary">
            <Image
              src={proofs[activeTab].imagePath}
              alt={proofs[activeTab].title}
              fill
              sizes="(max-w-768px) 100vw, 500px"
              priority
              className="object-contain p-1"
            />
          </div>
          
          <p className="text-[13px] text-text-muted mt-5 text-center leading-relaxed max-w-[520px] font-body">
            {proofs[activeTab].caption}
          </p>
        </div>

      </div>
    </section>
  );
}
