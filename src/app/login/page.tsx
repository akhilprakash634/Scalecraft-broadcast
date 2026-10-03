'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
      } else {
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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-[#111110] tracking-tight uppercase font-heading">
          WhatsApp Platform<span className="text-[#1B5E20]">.</span>
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#6F6E69] font-semibold mt-1">
          Business Control Portal
        </p>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl border border-[#EBEBEB] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8">
        <h2 className="text-xl font-bold text-[#111110] mb-2 font-heading">
          Administrator Login
        </h2>
        <p className="text-sm text-[#6F6E69] mb-6">
          Enter your email and password to access your dashboard.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs font-medium p-3 rounded-lg border border-red-100 mb-4 animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourbusiness.com"
              className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-sm font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-6"
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
              <span>Log In</span>
            )}
          </button>
        </form>
      </div>

      <footer className="mt-8 text-center text-xs text-[#AEACA5] space-y-1">
        <p>&copy; {new Date().getFullYear()} WhatsApp Platform. All rights reserved.</p>
      </footer>
    </main>
  );
}
