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

    // Concurrently fetch contacts and leads_cache
    const [contactsResult, leadsResult] = await Promise.all([
      supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('client_id', client.clientId),
      supabaseAdmin
        .from('leads_cache')
        .select('*')
        .eq('client_id', client.clientId)
    ]);

    if (contactsResult.error) throw contactsResult.error;
    if (leadsResult.error) throw leadsResult.error;

    const contactsList = contactsResult.data || [];
    const leadsList = leadsResult.data || [];

    // Map by normalized phone number for de-duplication and merging
    const mergedMap = new Map<string, any>();

    // 1. Process contacts table entries
    for (const c of contactsList) {
      const cleanPhone = normalizeAndValidatePhone(String(c.phone || '')).cleaned || String(c.phone || '').replace(/\D/g, '');
      if (!cleanPhone) continue;

      mergedMap.set(cleanPhone, {
        id: c.id,
        name: c.name || '',
        phone: cleanPhone,
        group_tags: c.group_tags || [],
        source: c.source || 'import',
        imported_at: c.imported_at || c.created_at || new Date().toISOString(),
        is_dnd: !!c.is_dnd,
        inContactsTable: true,
        inLeadsCache: false,
      });
    }

    // 2. Process leads_cache entries
    for (const l of leadsList) {
      const cleanPhone = normalizeAndValidatePhone(String(l.phone || '')).cleaned || String(l.phone || '').replace(/\D/g, '');
      if (!cleanPhone) continue;

      const leadName = l.name || l.shared_name || '';

      if (mergedMap.has(cleanPhone)) {
        const existing = mergedMap.get(cleanPhone);
        existing.inLeadsCache = true;
        existing.source = 'both';
        if (!existing.name && leadName) {
          existing.name = leadName;
        }
        existing.is_dnd = existing.is_dnd || !!l.is_dnd;
      } else {
        mergedMap.set(cleanPhone, {
          id: `lead_${cleanPhone}`,
          name: leadName || '',
          phone: cleanPhone,
          group_tags: [],
          source: 'inbox',
          imported_at: l.created_at || l.updated_at || new Date().toISOString(),
          is_dnd: !!l.is_dnd,
          inContactsTable: false,
          inLeadsCache: true,
        });
      }
    }

    let mergedArray = Array.from(mergedMap.values());

    // Filter by tag if specified
    if (tag) {
      const cleanTag = tag.trim().toLowerCase();
      mergedArray = mergedArray.filter(c => 
        Array.isArray(c.group_tags) && c.group_tags.some((t: string) => t.toLowerCase() === cleanTag)
      );
    }

    // Filter by source if specified
    if (sourceFilter) {
      const sf = sourceFilter.trim().toLowerCase();
      if (sf === 'import' || sf === 'imported' || sf === 'manual') {
        mergedArray = mergedArray.filter(c => c.source === 'import' || c.source === 'manual');
      } else if (sf === 'inbox') {
        mergedArray = mergedArray.filter(c => c.source === 'inbox');
      } else if (sf === 'both') {
        mergedArray = mergedArray.filter(c => c.source === 'both');
      }
    }

    // Filter by search if specified
    if (searchFilter) {
      const sf = searchFilter.trim().toLowerCase();
      mergedArray = mergedArray.filter(c => 
        (c.name && c.name.toLowerCase().includes(sf)) || c.phone.includes(sf)
      );
    }

    // Sort by imported_at / created_at descending
    mergedArray.sort((a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime());

    return NextResponse.json({ contacts: mergedArray });
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
      .from('contacts')
      .upsert(
        {
          client_id: client.clientId,
          phone: cleanPhone,
          name: name || '',
          group_tags: group_tags || [],
          source: source || 'manual',
          is_dnd: is_dnd || false,
          imported_at: new Date().toISOString()
        },
        { onConflict: 'client_id,phone' }
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

    // Handle lead_ prefixed items (create or update in contacts table)
    if (typeof id === 'string' && id.startsWith('lead_')) {
      const cleanPhone = id.replace(/^lead_/, '');
      const updateFields: any = {
        client_id: client.clientId,
        phone: cleanPhone,
        imported_at: new Date().toISOString(),
      };
      if (group_tags !== undefined) updateFields.group_tags = group_tags;
      if (is_dnd !== undefined) updateFields.is_dnd = is_dnd;

      const { data: contact, error } = await supabaseAdmin
        .from('contacts')
        .upsert(updateFields, { onConflict: 'client_id,phone' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, contact });
    }

    const updateFields: any = {};
    if (group_tags !== undefined) updateFields.group_tags = group_tags;
    if (is_dnd !== undefined) updateFields.is_dnd = is_dnd;

    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .update(updateFields)
      .eq('id', id)
      .eq('client_id', client.clientId)
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
      if (id.startsWith('lead_')) {
        const cleanPhone = id.replace(/^lead_/, '');
        await supabaseAdmin
          .from('leads_cache')
          .update({ is_dnd: true })
          .eq('phone', cleanPhone)
          .eq('client_id', client.clientId);
      } else {
        await supabaseAdmin
          .from('contacts')
          .delete()
          .eq('id', id)
          .eq('client_id', client.clientId);
      }
    } else if (bulkIds) {
      const contactDbIds = bulkIds.filter(i => !i.startsWith('lead_'));
      const leadPhones = bulkIds.filter(i => i.startsWith('lead_')).map(i => i.replace(/^lead_/, ''));

      if (contactDbIds.length > 0) {
        await supabaseAdmin
          .from('contacts')
          .delete()
          .in('id', contactDbIds)
          .eq('client_id', client.clientId);
      }

      if (leadPhones.length > 0) {
        await supabaseAdmin
          .from('leads_cache')
          .update({ is_dnd: true })
          .in('phone', leadPhones)
          .eq('client_id', client.clientId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Contacts DELETE] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
