import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/adminAudit';

export async function GET() {
  try {
    const isAuthorized = await isAdminAuthenticated();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: servers, error } = await supabaseAdmin
      .from('servers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ servers });
  } catch (error: any) {
    console.error('[Admin Servers GET] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await isAdminAuthenticated();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      ip,
      max_capacity = 15,
      ssh_key_ref = 'SHARED_SERVER_SSH_KEY',
      ssh_user = 'ubuntu',
      region = 'ap-south-1',
      notes = ''
    } = body;

    if (!ip || typeof ip !== 'string' || ip.trim().length === 0) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    // Basic IP validation (ipv4 format)
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipv4Regex.test(ip.trim())) {
      return NextResponse.json({ error: 'Invalid IPv4 address format' }, { status: 400 });
    }

    // Insert new server record
    const { data: newServer, error } = await supabaseAdmin
      .from('servers')
      .insert({
        ip: ip.trim(),
        max_capacity: Number(max_capacity),
        ssh_key_ref: ssh_key_ref.trim(),
        ssh_user: ssh_user.trim(),
        region: region.trim(),
        notes: notes.trim(),
        current_client_count: 0,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Server with IP '${ip}' already exists in the pool` }, { status: 400 });
      }
      throw error;
    }

    await logAdminAction('Register Server Node', { ip: ip.trim(), region }, request);
    return NextResponse.json({ success: true, server: newServer });
  } catch (error: any) {
    console.error('[Admin Servers POST] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
