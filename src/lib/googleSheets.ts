import { supabaseAdmin } from './supabase';
import { readFile, uploadFile } from './ssh';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Generate Google OAuth2 authorization URL
export function getGoogleOAuthUrl(redirectUri: string, clientId: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId || GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  }).toString()}`;
}

// Exchange authorization code for access and refresh tokens
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed: ${errText}`);
  }

  return await res.json();
}

// Refresh an expired access token using the refresh token
export async function getRefreshedAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token refresh failed: ${errText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiryDate: Date.now() + (data.expires_in * 1000)
  };
}

// Get user profile email associated with the OAuth connection
export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.email || '';
  } catch {
    return '';
  }
}

// Retrieve valid access token for a client, refreshing if expired
export async function getClientAccessToken(clientId: string): Promise<string> {
  const { data: client } = await supabaseAdmin
    .from('agent_clients')
    .select('type_specific_data')
    .eq('id', clientId)
    .single();

  let tsd: any = {};
  if (client?.type_specific_data) {
    try {
      tsd = typeof client.type_specific_data === 'string'
        ? JSON.parse(client.type_specific_data)
        : client.type_specific_data;
    } catch {
      return '';
    }
  }

  const oauth = tsd.google_oauth;
  if (!oauth || !oauth.refresh_token) return '';

  // If expired or expiring in under 5 minutes, refresh it
  const isExpired = !oauth.expiry_date || Date.now() > (Number(oauth.expiry_date) - 300000);
  if (isExpired) {
    try {
      const refreshed = await getRefreshedAccessToken(oauth.refresh_token);
      oauth.access_token = refreshed.accessToken;
      oauth.expiry_date = refreshed.expiryDate;

      await supabaseAdmin
        .from('agent_clients')
        .update({ type_specific_data: JSON.stringify(tsd) })
        .eq('id', clientId);

      return refreshed.accessToken;
    } catch (err: any) {
      console.error(`[Google OAuth] Auto refresh failed for client ${clientId}:`, err.message);
      return '';
    }
  }

  return oauth.access_token;
}

// Create a new Google Spreadsheet
export async function createSpreadsheet(accessToken: string, title: string): Promise<{ id: string; url: string }> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Leads' } }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheet creation failed: ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    url: data.spreadsheetUrl
  };
}

// Share spreadsheet access with user
export async function shareSpreadsheet(accessToken: string, fileId: string, emailAddress: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Initialize sheet headers
export async function initSheetHeaders(accessToken: string, spreadsheetId: string) {
  const headers = ['Phone', 'Name', 'Status', 'Category', 'Last Message', 'Notes', 'Last Updated'];
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:G1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [headers] })
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheet headers init failed: ${errText}`);
  }
}

// Get all sheet values
export async function getSheetRows(accessToken: string, spreadsheetId: string): Promise<any[][]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:G`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.values || [];
}

// Push a single row update or append to the sheet
export async function updateSingleLeadInSheet(
  accessToken: string,
  spreadsheetId: string,
  lead: { phone: string; name?: string; status?: string; category?: string; lastMessage?: string; notes?: string }
) {
  // Fetch phone column to locate matching row
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return;

  const data = await res.json();
  const phones: string[][] = data.values || [];
  let rowIndex = -1;

  const targetPhone = String(lead.phone).trim();
  for (let i = 0; i < phones.length; i++) {
    if (phones[i] && phones[i][0] && String(phones[i][0]).trim() === targetPhone) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    lead.phone,
    lead.name || '',
    lead.status || '',
    lead.category || '',
    lead.lastMessage || '',
    lead.notes || '',
    new Date().toISOString()
  ];

  if (rowIndex !== -1) {
    // Update existing row
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A${rowIndex}:G${rowIndex}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [rowValues] })
      }
    );
  } else {
    // Append new row
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [rowValues] })
      }
    );
  }
}

