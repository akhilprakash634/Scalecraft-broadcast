import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeAndValidatePhone } from '@/lib/ssh';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { csvData, defaultGroupTag } = await request.json();
    if (!Array.isArray(csvData) || csvData.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty CSV dataset' }, { status: 400 });
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    const payloadBatch = [];

    for (const row of csvData) {
      const name = row.name || row.Name || '';
      const rawPhone = row.phone || row.Phone || row.number || row.Number || '';
      
      if (!rawPhone) {
        invalidCount++;
        continue;
      }

      const { cleaned: cleanPhone } = normalizeAndValidatePhone(String(rawPhone));
      if (!cleanPhone) {
        invalidCount++;
        continue;
      }

      // Group tags: CSV tags + optional default tag selected at import
      const tagsSet = new Set<string>();
      if (defaultGroupTag) {
        tagsSet.add(defaultGroupTag.trim().toLowerCase());
      }
      
      const csvTags = row.group_tags || row.GroupTags || row.tags || row.Tags || '';
      if (csvTags) {
        String(csvTags).split(',').forEach(t => {
          if (t.trim()) tagsSet.add(t.trim().toLowerCase());
        });
      }

      payloadBatch.push({
        client_id: client.clientId,
        phone: cleanPhone,
        name: name.trim() || null,
        group_tags: Array.from(tagsSet),
        source: 'import',
        imported_at: new Date().toISOString()
      });
    }

    // Chunk size: 100 rows per upsert batch to prevent payload limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < payloadBatch.length; i += CHUNK_SIZE) {
      const chunk = payloadBatch.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabaseAdmin
        .from('contacts')
        .upsert(chunk, { onConflict: 'client_id,phone' })
        .select();

      if (error) {
        console.error('[Contacts Import] Chunk Upsert Error:', error.message);
        throw error;
      }
      
      if (data) {
        importedCount += data.length;
      }
    }

    // Duplicate count calculation
    duplicateCount = payloadBatch.length - importedCount;

    return NextResponse.json({
      success: true,
      importedCount,
      duplicateCount,
      invalidCount,
      totalProcessed: csvData.length
    });
  } catch (error: any) {
    console.error('[Contacts Import] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
