import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveHermesContext } from '@/lib/ssh';

export async function GET() {
  try {
    const clientRecord: any = await getSessionClient();
    if (!clientRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // installation_status table doesn't exist in standalone CRM
    const statusData = null;
    const statusError = null;

    const status = clientRecord.status || 'active';
    const serverIP = clientRecord.serverIP || '';

    // Load logs directly via SSH or construct fallback logs representing the progress stages
    const logs: string[] = [];
    logs.push(`[${new Date(clientRecord._createdAt).toISOString()}] Onboarding completed. Client account registered.`);
    if (clientRecord.instanceName) {
      logs.push(`[${new Date(clientRecord._createdAt).toISOString()}] AWS Lightsail instance allocated: ${clientRecord.instanceName}`);
    }
    if (serverIP) {
      logs.push(`[${new Date(clientRecord._createdAt).toISOString()}] Dedicated VPS online at IP: ${serverIP}`);
    }

    // Only fetch remote logs via SSH if the setup status is not yet active
    if (serverIP && status !== 'active') {
      try {
        const { executeCommand } = await import('@/lib/ssh');
        const sshPrivateKey = process.env.SCALECRAFT_SSH_PRIVATE_KEY || 'mock-private-key-content';
        const logCheck = await executeCommand(serverIP, sshPrivateKey, 'tail -n 100 /home/ubuntu/install.log 2>/dev/null || echo ""', 'ubuntu');
        const logContent = logCheck.stdout || '';
        if (logContent.trim()) {
          const remoteLines = logContent.split('\n').filter(Boolean);
          remoteLines.forEach(l => {
            if (l.trim()) {
              logs.push(l);
            }
          });
        }
      } catch (err: any) {
        console.warn('SSH fetch remote logs failed:', err.message);
      }
    }

    const provisioningLogs = logs;
    const installedAt = clientRecord.installedAt || '';

    let antiBotActive = true;
    let autoFollowUpEnabled = true;
    let googleOauth = null;
    if (clientRecord.typeSpecificData) {
      try {
        const tsd = JSON.parse(clientRecord.typeSpecificData);
        if (tsd.antiBotActive !== undefined) {
          antiBotActive = tsd.antiBotActive;
        }
        if (tsd.autoFollowUpEnabled !== undefined) {
          autoFollowUpEnabled = tsd.autoFollowUpEnabled;
        }
        if (tsd.google_oauth !== undefined) {
          googleOauth = {
            email: tsd.google_oauth.email || '',
            last_sync_time: tsd.google_oauth.last_sync_time || null,
            apps_script_enabled: !!tsd.google_oauth.apps_script_enabled,
            webhook_secret: tsd.google_oauth.webhook_secret || ''
          };
        }
      } catch {}
    }

    let metaLimitTier = clientRecord.metaLimitTier || null;
    let metaQualityRating = clientRecord.metaQualityRating || null;
    let metaLimitExpiresAt = clientRecord.metaLimitExpiresAt || null;
    let metaThroughputLimit = clientRecord.metaThroughputLimit || 80;

    if (clientRecord.connectionType === 'cloud_api' && clientRecord.whatsappPhoneNumberId && clientRecord.whatsappAccessToken) {
      const now = new Date();
      if (!metaLimitExpiresAt || new Date(metaLimitExpiresAt) <= now || !metaLimitTier || !metaQualityRating) {
        try {
          const res = await fetch(`https://graph.facebook.com/v20.0/${clientRecord.whatsappPhoneNumberId}?fields=messaging_limit_tier,quality_rating`, {
            headers: {
              'Authorization': `Bearer ${clientRecord.whatsappAccessToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            metaLimitTier = data.messaging_limit_tier || 'TIER_250';
            metaQualityRating = data.quality_rating || 'GREEN';
            metaLimitExpiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
            
            await supabaseAdmin
              .from('agent_clients')
              .update({
                meta_limit_tier: metaLimitTier,
                meta_quality_rating: metaQualityRating,
                meta_limit_expires_at: metaLimitExpiresAt
              })
              .eq('id', clientRecord._id);
          }
        } catch (err: any) {
          console.error('[Client GET] Failed to fetch Meta limits:', err.message);
        }
      }
    }

    return NextResponse.json({
      clientId: clientRecord._id,
      status,
      provisioningLogs,
      serverIP,
      installedAt,
      businessName: clientRecord.businessName || '',
      ownerName: clientRecord.ownerName || '',
      whatsappBotNumber: clientRecord.whatsappBotNumber || '',
      email: clientRecord.email || '',
      ownerPhone: clientRecord.ownerPhone || '',
      setupAmount: clientRecord.setupAmount ?? 6999,
      monthlyAmount: clientRecord.monthlyAmount ?? 1299,
      geminiApiKey: clientRecord.geminiApiKey 
        ? `${clientRecord.geminiApiKey.slice(0, 7)}...${clientRecord.geminiApiKey.slice(-4)}`
        : '',
      timezone: clientRecord.timezone || 'UTC',
      googleSheetId: clientRecord.googleSheetId || '',
      businessType: clientRecord.businessType || 'product',
      antiBotActive,
      autoFollowUpEnabled,
      planType: clientRecord.planType || 'standard',
      trialStartedAt: clientRecord.trialStartedAt || null,
      trialEndsAt: clientRecord.trialEndsAt || null,
      trialReminderSent: clientRecord.trialReminderSent || false,
      gracePeriodEndsAt: clientRecord.gracePeriodEndsAt || null,
      agentPausedAt: clientRecord.agentPausedAt || null,
      cachedStatus: clientRecord.cachedStatus || 'unknown',
      statusCheckedAt: clientRecord.statusCheckedAt || null,
      hermesProfile: clientRecord.hermesProfile || null,
      sharedServerIp: clientRecord.sharedServerIp || null,
      connectionType: clientRecord.connectionType || 'baileys',
      whatsappPhoneNumberId: clientRecord.whatsappPhoneNumberId || null,
      whatsappAccessToken: clientRecord.whatsappAccessToken 
        ? (clientRecord.whatsappAccessToken.length <= 11 
            ? '***' 
            : `${clientRecord.whatsappAccessToken.slice(0, 7)}...${clientRecord.whatsappAccessToken.slice(-4)}`) 
        : null,
      whatsappWabaId: clientRecord.whatsappWabaId || null,
      whatsappVerifyToken: clientRecord.whatsappVerifyToken || null,
      intendedConnectionType: clientRecord.intendedConnectionType || null,
      metaLimitTier,
      metaQualityRating,
      metaLimitExpiresAt,
      metaThroughputLimit,
      googleOauth,
    });
  } catch (error: any) {
    console.error('Client Profile GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const clientRecord: any = await getSessionClient();
    if (!clientRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { geminiApiKey, googleSheetId, timezone, autoFollowUpEnabled } = await request.json();
    const patchData: any = {};

    if (geminiApiKey !== undefined && geminiApiKey.trim() !== '') {
      patchData.geminiApiKey = geminiApiKey.trim();
    }

    if (googleSheetId !== undefined) {
      patchData.googleSheetId = googleSheetId.trim();
    }

    if (timezone !== undefined && timezone.trim() !== '') {
      patchData.timezone = timezone.trim();
    }

    // Handle typeSpecificData merging
    let currentTsd: any = {};
    if (clientRecord.typeSpecificData) {
      try {
        currentTsd = JSON.parse(clientRecord.typeSpecificData);
      } catch {}
    }

    let tsdChanged = false;
    if (autoFollowUpEnabled !== undefined) {
      currentTsd.autoFollowUpEnabled = autoFollowUpEnabled;
      tsdChanged = true;
    }

    if (tsdChanged) {
      patchData.typeSpecificData = JSON.stringify(currentTsd);
    }

    if (Object.keys(patchData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // 1. Update in Supabase
    const { updateClient } = await import('@/lib/db');
    const mappedPatchData: any = {};
    if (patchData.geminiApiKey !== undefined) {
      mappedPatchData.gemini_api_key = patchData.geminiApiKey;
    }
    if (patchData.googleSheetId !== undefined) {
      mappedPatchData.google_sheet_id = patchData.googleSheetId;
    }
    if (patchData.timezone !== undefined) {
      mappedPatchData.timezone = patchData.timezone;
    }
    if (patchData.typeSpecificData !== undefined) {
      mappedPatchData.type_specific_data = patchData.typeSpecificData;
    }
    await updateClient(clientRecord._id, mappedPatchData);

    const ctx = resolveHermesContext(clientRecord);
    const serverIP = ctx.ip;
    const sshPrivateKey = clientRecord.sshPrivateKey || process.env.SCALECRAFT_SSH_PRIVATE_KEY;
    const serverUser = clientRecord.serverUser || 'ubuntu';

    // 2. Update Gemini API key on VPS if provided
    if (patchData.geminiApiKey && serverIP && sshPrivateKey) {
      const { executeCommand } = await import('@/lib/ssh');
      const cleanKey = patchData.geminiApiKey;
      const envPath = `${ctx.profileRoot}/.env`;
      
      const updateEnvPython = `
import os
env_path = "${envPath}"
key = """${cleanKey.replace(/"""/g, '\\"\\"\\""')}"""
lines = []
updated_google = False
updated_gemini = False
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('GOOGLE_API_KEY='):
                lines.append(f'GOOGLE_API_KEY="{key}"\\n')
                updated_google = True
            elif line.startswith('GEMINI_API_KEY='):
                lines.append(f'GEMINI_API_KEY="{key}"\\n')
                updated_gemini = True
            else:
                lines.append(line)
if not updated_google:
    lines.append(f'GOOGLE_API_KEY="{key}"\\n')
if not updated_gemini:
    lines.append(f'GEMINI_API_KEY="{key}"\\n')
with open(env_path, 'w') as f:
    f.writelines(lines)
`;
      const base64Script = Buffer.from(updateEnvPython).toString('base64');
      const updateCmd = `echo "${base64Script}" | base64 -d | python3 && systemctl --user restart ${ctx.serviceName}`;
      
      const res = await executeCommand(serverIP, sshPrivateKey, updateCmd, serverUser);
      if (res.exitCode !== 0) {
        console.error('Failed to update remote .env or restart service:', res.stderr);
      }
    }

    // 3. Update Google Sheets ID on VPS if provided
    if (googleSheetId !== undefined && serverIP && sshPrivateKey) {
      const { uploadFile } = await import('@/lib/ssh');
      const configData = JSON.stringify({ sheets_id: googleSheetId.trim() });
      const configPath = `${ctx.profileRoot}/config`;
      await uploadFile(serverIP, sshPrivateKey, configData, configPath, serverUser);
    }

    // 4. Update Timezone on VPS if provided
    if (patchData.timezone && serverIP && sshPrivateKey) {
      const { executeCommand } = await import('@/lib/ssh');
      const cleanTz = patchData.timezone;
      const envPath = `${ctx.profileRoot}/.env`;
      
      const updateTzPython = `
import os
env_path = "${envPath}"
tz_val = """${cleanTz.replace(/"""/g, '\\"\\"\\""')}"""
lines = []
updated_tz = False
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('TZ='):
                lines.append(f'TZ="{tz_val}"\\n')
                updated_tz = True
            else:
                lines.append(line)
if not updated_tz:
    lines.append(f'TZ="{tz_val}"\\n')
with open(env_path, 'w') as f:
    f.writelines(lines)
`;
      const base64Script = Buffer.from(updateTzPython).toString('base64');
      const updateCmd = `echo "${base64Script}" | base64 -d | python3 && systemctl --user restart ${ctx.serviceName}`;
      
      const res = await executeCommand(serverIP, sshPrivateKey, updateCmd, serverUser);
      if (res.exitCode !== 0) {
        console.error('Failed to update remote TZ or restart service:', res.stderr);
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully!' });
  } catch (error: any) {
    console.error('Client Profile PATCH Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
