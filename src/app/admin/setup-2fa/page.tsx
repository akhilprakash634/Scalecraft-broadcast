'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Setup2faPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<'intro' | 'scan' | 'complete'>('intro');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/setup-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate 2FA setup details');
      }
      setQrCodeUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setStep('scan');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/setup-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', code: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      setBackupCodes(data.backupCodes);
      setSuccess(true);
      setStep('complete');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FBF8] flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-[#111110] tracking-tight uppercase font-heading">
          ScaleCraft<span className="text-[#1B5E20]">.</span>
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#6F6E69] font-semibold mt-1">
          Super Admin Console
        </p>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl border border-[#EBEBEB] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#111110] font-heading">
            Setup Two-Factor Authentication
          </h2>
          <p className="text-xs text-[#6F6E69] mt-1">
            Secure your administrative workspace with standard Google Authenticator 2FA.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs font-medium p-3 rounded-lg border border-red-100 animate-shake">
            ⚠️ {error}
          </div>
        )}

        {step === 'intro' && (
          <div className="space-y-4 text-xs font-semibold">
            <p className="text-[#6F6E69]">
              Two-factor authentication is required for all administrative roles. You will need an authenticator app like Google Authenticator or Authy installed on your mobile device.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-xs py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Initializing Setup...' : 'Begin Setup'}
            </button>
          </div>
        )}

        {step === 'scan' && (
          <div className="space-y-5 text-xs font-semibold">
            <div className="flex flex-col items-center justify-center p-4 bg-[#F8FBF8] border border-[#EBEBEB] rounded-xl">
              {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44" />}
              <span className="text-[10px] text-[#AEACA5] mt-2">Scan this QR code with your authenticator app.</span>
            </div>

            <div className="p-3 bg-[#F8FBF8] border border-[#EBEBEB] rounded-lg text-center">
              <span className="block text-[9px] uppercase tracking-wide text-[#AEACA5] mb-1 font-bold">Manual Entry Key</span>
              <code className="text-xs font-mono font-bold text-[#1B5E20] select-all">{secret}</code>
            </div>

            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label htmlFor="verify-code" className="block text-[10px] font-bold text-[#111110] uppercase tracking-wide mb-1">
                  Enter 6-Digit Code
                </label>
                <input
                  id="verify-code"
                  type="text"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full text-center text-sm font-bold border border-[#EBEBEB] rounded-lg px-4 py-2.5 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20]"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-xs py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Complete Setup'}
              </button>
            </form>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-5 text-xs font-semibold">
            <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-green-900 space-y-1">
              <h4 className="font-bold text-sm">✅ 2FA Configuration Saved!</h4>
              <p className="text-[11px] text-green-700">Authenticator linked successfully. 2FA is now active for admin login.</p>
            </div>

            <div className="space-y-2.5">
              <span className="block text-[10px] font-bold text-[#111110] uppercase tracking-wide">Emergency Backup Codes</span>
              <p className="text-[10px] text-[#AEACA5]">
                Save these codes offline immediately. Use them if you lose access to your authenticator app. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-2 bg-[#F8FBF8] p-4 border border-[#EBEBEB] rounded-xl font-mono text-center text-xs font-bold text-[#111110]">
                {backupCodes.map((code) => (
                  <div key={code} className="bg-white border border-[#EBEBEB] rounded py-1.5 select-all">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/admin/login"
              className="w-full inline-block bg-[#1B5E20] hover:bg-[#144317] text-white text-xs text-center py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 font-bold"
            >
              Proceed to Admin Login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