// Sync changed CRM leads to VPS memory
export async function syncChangedLeadsToVps(client: any, updates: any[]) {
  if (updates.length === 0) return;
  const memoryFilePath = client.hermesProfile
    ? `/home/ubuntu/.hermes/profiles/${client.hermesProfile}/lead_memory.json`
    : '/home/ubuntu/.hermes/lead_memory.json';

  const currentMemoryText = await readFile(
    client.serverIP || client.sharedServerIp,
    client.sshPrivateKey,
    memoryFilePath,
    client.serverUser || 'ubuntu'
  );

  let memories: Record<string, any> = {};
  if (currentMemoryText) {
    try {
      memories = JSON.parse(currentMemoryText.trim());
    } catch {
      memories = {};
    }
  }

  for (const item of updates) {
    const phone = item.phone;
    memories[phone] = {
      ...(memories[phone] || {}),
      name: item.name || memories[phone]?.name || phone,
      intent: item.intent || memories[phone]?.intent || 'warm',
      notes: item.notes || memories[phone]?.notes || '',
      status: item.status || memories[phone]?.status || 'Follow-up Needed'
    };
  }

  await uploadFile(
    client.serverIP || client.sharedServerIp,
    client.sshPrivateKey,
    JSON.stringify(memories, null, 2),
    memoryFilePath,
    client.serverUser || 'ubuntu'
  );
}

