import { supabaseAdmin } from './supabase';

export async function logAdminAction(
  action: string,
  details: object,
  request: Request
): Promise<void> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    const { error } = await supabaseAdmin.from('admin_audit_log').insert({
      action,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    });

    if (error) {
      console.error('[AdminAudit] Supabase error logging action:', error.message);
    }
  } catch (err: any) {
    console.error('[AdminAudit] Failed to log admin action:', err.message);
  }
}
