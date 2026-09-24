'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field
  const [requires2fa, setRequires2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rejects if honeypot is filled
    if (website) {
      setError('Invalid credentials');
      return;
    }

    if (!requires2fa) {
      if (!password.trim()) {
        setError('Invalid credentials');
        return;
      }
    } else {
      if (!totpCode.trim()) {
        setError('Invalid credentials');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          totpCode: requires2fa ? totpCode : undefined,
          website,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Generic error message matching requirement
        setError(data.error || 'Invalid credentials');
        // Do not reset requires2fa so they can retry code if password was correct
      } else if (data.requires2fa) {
        setRequires2fa(true);
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FBF8] flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-[#111110] tracking-tight uppercase font-heading">
          ScaleCraft<span className="text-red-700">.</span>
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#6F6E69] font-semibold mt-1">
          Internal Administration Portal
        </p>
      </div>

      {/* Main Admin Login Card */}
      <div className="bg-white w-full max-w-md rounded-2xl border border-[#EBEBEB] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8">
        <h2 className="text-xl font-bold text-[#111110] mb-2 font-heading">
          Admin Gatekeeper
        </h2>
        <p className="text-sm text-[#6F6E69] mb-6">
          Access to client server status, resource provisioning, and billing statistics.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs font-medium p-3 rounded-lg border border-red-100 mb-4 animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          {/* Honeypot field (hidden from users) */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
          />

          {!requires2fa ? (
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
                Secret Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors"
                disabled={loading}
                autoComplete="off"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="totpCode" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
                Two-Factor Code
              </label>
              <p className="text-xs text-[#6F6E69] mb-3">
                Enter the 6-digit code from your authenticator app
              </p>
              <input
                id="totpCode"
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="000000"
                className="w-full text-center text-lg font-bold letter-spacing-4 border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors"
                disabled={loading}
                autoComplete="off"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-800 text-white text-sm font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{requires2fa ? 'Verify Authenticator' : 'Continue'}</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-[#AEACA5]">
        <p>&copy; {new Date().getFullYear()} ScaleCraft. Confidential administration area.</p>
      </footer>
    </main>
  );
}
