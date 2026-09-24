'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [botPhone, setBotPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botPhone.trim()) {
      setError('Please enter your WhatsApp bot number');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your registered email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/dashboard/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botPhone, email }),
      });
      const data = await res.json();
      setMessage(data.message || 'If this number exists, a reset link has been sent to your registered email.');
    } catch (err) {
      setError('Connection error. Please try again.');
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
          SaaS Client Control Portal
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white w-full max-w-md rounded-2xl border border-[#EBEBEB] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#111110] font-heading">
            Forgot Password
          </h2>
          <p className="text-xs text-[#6F6E69] mt-1">
            Request a password reset link for your client dashboard account.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs font-medium p-3 rounded-lg border border-red-100 mb-4 animate-shake">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-700 text-xs font-medium p-3 rounded-lg border border-green-100 mb-4">
            ✅ {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="botPhone" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
              WhatsApp Bot Number
            </label>
            <input
              id="botPhone"
              type="text"
              required
              value={botPhone}
              onChange={(e) => setBotPhone(e.target.value)}
              placeholder="e.g. 918078004732"
              className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
              disabled={loading || !!message}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
              Registered Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@company.com"
              className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
              disabled={loading || !!message}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!message}
            className="w-full bg-[#1B5E20] hover:bg-[#144317] disabled:bg-[#AEACA5] text-white text-sm font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/dashboard/login"
            className="text-xs text-[#1B5E20] hover:underline font-bold transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
