import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = client.clientId || client.id || client._id;

    // 1. Get total eligible contacts (active, has valid phone)
    const { count: totalContacts } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', clientId)
      .eq('status', 'active');

    // 2. Get the active rotation
    const { data: activeRotation } = await supabaseAdmin
      .from('whatsapp_broadcast_rotations')
      .select('*')
      .eq('business_id', clientId)
      .eq('status', 'active')
      .maybeSingle();

    let usedContacts = 0;
    
    if (activeRotation) {
      const { count } = await supabaseAdmin
        .from('whatsapp_broadcast_rotation_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('rotation_id', activeRotation.id);
      usedContacts = count || 0;
    }

    return NextResponse.json({
      success: true,
      total_eligible: totalContacts || 0,
      active_rotation: activeRotation || null,
      used_in_rotation: usedContacts,
      remaining_in_rotation: (totalContacts || 0) - usedContacts
    });

  } catch (error: any) {
    console.error('Rotations GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = client.clientId || client.id || client._id;

    // Check if there is an active rotation
    const { data: activeRotation } = await supabaseAdmin
      .from('whatsapp_broadcast_rotations')
      .select('id')
      .eq('business_id', clientId)
      .eq('status', 'active')
      .maybeSingle();

    if (activeRotation) {
      return NextResponse.json({ error: 'There is already an active rotation.' }, { status: 400 });
    }

    // Get the highest cycle number
    const { data: latestRotation } = await supabaseAdmin
      .from('whatsapp_broadcast_rotations')
      .select('cycle_number')
      .eq('business_id', clientId)
      .order('cycle_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextCycle = (latestRotation?.cycle_number || 0) + 1;

    const { data: newRotation, error } = await supabaseAdmin
      .from('whatsapp_broadcast_rotations')
      .insert({
        business_id: clientId,
        cycle_number: nextCycle,
        status: 'active',
        started_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create rotation:', error);
      return NextResponse.json({ error: 'Failed to create new rotation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rotation: newRotation });

  } catch (error: any) {
    console.error('Rotations POST API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
