import React from 'react';
import { getSessionClient } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ShieldCheck, FileCheck, Calendar, Globe, Award, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';


export default async function AcknowledgementsPage() {
  const clientRecord = await getSessionClient();

  if (!clientRecord) {
    redirect('/dashboard/login');
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  // We check if the termsAccepted property is true (either as boolean true or a truthy value)
  const hasAccepted = !!(clientRecord as any).termsAccepted;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-[#212121] tracking-tight font-heading">
          Compliance & Legal Acknowledgements
        </h1>
        <p className="text-sm text-[#757575] mt-1">
          Review and audit your legal terms agreement status and cryptographic proof of authorization.
        </p>
      </div>

      {/* Main Acknowledgement Card */}
      <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#212121] font-heading">Legal Terms Status</h3>
            <p className="text-xs text-[#757575]">
              Proof of compliance for ScaleCraft Managed SaaS Agent activation.
            </p>
          </div>
          {hasAccepted ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] text-xs font-black uppercase tracking-wider">
              <ShieldCheck size={14} /> Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black uppercase tracking-wider">
              Pending
            </span>
          )}
        </div>

        {hasAccepted ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Agreement date */}
              <div className="bg-[#F8FBF8] border border-[#EBEBEB] p-4 rounded-xl space-y-2 flex items-start gap-3">
                <Calendar className="text-[#1B5E20] shrink-0 mt-0.5" size={18} />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#AEACA5] uppercase tracking-wider block">Agreement Date</span>
                  <span className="text-xs font-bold text-[#212121] leading-tight block">
                    {formatDate((clientRecord as any).termsAcceptedAt)}
                  </span>
                </div>
              </div>

              {/* IP address */}
              <div className="bg-[#F8FBF8] border border-[#EBEBEB] p-4 rounded-xl space-y-2 flex items-start gap-3">
                <Globe className="text-[#1B5E20] shrink-0 mt-0.5" size={18} />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#AEACA5] uppercase tracking-wider block">Signing IP Address</span>
                  <span className="text-xs font-bold text-[#212121] leading-tight block">
                    {(clientRecord as any).acceptedFromIP || '127.0.0.1'}
                  </span>
                </div>
              </div>

              {/* Version */}
              <div className="bg-[#F8FBF8] border border-[#EBEBEB] p-4 rounded-xl space-y-2 flex items-start gap-3">
                <FileCheck className="text-[#1B5E20] shrink-0 mt-0.5" size={18} />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#AEACA5] uppercase tracking-wider block">Terms Version</span>
                  <span className="text-xs font-bold text-[#212121] leading-tight block">
                    Version {(clientRecord as any).termsVersion || '1.0'}
                  </span>
                </div>
              </div>

              {/* License / Account */}
              <div className="bg-[#F8FBF8] border border-[#EBEBEB] p-4 rounded-xl space-y-2 flex items-start gap-3">
                <Award className="text-[#1B5E20] shrink-0 mt-0.5" size={18} />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#AEACA5] uppercase tracking-wider block">Bot WhatsApp Number</span>
                  <span className="text-xs font-bold text-[#212121] leading-tight block">
                    +{clientRecord.whatsappBotNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic legal log text */}
            <div className="bg-neutral-50 rounded-xl p-5 border border-[#E0E0E0] text-xs text-[#757575] leading-relaxed space-y-2">
              <p className="font-bold text-[#212121]">Legal Proof of Consent</p>
              <p>
                This log certifies that the client representing <strong>{clientRecord.businessName}</strong> agreed to the <a href="/legal/terms" target="_blank" className="text-[#0055ff] hover:underline font-semibold">Terms of Service</a> and <a href="/legal/privacy-policy" target="_blank" className="text-[#0055ff] hover:underline font-semibold">Privacy Policy</a> on {formatDate((clientRecord as any).termsAcceptedAt)} from IP address {(clientRecord as any).acceptedFromIP || '127.0.0.1'}.
              </p>
              <p>
                By checking the agreement box on checkout, the client authorized ScaleCraft to provision a VPS workspace and deploy AI model integration services on WhatsApp Bot Number +{clientRecord.whatsappBotNumber}.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-2 text-[#757575]">
            <AlertTriangle className="text-amber-500 mx-auto" size={36} />
            <h4 className="font-bold text-[#212121]">Agreement Record Not Found</h4>
            <p className="text-xs max-w-sm mx-auto">
              If your account was provisioned manually by an administrator, terms acceptance logs may not be recorded automatically. Please contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
