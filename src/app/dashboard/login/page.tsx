'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLoginPage() {
  const router = useRouter();
  const [botNumber, setBotNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');
  const [password, setPassword] = useState('');
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/dashboard/health')
      .then((res) => {
        if (res.ok) setDbStatus('connected');
        else setDbStatus('error');
      })
      .catch(() => setDbStatus('error'));
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botNumber.trim()) {
      setError('Please enter your WhatsApp bot number');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/dashboard/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botNumber }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send OTP. Please check your bot number.');
      } else {
        setMessage(data.message || 'OTP sent successfully!');
        setStep('otp');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/dashboard/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botNumber, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid OTP code. Please try again.');
      } else {
        // Success: Redirect to dashboard overview
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Verification error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botNumber.trim()) {
      setError('Please enter your WhatsApp bot number');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/dashboard/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botPhone: botNumber, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
      } else {
        // Redirect to dashboard
        router.push('/dashboard');
        router.refresh();
      }
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
          WhatsApp Platform<span className="text-[#1B5E20]">.</span>
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#6F6E69] font-semibold mt-1">
          SaaS Client Control Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white w-full max-w-md rounded-2xl border border-[#EBEBEB] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8 relative overflow-hidden">
        
        {/* DB Connection Indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
          <span className={`h-2 w-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : dbStatus === 'loading' ? 'bg-yellow-400' : 'bg-red-500'}`}></span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
            {dbStatus === 'connected' ? 'DB Connected' : dbStatus === 'loading' ? 'Checking DB...' : 'DB Error'}
          </span>
        </div>
        
        {/* Tab Navigation */}
        {step === 'phone' && (
          <div className="flex border-b border-[#EBEBEB] mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('otp');
                setError('');
                setMessage('');
              }}
              className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer text-center uppercase tracking-wider ${
                activeTab === 'otp'
                  ? 'border-[#1B5E20] text-[#1B5E20]'
                  : 'border-transparent text-[#AEACA5] hover:text-[#6F6E69]'
              }`}
            >
              Login with OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setError('');
                setMessage('');
              }}
              className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer text-center uppercase tracking-wider ${
                activeTab === 'password'
                  ? 'border-[#1B5E20] text-[#1B5E20]'
                  : 'border-transparent text-[#AEACA5] hover:text-[#6F6E69]'
              }`}
            >
              Login with Password
            </button>
          </div>
        )}

        <h2 className="text-xl font-bold text-[#111110] mb-2 font-heading">
          {step === 'phone' ? 'Manage Your Agent' : 'Verify Your Identity'}
        </h2>
        <p className="text-sm text-[#6F6E69] mb-6">
          {step === 'otp'
            ? "We've sent a 6-digit OTP code to your registered email address."
            : activeTab === 'otp'
            ? 'Enter your running WhatsApp bot phone number. OTP will be sent to your registered email address.'
            : 'Enter your WhatsApp bot phone number and the account password.'}
        </p>

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

        {step === 'phone' ? (
          activeTab === 'otp' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="botNumber" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
                  WhatsApp Bot Number
                </label>
                <input
                  id="botNumber"
                  type="text"
                  value={botNumber}
                  onChange={(e) => setBotNumber(e.target.value)}
                  placeholder="e.g. 918078004732"
                  className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
                  disabled={loading}
                />
                <span className="text-[10px] text-[#AEACA5] mt-1 block">
                  Format: Country code followed by phone number (no spaces or '+' signs)
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-sm font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Requesting OTP...</span>
                  </>
                ) : (
                  <span>Request Login OTP</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="botNumber" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
                  WhatsApp Bot Number
                </label>
                <input
                  id="botNumber"
                  type="text"
                  value={botNumber}
                  onChange={(e) => setBotNumber(e.target.value)}
                  placeholder="e.g. 918078004732"
                  className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
                  disabled={loading}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-xs font-bold text-[#111110] uppercase tracking-wide">
                    Password
                  </label>
                  <Link
                    href="/dashboard/forgot-password"
                    className="text-xs text-[#1B5E20] hover:underline font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-sm font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full text-center text-lg font-bold letter-spacing-4 border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-sm font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Verify OTP & Log In</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setError('');
                setMessage('');
                setOtp('');
              }}
              disabled={loading}
              className="w-full bg-transparent hover:bg-[#F8FBF8] text-[#6F6E69] text-xs font-medium py-2 rounded-lg transition-colors cursor-pointer"
            >
              Back to Change Number
            </button>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-[#AEACA5] space-y-1">
        <p>&copy; {new Date().getFullYear()} WhatsApp Platform. All rights reserved.</p>
        <p>
          Need help? Message our client support team on WhatsApp at{' '}
          <a href="https://wa.me/918078004732" target="_blank" className="text-[#1B5E20] hover:underline font-semibold">
            +91 80780 04732
          </a>
        </p>
      </footer>
    </main>
  );
}
