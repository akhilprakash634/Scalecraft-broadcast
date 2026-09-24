import { cookies } from 'next/headers';
import { verifyJWT } from './jwt';
import { getAgentClientByBotNumber, AgentClient } from './agents';

// Retrieves the authenticated agent client from the session cookies
export async function getSessionClient(): Promise<AgentClient | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('scalecraft_session')?.value;
    if (!sessionToken) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    const decoded = await verifyJWT(sessionToken, secret);
    if (!decoded || !decoded.botNumber) return null;

    return await getAgentClientByBotNumber(decoded.botNumber);
  } catch (error) {
    console.error('Error fetching session client:', error);
    return null;
  }
}

// Retrieves the authenticated admin status from the session cookies
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('scalecraft_admin_session')?.value;
    if (!adminToken) return false;

    const secret = process.env.ADMIN_SECRET;
    if (!secret) return false;

    const decoded = await verifyJWT(adminToken, secret);
    return decoded?.role === 'admin';
  } catch {
    return false;
  }
}
