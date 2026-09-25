'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenMessage, setTokenMessage] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setTokenMessage('No reset token found in URL.');
        setCheckingToken(false);
        return;
      }

      try {
        const res = await fetch(`/api/dashboard/auth/verify-reset-token?token=${token}`);
        const data = await res.json();
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenMessage(data.message || 'Invalid or expired token.');
        }
      } catch (err) {
        setTokenValid(false);
        setTokenMessage('Error verifying reset token.');
      } finally {
        setCheckingToken(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one letter and one number');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/dashboard/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password.');
      } else {
        setMessage(data.message || 'Password reset successfully! Redirecting to login page...');
        setTimeout(() => {
          router.push('/dashboard/login');
        }, 3000);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <svg className="animate-spin h-8 w-8 text-[#1B5E20]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-xs text-[#6F6E69] font-medium">Verifying reset token security...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 text-red-700 text-xs font-semibold p-4 rounded-xl border border-red-100 flex flex-col items-center text-center space-y-2">
          <span>⚠️ {tokenMessage || 'This reset link is invalid or has expired.'}</span>
          <p className="text-[11px] text-red-600 font-normal">Please request a new password reset link.</p>
        </div>
        <div className="text-center">
          <Link
            href="/dashboard/forgot-password"
            className="w-full inline-block bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold py-3 px-4 rounded-lg shadow-sm transition-colors text-center"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111110] font-heading">
          Reset Password
        </h2>
        <p className="text-xs text-[#6F6E69] mt-1">
          Enter your new account password below.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs font-medium p-3 rounded-lg border border-red-100 animate-shake">
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div className="bg-green-50 text-green-700 text-xs font-medium p-3 rounded-lg border border-green-100">
          ✅ {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
            disabled={loading || !!message}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#111110] uppercase tracking-wide mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            className="w-full text-sm border border-[#EBEBEB] rounded-lg px-4 py-3 bg-[#F8FBF8] focus:outline-none focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] transition-colors"
            disabled={loading || !!message}
          />
        </div>

        {/* Password guidelines */}
        <div className="bg-[#F8FBF8] p-3 rounded-xl border border-[#EBEBEB] text-[10px] text-[#6F6E69] space-y-1">
          <span className="block font-bold text-[#111110] uppercase tracking-wider mb-1">Password Requirements:</span>
          <div className="flex items-center space-x-1.5">
            <span className={newPassword.length >= 8 ? 'text-green-700' : 'text-[#AEACA5]'}>• At least 8 characters</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className={/[0-9]/.test(newPassword) ? 'text-green-700' : 'text-[#AEACA5]'}>• At least one number</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className={/[A-Za-z]/.test(newPassword) ? 'text-green-700' : 'text-[#AEACA5]'}>• At least one letter</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !!message}
          className="w-full bg-[#1B5E20] hover:bg-[#144317] disabled:bg-[#AEACA5] text-white text-sm font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Updating Password...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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

      {/* Main Reset Card */}
      <div className="bg-white w-full max-w-md rounded-2xl border border-[#EBEBEB] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <svg className="animate-spin h-8 w-8 text-[#1B5E20]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs text-[#6F6E69] font-medium">Loading...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
