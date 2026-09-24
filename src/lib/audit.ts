import { supabaseAdmin } from './supabase';

export async function logAdminAction(
  action: string,
  targetClientId: string | null,
  request: Request
) {
  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    const { error } = await supabaseAdmin.from('admin_audit_log').insert({
      action,
      admin_identifier: 'admin',
      target_client_id: targetClientId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error('[Audit] Supabase logging error:', error.message);
    }
  } catch (err: any) {
    console.error('[Audit] Failed to log admin action:', err.message);
  }
}
