import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/jwt';
import DashboardShell from './DashboardShell';

export const metadata = {
  title: 'WhatsApp Business Platform Dashboard',
  description: 'Manage your WhatsApp sales agent from a premium SaaS dashboard.',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('scalecraft_session')?.value;

  if (!sessionCookie) {
    redirect('/dashboard/login');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  const decoded = await verifyJWT(sessionCookie, secret);

  if (!decoded) {
    redirect('/dashboard/login');
  }

  return (
    <DashboardShell
      businessName={decoded.businessName || 'My Business'}
      botNumber={decoded.botNumber || ''}
      clientId={decoded.clientId || ''}
    >
      {children}
    </DashboardShell>
  );
}
