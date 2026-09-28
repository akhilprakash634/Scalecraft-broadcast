import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeAndValidatePhone } from '@/lib/ssh';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const sourceFilter = searchParams.get('source');
    const searchFilter = searchParams.get('search');

    const { data: contactsResult, error } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('*')
      .eq('business_id', client.clientId);

    if (error) throw error;

    const contactsList = contactsResult || [];

    // Map to expected UI format
    let mappedArray = contactsList.map(c => ({
      id: c.id,
      name: c.name || '',
      phone: c.normalized_phone || c.phone,
      group_tags: c.tags || [],
      source: c.opt_in_source || 'imported',
      imported_at: c.created_at || new Date().toISOString(),
      is_dnd: c.status !== 'active' || c.opt_in === false,
    }));

    // Filter by tag if specified
    if (tag) {
      const cleanTag = tag.trim().toLowerCase();
      mappedArray = mappedArray.filter(c => 
        Array.isArray(c.group_tags) && c.group_tags.some((t: string) => t.toLowerCase() === cleanTag)
      );
    }

    // Filter by source if specified
    if (sourceFilter) {
      const sf = sourceFilter.trim().toLowerCase();
      if (sf === 'import' || sf === 'imported' || sf === 'manual') {
        mappedArray = mappedArray.filter(c => c.source === 'imported' || c.source === 'import' || c.source === 'manual');
      } else if (sf === 'inbox') {
        mappedArray = mappedArray.filter(c => c.source === 'inbox');
      } else if (sf === 'both') {
        mappedArray = mappedArray.filter(c => c.source === 'both');
      }
    }

    // Filter by search if specified
    if (searchFilter) {
      const sf = searchFilter.trim().toLowerCase();
      mappedArray = mappedArray.filter(c => 
        (c.name && c.name.toLowerCase().includes(sf)) || c.phone.includes(sf)
      );
    }

    // Sort by imported_at / created_at descending
    mappedArray.sort((a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime());

    return NextResponse.json({ contacts: mappedArray });
  } catch (error: any) {
    console.error('[Contacts GET] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, group_tags, source, is_dnd } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const { cleaned: cleanPhone, error: phoneErr } = normalizeAndValidatePhone(phone);
    if (!cleanPhone) {
      return NextResponse.json({ error: phoneErr || 'Invalid phone number format' }, { status: 400 });
    }

    const { data: contact, error } = await supabaseAdmin
      .from('whatsapp_contacts')
      .upsert(
        {
          business_id: client.clientId,
          phone: cleanPhone,
          normalized_phone: cleanPhone,
          name: name || '',
          tags: group_tags || [],
          opt_in_source: source || 'manual',
          status: is_dnd ? 'unsubscribed' : 'active',
          opt_in: !is_dnd,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'business_id,normalized_phone' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    console.error('[Contacts POST] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, group_tags, is_dnd } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const updateFields: any = {};
    if (group_tags !== undefined) updateFields.tags = group_tags;
    if (is_dnd !== undefined) {
      updateFields.status = is_dnd ? 'unsubscribed' : 'active';
      updateFields.opt_in = !is_dnd;
    }

    const { data: contact, error } = await supabaseAdmin
      .from('whatsapp_contacts')
      .update(updateFields)
      .eq('id', id)
      .eq('business_id', client.clientId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    console.error('[Contacts PATCH] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const bulkIds = searchParams.get('ids')?.split(',');

    if (!id && (!bulkIds || bulkIds.length === 0)) {
      return NextResponse.json({ error: 'Contact ID or list of IDs is required' }, { status: 400 });
    }

    if (id) {
      await supabaseAdmin
        .from('whatsapp_contacts')
        .delete()
        .eq('id', id)
        .eq('business_id', client.clientId);
    } else if (bulkIds) {
      await supabaseAdmin
        .from('whatsapp_contacts')
        .delete()
        .in('id', bulkIds)
        .eq('business_id', client.clientId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Contacts DELETE] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