// Core Two-Way Sync process
export async function performTwoWaySync(client: any) {
  const clientId = client.id;
  const sheetId = client.googleSheetId;
  if (!sheetId) return { success: false, reason: 'No sheet linked' };

  const accessToken = await getClientAccessToken(clientId);
  if (!accessToken) return { success: false, reason: 'Failed to retrieve access token' };

  // Fetch db leads cache
  const { data: dbLeads } = await supabaseAdmin
    .from('leads_cache')
    .select('phone, name, intent, manual_status, category, notes, last_message_at, updated_at')
    .eq('client_id', clientId);

  const dbLeadsMap = new Map<string, any>();
  if (dbLeads) {
    dbLeads.forEach(l => dbLeadsMap.set(String(l.phone).trim(), l));
  }

  // Fetch sheet rows
  const sheetRows = await getSheetRows(accessToken, sheetId);
  if (sheetRows.length === 0) {
    return { success: false, reason: 'Google Sheet is empty or unreadable' };
  }

  // Detect column mapping
  const headers = sheetRows[0].map((h: string) => String(h).trim().toLowerCase());
  const phoneIdx = headers.indexOf('phone');
  const nameIdx = headers.indexOf('name');
  const statusIdx = headers.indexOf('status');
  const categoryIdx = headers.indexOf('category');
  const lastMessageIdx = headers.indexOf('last message');
  const notesIdx = headers.indexOf('notes');
  const lastUpdatedIdx = headers.indexOf('last updated');

  if (phoneIdx === -1) {
    return { success: false, reason: 'Invalid sheet: missing Phone column' };
  }

  let tsd: any = {};
  if (client.typeSpecificData) {
    try {
      tsd = typeof client.typeSpecificData === 'string'
        ? JSON.parse(client.typeSpecificData)
        : client.typeSpecificData;
    } catch {}
  }

  const oauth = tsd.google_oauth || {};
  const storedHashes = oauth.row_hashes || {};
  const newHashes: Record<string, string> = {};

  const vpsUpdates: any[] = [];
  const dbUpdates: any[] = [];
  const sheetUpdates: any[] = [];

  const nowStr = new Date().toISOString();

  // Loop through rows in sheet (skip headers)
  for (let i = 1; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    const phone = row[phoneIdx] ? String(row[phoneIdx]).trim() : '';
    if (!phone) continue;

    const name = nameIdx !== -1 ? (row[nameIdx] || '').trim() : '';
    const status = statusIdx !== -1 ? (row[statusIdx] || '').trim() : '';
    const category = categoryIdx !== -1 ? (row[categoryIdx] || '').trim() : '';
    const notes = notesIdx !== -1 ? (row[notesIdx] || '').trim() : '';
    const lastUpdatedStr = lastUpdatedIdx !== -1 ? (row[lastUpdatedIdx] || '').trim() : '';

    const currentHash = `${name}|${status}|${category}|${notes}`;
    newHashes[phone] = currentHash;

    const dbLead = dbLeadsMap.get(phone);

    if (dbLead) {
      const prevHash = storedHashes[phone];
      const isSheetModified = prevHash && prevHash !== currentHash;

      if (isSheetModified) {
        // Resolve conflicts via updated_at comparisons
        const dbUpdatedAt = dbLead.updated_at ? new Date(dbLead.updated_at).getTime() : 0;
        let sheetUpdatedAt = 0;
        if (lastUpdatedStr) {
          try { sheetUpdatedAt = new Date(lastUpdatedStr).getTime(); } catch {}
        }

        if (dbUpdatedAt > sheetUpdatedAt && dbLead.manual_status !== status) {
          console.warn(`[Conflict] Lead ${phone}: ScaleCraft CRM is newer. Syncing to Sheet.`);
          sheetUpdates.push({
            phone,
            name: dbLead.name || '',
            status: dbLead.manual_status || dbLead.intent || 'New',
            category: dbLead.category || '',
            lastMessage: dbLead.last_message_at || '',
            notes: dbLead.notes || ''
          });
        } else {
          // Sheet is authoritative
          dbUpdates.push({
            client_id: clientId,
            phone,
            name,
            manual_status: status,
            category,
            notes,
            updated_at: nowStr
          });
          vpsUpdates.push({
            phone,
            name,
            status,
            intent: category === 'hot' || category === 'warm' || category === 'cold' || category === 'dead' ? category : 'warm',
            notes
          });
        }
      }
    } else {
      // New sheet row -> create in DB
      dbUpdates.push({
        client_id: clientId,
        phone,
        name,
        intent: 'warm',
        manual_status: status || 'New',
        category,
        notes,
        created_at: nowStr,
        updated_at: nowStr
      });
      vpsUpdates.push({
        phone,
        name,
        status: status || 'New',
        intent: 'warm',
        notes
      });
    }
  }

  // Find DB leads not present in the sheet
  const sheetPhones = new Set(sheetRows.slice(1).map(r => r[phoneIdx] ? String(r[phoneIdx]).trim() : '').filter(Boolean));
  if (dbLeads) {
    dbLeads.forEach(l => {
      const phone = String(l.phone).trim();
      if (!sheetPhones.has(phone)) {
        sheetUpdates.push({
          phone,
          name: l.name || '',
          status: l.manual_status || l.intent || 'New',
          category: l.category || '',
          lastMessage: l.last_message_at || '',
          notes: l.notes || ''
        });
      }
    });
  }

  // Batch updates to database
  if (dbUpdates.length > 0) {
    const { error: dbErr } = await supabaseAdmin
      .from('leads_cache')
      .upsert(dbUpdates, { onConflict: 'client_id,phone' });
    if (dbErr) {
      console.error(`[Google Sheets Cron] DB upsert failed:`, dbErr.message);
    }
  }

  // Bulk update VPS lead_memory.json
  if (vpsUpdates.length > 0) {
    await syncChangedLeadsToVps(client, vpsUpdates).catch(err =>
      console.error(`[Google Sheets Cron] VPS sync failed:`, err.message)
    );
  }

  // Update sheet rows
  for (const su of sheetUpdates) {
    await updateSingleLeadInSheet(accessToken, sheetId, su).catch(err =>
      console.error(`[Google Sheets Cron] Sheet row sync failed:`, err.message)
    );
  }

  // Save new state
  oauth.row_hashes = { ...storedHashes, ...newHashes };
  oauth.last_sync_time = nowStr;
  tsd.google_oauth = oauth;

  await supabaseAdmin
    .from('agent_clients')
    .update({ type_specific_data: JSON.stringify(tsd) })
    .eq('id', clientId);

  return {
    success: true,
    syncedCount: dbUpdates.length + sheetUpdates.length,
    timestamp: nowStr
  };
}
