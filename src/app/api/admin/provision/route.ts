import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAdminAuthenticated, getSessionClient } from '@/lib/auth';
import { mapDbClientToAgentClient } from '@/lib/agents';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { validatePhoneNumber, executeCommand, hermesCmd } from '@/lib/ssh';
import { LightsailClient, OpenInstancePublicPortsCommand } from '@aws-sdk/client-lightsail';
import { logAdminAction } from '@/lib/adminAudit';
import nodemailer from 'nodemailer';
import { trialEndsAt } from '@/lib/billingConstants';
import { getServerForNewClient } from '@/lib/servers';

const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.in',
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

function hashStringToPort(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 3001 + Math.abs(hash) % 999;
}

async function allocatePort(
  sharedServerIp: string,
  sshKey: string,
  serverUser: string
): Promise<number> {
  const result = await executeCommand(
    sharedServerIp,
    sshKey,
    `grep -r "port" ~/.hermes/profiles/*/gateway.json 2>/dev/null | grep -o '[0-9]\\{4,5\\}' | sort -n | tail -1`,
    serverUser
  );
  
  const parsedPort = parseInt(result.stdout?.trim() || '8090', 10);
  const lastPort = isNaN(parsedPort) ? 8090 : parsedPort;
  return Math.max(lastPort + 1, 8091);
}

async function verifyProfileStatus(
  sharedServerIp: string,
  sshKey: string,
  serverUser: string,
  profileName: string,
  connectionType: string
): Promise<{ success: boolean; errors: string[] }> {
  const result = await executeCommand(
    sharedServerIp,
    sshKey,
    hermesCmd(`export HERMES_HOME=~/.hermes/profiles/${profileName} && cd ~/.hermes/profiles/${profileName} && hermes status`),
    serverUser
  );

  const stdout = result.stdout || '';
  const errors: string[] = [];

  // Check WhatsApp (only for Cloud API)
  if (connectionType === 'cloud_api') {
    if (!stdout.includes('WhatsApp      ✓ configured')) {
      errors.push('WhatsApp is not configured');
    }
  }

  // Check Google / Gemini key
  if (!/Google \/ Gemini\s+✓/.test(stdout)) {
    errors.push('Google / Gemini key is not set');
  }

  // Check Gateway Service status and manager
  if (!/Status:\s+✓ running/.test(stdout)) {
    errors.push('Gateway service is not running');
  }
  if (!/Manager:\s+systemd/.test(stdout)) {
    errors.push('Gateway service manager is not systemd');
  }

  return {
    success: errors.length === 0,
    errors
  };
}

export { GET } from './status/route';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      businessName, 
      ownerName, 
      botPhone, 
      ownerPhone, 
      email, 
      geminiApiKey, 
      plan, 
      paymentId, 
      sanityDocumentId, 
      hermesProfile, 
      sharedServerIp: bodySharedServerIp,
      connectionType = 'baileys',
      whatsappPhoneNumberId,
      whatsappAccessToken,
      whatsappWabaId,
      whatsappAppSecret: bodyWhatsappAppSecret,
      plan_type = 'standard',
      monthly_amount,
      setup_amount
    } = body;

    const sharedServerIp = bodySharedServerIp || process.env.SHARED_SERVER_IP || '13.206.143.171';

    const originalConnectionType = connectionType || 'baileys';
    let finalConnectionType = originalConnectionType;
    let pendingCloudApi = false;

    if (whatsappPhoneNumberId && whatsappAccessToken) {
      finalConnectionType = 'cloud_api';
    }

    if (finalConnectionType === 'cloud_api' && 
        (!whatsappPhoneNumberId || !whatsappAccessToken)) {
      // No credentials yet — provision as Baileys
      // Client will connect Cloud API from dashboard
      finalConnectionType = 'baileys';
      pendingCloudApi = true;
    }

    if (finalConnectionType !== 'baileys' && finalConnectionType !== 'cloud_api') {
      return NextResponse.json({ error: 'Invalid connection type' }, { status: 400 });
    }



    if (hermesProfile) {
      const PROFILE_REGEX = /^[a-z0-9][a-z0-9-_]{2,36}$/;
      if (!PROFILE_REGEX.test(hermesProfile)) {
        return NextResponse.json({ error: `Invalid Hermes profile name format: '${hermesProfile}'. Only lowercase alphanumeric, dashes, and underscores (3-37 characters) are allowed.` }, { status: 400 });
      }
      const RESERVED_PROFILES = new Set([
        'root', 'system', 'default', 'profiles', 'logs', 'cache', 'tmp',
        'ubuntu', 'admin', 'hermes', 'gateway', 'platform', 'whatsapp', 'config',
        'bin', 'lib', 'run', 'etc', 'data', 'temp', 'backup'
      ]);
      if (RESERVED_PROFILES.has(hermesProfile)) {
        return NextResponse.json({ error: `Hermes profile name '${hermesProfile}' is a reserved system name.` }, { status: 400 });
      }

      // Pre-check duplicate profile name in Supabase across all other clients
      const { data: duplicateProfile } = await supabaseAdmin
        .from('agent_clients')
        .select('id')
        .eq('hermes_profile', hermesProfile)
        .neq('id', sanityDocumentId || '')
        .maybeSingle();
      if (duplicateProfile) {
        return NextResponse.json({ error: `Hermes profile '${hermesProfile}' is already assigned to another client.` }, { status: 400 });
      }
    }

    let existingDoc: any = null;
    if (sanityDocumentId || email) {
      const query = supabaseAdmin.from('agent_clients').select('*');
      if (sanityDocumentId) {
        query.eq('id', sanityDocumentId);
      } else {
        query.eq('email', email.toLowerCase().trim());
      }
      const { data: dbClient } = await query.maybeSingle();
      if (dbClient) {
        existingDoc = mapDbClientToAgentClient(dbClient);
      }
    }

    let isAuthorized = await isAdminAuthenticated();
    if (!isAuthorized) {
      const adminSecret = request.headers.get('x-admin-secret');
      const expectedSecret = process.env.ADMIN_SECRET;
      if (adminSecret && expectedSecret && adminSecret === expectedSecret) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && existingDoc) {
      // 1. Allow if the logged-in client owns the document
      const sessionClient = await getSessionClient();
      if (sessionClient && sessionClient._id === existingDoc._id) {
        isAuthorized = true;
      }
      // 2. Allow if the pre-created document status is pending, paid, or installing
      else if (existingDoc.status === 'paid' || existingDoc.status === 'pending' || existingDoc.status === 'installing') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      // Log unauthorized attempt to audit logs
      await logAdminAction('Provisioning Attempt Unauthorized', { businessName, ownerName, email }, request);
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const finalBusinessName = businessName || existingDoc?.businessName;
    const finalOwnerName = ownerName || existingDoc?.ownerName;
    const finalBotPhone = botPhone || existingDoc?.whatsappBotNumber;
    const finalOwnerPhone = ownerPhone || existingDoc?.ownerPhone;
    const finalEmail = email || existingDoc?.email;
    const finalGeminiApiKey = geminiApiKey || existingDoc?.geminiApiKey;
    const whatsappAppSecret = bodyWhatsappAppSecret || 
      body.whatsapp_app_secret || 
      existingDoc?.whatsappAppSecret || '';

    if (!finalBusinessName || !finalOwnerName || !finalBotPhone || !finalOwnerPhone || !finalEmail || !finalGeminiApiKey) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Input Validation
    if (!/^[a-zA-Z0-9\s]+$/.test(finalBusinessName)) {
      return NextResponse.json({ error: 'Business name must be alphanumeric and spaces only' }, { status: 400 });
    }
    const cleanBot = finalBotPhone.replace(/\D/g, '');
    const cleanOwner = finalOwnerPhone.replace(/\D/g, '');
    if (!validatePhoneNumber(cleanBot) || !validatePhoneNumber(cleanOwner)) {
      return NextResponse.json({ error: 'Invalid WhatsApp or owner phone number format' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }
    if (!(finalGeminiApiKey.startsWith('AIza') || finalGeminiApiKey.startsWith('AQ.') || finalGeminiApiKey.length > 20)) {
      return NextResponse.json({ error: 'Gemini API key must start with AIza or AQ.' }, { status: 400 });
    }
    if (finalConnectionType === 'cloud_api') {
      if (!whatsappPhoneNumberId || !whatsappAccessToken || !whatsappAppSecret) {
        return NextResponse.json({ 
          error: 'Phone Number ID, Access Token and App Secret are required for Cloud API' 
        }, { status: 400 });
      }
      if (!/^\d+$/.test(whatsappPhoneNumberId)) {
        return NextResponse.json({ error: 'Invalid WhatsApp Phone Number ID' }, { status: 400 });
      }
      if (whatsappWabaId && !/^\d+$/.test(whatsappWabaId)) {
        return NextResponse.json({ error: 'Invalid WhatsApp WABA ID' }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_\-\.\+\/\\\=\~]+$/.test(whatsappAccessToken)) {
        return NextResponse.json({ error: 'Invalid WhatsApp Access Token format' }, { status: 400 });
      }
    }


    // Log the successful provisioning start action
    await logAdminAction('Provision Client Server Started', { businessName: finalBusinessName, email: finalEmail, botPhone: finalBotPhone }, request);

    const randStr = (len: number) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const isMockDb = 
      process.env.SUPABASE_SERVICE_ROLE_KEY === '[SENSITIVE]' || 
      !process.env.SUPABASE_SERVICE_ROLE_KEY || 
      process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder-service-role' ||
      process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_');

    let createdRecord: any;
    let clientId: string;
    let licenseKey: string;

    const targetDocId = sanityDocumentId || existingDoc?._id;

    if (targetDocId) {
      // Check if another client has the same email or phone number
      const cleanBotPhone = finalBotPhone.replace(/\D/g, '');
      const { data: duplicateClient } = await supabaseAdmin
        .from('agent_clients')
        .select('id')
        .neq('id', targetDocId)
        .or(`whatsapp_bot_number.eq.${cleanBotPhone},email.eq.${finalEmail.toLowerCase().trim()}`)
        .maybeSingle();
      if (duplicateClient) {
        return NextResponse.json({ error: 'An agent with this email or WhatsApp number already exists.' }, { status: 400 });
      }

      // Fast-path: Express already created this record - just fetch and update status
      console.log(`[Provision] Using pre-created Supabase doc: ${targetDocId}`);
      const { data: dbExistingDoc } = await supabaseAdmin
        .from('agent_clients')
        .select('*')
        .eq('id', targetDocId)
        .maybeSingle();

      const resolvedExistingDoc = dbExistingDoc ? mapDbClientToAgentClient(dbExistingDoc) : null;

      if (!resolvedExistingDoc) {
        return NextResponse.json({ error: 'Pre-created agent client not found' }, { status: 404 });
      }

      if (resolvedExistingDoc.status === 'active' || resolvedExistingDoc.status === 'provisioning' || resolvedExistingDoc.status === 'installing') {
        console.log(`[Provision] Client ${targetDocId} already in state: ${resolvedExistingDoc.status}. Skipping.`);
        return NextResponse.json({
          success: true,
          clientId: resolvedExistingDoc.clientId,
          documentId: resolvedExistingDoc._id,
          status: resolvedExistingDoc.status,
          message: `Server provisioning is already in state: ${resolvedExistingDoc.status}`,
        });
      }

      // Preserve the existing license key
      const oldKey = resolvedExistingDoc.licenseKey || '';
      licenseKey = (oldKey && oldKey.startsWith('SCA-') && oldKey.split('-').length === 3) ? oldKey : `SCA-${randStr(5)}-${randStr(5)}`;
      clientId = resolvedExistingDoc.clientId;
      // Resolve shared server IP dynamically
      let finalServerIp = bodySharedServerIp || resolvedExistingDoc.sharedServerIp;
      let needsIncrement = false;
      if (!finalServerIp) {
        try {
          const selectedServer = await getServerForNewClient();
          finalServerIp = selectedServer.ip;
          needsIncrement = true;
        } catch (err: any) {
          console.error('[Provision] getServerForNewClient failed, falling back to default:', err.message);
          finalServerIp = process.env.SHARED_SERVER_IP || '13.206.143.171';
        }
      } else if (!resolvedExistingDoc.sharedServerIp) {
        // Manual override specified, but client did not have an IP before, so we still increment
        needsIncrement = true;
      }

       const isTrial = plan_type === 'trial' || resolvedExistingDoc.planType === 'trial';
       const updateData: any = { 
         status: 'provisioning', 
         stage: 'creating', 
         license_key: licenseKey,
         plan_type: isTrial ? 'trial' : 'standard',
         monthly_amount: monthly_amount != null ? Number(monthly_amount) : undefined,
         setup_amount: setup_amount != null ? Number(setup_amount) : undefined
       };
       if (isTrial) {
         updateData.trial_started_at = new Date().toISOString();
         updateData.trial_ends_at = trialEndsAt();
         updateData.setup_paid = true;
         updateData.monthly_active = true;
       }
       updateData.hermes_profile = hermesProfile || clientId;
       updateData.shared_server_ip = finalServerIp;
       updateData.connection_type = finalConnectionType;
       updateData.whatsapp_phone_number_id = whatsappPhoneNumberId || null;
       updateData.whatsapp_access_token = whatsappAccessToken || null;
       updateData.whatsapp_waba_id = whatsappWabaId || null;
       updateData.whatsapp_app_secret = whatsappAppSecret || null;
       updateData.intended_connection_type = originalConnectionType;


      const { data: updatedDb, error: updateErr } = await supabaseAdmin
        .from('agent_clients')
        .update(updateData)
        .eq('id', resolvedExistingDoc._id)
        .select()
        .single();
      if (updateErr) {
        if (updateErr.code === '23505' && updateErr.message?.includes('idx_unique_hermes_profile')) {
          return NextResponse.json({ error: `Hermes profile '${hermesProfile}' is already assigned to another client.` }, { status: 400 });
        }
        throw updateErr;
      }

      // Atomically increment server load count
      if (needsIncrement) {
        try {
          await supabaseAdmin.rpc('increment_server_client_count', { server_ip: finalServerIp });
        } catch (rpcErr: any) {
          console.error('[Provision] Failed to increment server client count:', rpcErr.message);
        }
      }

      createdRecord = mapDbClientToAgentClient(updatedDb);
      console.log(`[Provision] Updated pre-created doc to 'provisioning': ${createdRecord._id}`);
    } else {
      // Standard path: search or create
      const cleanBotPhone = botPhone.replace(/\D/g, '');
      const cleanOwnerPhone = ownerPhone.replace(/\D/g, '');

      let existingClient = null;
      if (!isMockDb) {
        const { data: dbExisting } = await supabaseAdmin
          .from('agent_clients')
          .select('*')
          .or(`whatsapp_bot_number.eq.${cleanBotPhone},email.eq.${email.toLowerCase().trim()},owner_phone.eq.${cleanOwnerPhone}`)
          .maybeSingle();
        existingClient = dbExisting ? mapDbClientToAgentClient(dbExisting) : null;
      }

      if (existingClient) {
        return NextResponse.json(
          { error: 'An agent session with this email or WhatsApp number already exists.' },
          { status: 400 }
        );
      } else {
        clientId = crypto.randomUUID();
        licenseKey = `SCA-${randStr(5)}-${randStr(5)}`;

        const isTrial = plan_type === 'trial';

        // Resolve shared server IP dynamically
        let finalServerIp = bodySharedServerIp;
        if (!finalServerIp) {
          try {
            const selectedServer = await getServerForNewClient();
            finalServerIp = selectedServer.ip;
          } catch (err: any) {
            console.error('[Provision] getServerForNewClient failed, falling back to default:', err.message);
            finalServerIp = process.env.SHARED_SERVER_IP || '13.206.143.171';
          }
        }

        const insertPayload: any = {
          id: clientId,
          business_name: businessName,
          owner_name: ownerName,
          whatsapp_bot_number: cleanBotPhone,
          owner_phone: cleanOwnerPhone,
          email: email.toLowerCase().trim(),
          gemini_api_key: geminiApiKey,
          plan: plan || 'starter',
          plan_type: plan_type,
          status: 'provisioning',
          stage: 'creating',
          server_user: 'ubuntu',
          license_key: licenseKey,
          current_otp: '',
          otp_expires_at: new Date(0).toISOString(),
          provisioning_logs: [],
          hermes_profile: hermesProfile || clientId,
          shared_server_ip: finalServerIp,
          connection_type: finalConnectionType,
          whatsapp_phone_number_id: whatsappPhoneNumberId || null,
          whatsapp_access_token: whatsappAccessToken || null,
          whatsapp_waba_id: whatsappWabaId || null,
          whatsapp_app_secret: whatsappAppSecret || null,
          intended_connection_type: originalConnectionType,
          monthly_amount: monthly_amount != null ? Number(monthly_amount) : null,
          setup_amount: setup_amount != null ? Number(setup_amount) : null,
        };

        if (isTrial) {
          insertPayload.trial_started_at = new Date().toISOString();
          insertPayload.trial_ends_at = trialEndsAt();
          insertPayload.setup_paid = true;
          insertPayload.monthly_active = true;
        }

        let insertedDb: any = null;
        let insertErr: any = null;
        if (isMockDb) {
          insertedDb = {
            id: clientId,
            business_name: businessName,
            owner_name: ownerName,
            whatsapp_bot_number: cleanBotPhone,
            owner_phone: cleanOwnerPhone,
            email: email.toLowerCase().trim(),
            gemini_api_key: geminiApiKey,
            plan: plan || 'starter',
            plan_type: plan_type,
            status: 'provisioning',
            stage: 'creating',
            server_user: 'ubuntu',
            license_key: licenseKey,
            provisioning_logs: [],
            hermes_profile: hermesProfile || clientId,
            shared_server_ip: finalServerIp,
            connection_type: finalConnectionType,
            whatsapp_phone_number_id: whatsappPhoneNumberId || null,
            whatsapp_access_token: whatsappAccessToken || null,
            whatsapp_waba_id: whatsappWabaId || null,
            whatsapp_app_secret: whatsappAppSecret || null,
            intended_connection_type: originalConnectionType,
          };
        } else {
          const res = await supabaseAdmin
            .from('agent_clients')
            .insert(insertPayload)
            .select()
            .single();
          insertedDb = res.data;
          insertErr = res.error;
        }

        if (insertErr) {
          if (insertErr.code === '23505' && insertErr.message?.includes('idx_unique_hermes_profile')) {
            return NextResponse.json({ error: `Hermes profile '${hermesProfile}' is already assigned to another client.` }, { status: 400 });
          }
          throw insertErr;
        }

        // Atomically increment server load count
        if (!isMockDb) {
          try {
            await supabaseAdmin.rpc('increment_server_client_count', { server_ip: finalServerIp });
          } catch (rpcErr: any) {
            console.error('[Provision] Failed to increment server client count:', rpcErr.message);
          }
        }

        createdRecord = mapDbClientToAgentClient(insertedDb);
        console.log(`Created pending client registry in Supabase: ${createdRecord._id}`);
      }
    }

    // Normalize cleanBotPhone for later use (in case we took the sanityDocumentId fast-path)
    let cleanBotPhone = (createdRecord.whatsappBotNumber || finalBotPhone).replace(/\D/g, '');

    // Ensure portal_users record exists in Supabase
    let passwordHash = (createdRecord as any).portalPassword;
    let plainPassword = '';
    if (!passwordHash) {
      plainPassword = randStr(8).toLowerCase();
      passwordHash = await bcrypt.hash(plainPassword, 10);

      // Update Supabase as well
      let updatedDb: any = null;
      let updateErr: any = null;
      if (isMockDb) {
        updatedDb = {
          id: createdRecord._id,
          portal_password: passwordHash,
          portal_created_at: new Date().toISOString(),
        };
      } else {
        const res = await supabaseAdmin
          .from('agent_clients')
          .update({
            portal_password: passwordHash,
            portal_created_at: new Date().toISOString(),
          })
          .eq('id', createdRecord._id)
          .select()
          .single();
        updatedDb = res.data;
        updateErr = res.error;
      }
      if (updateErr) throw updateErr;
      createdRecord = mapDbClientToAgentClient(updatedDb);
    }

    // Send welcome email with credentials to client
    if (plainPassword) {
      try {
        const mailOptions = {
          from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
          to: finalEmail,
          subject: 'Your ScaleCraft Agent Dashboard is Ready 🤖',
          text: `Hi ${finalOwnerName},
 
We are setting up your WhatsApp AI Agent. This takes about 10-15 minutes.
 
You can track your setup progress here:
 
Dashboard: https://thescalecraft.in/dashboard
 
Login with:
Bot WhatsApp Number: ${cleanBotPhone}
Password: ${plainPassword}
 
⚠️ Please save this password. You can change it after logging in.
 
- scalecraft team
thescalecraft.in`,
        };
        await transporter.sendMail(mailOptions);
        console.log(`[Provision] Credentials email sent successfully to ${finalEmail}`);
      } catch (emailErr: any) {
        console.error('[Provision] Failed to send credentials email:', emailErr.message);
      }
    }

    if (!isMockDb) {
      try {
        const { error: userError } = await supabaseAdmin
          .from('portal_users')
          .upsert({
            client_id: createdRecord._id,
            bot_phone: cleanBotPhone,
            email: finalEmail.toLowerCase().trim(),
            owner_name: finalOwnerName,
            business_name: finalBusinessName,
            password_hash: passwordHash,
            portal_created_at: (createdRecord as any).portalCreatedAt || new Date().toISOString(),
          }, { onConflict: 'client_id' });

        if (userError) {
          console.error('[Provision] Supabase portal_users upsert error:', userError.message);
        } else {
          console.log('[Provision] Supabase portal_users record upserted successfully.');
        }
      } catch (err: any) {
        console.error('[Provision] Exception during portal_users upsert:', err.message);
      }
    }

    // Clear old installation logs to ensure clean state
    if (!isMockDb) {
      try {
        await supabaseAdmin
          .from('installation_logs')
          .delete()
          .eq('client_id', createdRecord._id);
        console.log('[Provision] Cleared old installation logs.');
      } catch (err: any) {
        console.error('[Provision] Failed to clear old installation logs:', err.message);
      }
    }

    // Helper to update status in Supabase
    const updateStatus = async (step: number, desc: string, status = 'provisioning', extra = {}) => {
      if (isMockDb) return;
      try {
        await supabaseAdmin
          .from('installation_status')
          .upsert({
            client_id: createdRecord._id,
            status,
            current_step: step,
            step_description: desc,
            license_key: licenseKey,
            updated_at: new Date().toISOString(),
            ...extra
          }, { onConflict: 'client_id' });
      } catch (err: any) {
        console.error('Failed to update status in Supabase:', err.message);
      }
    };

    // Helper to append progress logs in Supabase
    const logProgress = async (msg: string, level = 'info') => {
      console.log(`[PROVISIONING ${clientId}]: ${msg}`);
    };

    await updateStatus(1, 'Initializing profile setup on shared server...');
    await logProgress('Initializing profile setup on shared server...', 'info');

    const sharedServerUser = process.env.SHARED_SERVER_USER || 'ubuntu';
    const profileName = createdRecord._id; // use clientId as profile name
    const bridgePort = hashStringToPort(profileName);

    let allocatedPort = 8090;
    if (finalConnectionType === 'cloud_api') {
      try {
        allocatedPort = await allocatePort(
          sharedServerIp,
          process.env.SHARED_SERVER_SSH_KEY!,
          sharedServerUser
        );
      } catch (portErr: any) {
        console.error('[Provision] Failed to allocate port automatically:', portErr.message);
        allocatedPort = 8091; // fallback
      }
    }

    // Step 1: Create Hermes profile
    await updateStatus(2, 'Creating agent profile on shared server...');
    await logProgress(`Creating agent profile '${profileName}' on shared server ${sharedServerIp}...`, 'info');

    const createProfileResult = await executeCommand(
      sharedServerIp,
      process.env.SHARED_SERVER_SSH_KEY!,
      hermesCmd(`hermes profile create ${profileName}`),
      sharedServerUser
    );

    if (createProfileResult.exitCode !== 0) {
      throw new Error(`Profile creation failed: ${createProfileResult.stderr}`);
    }
    await logProgress('Profile created successfully.', 'success');

    // Step 2: Write config.yaml to profile
    await logProgress('Writing config.yaml to profile...', 'info');
    const configYaml = `model:
  default: gemini-2.5-flash
  provider: gemini
agent:
  max_turns: 60
  gateway_timeout: 1800
  restart_drain_timeout: 180
  api_max_retries: 3
  tool_use_enforcement: auto
  image_input_mode: auto
  verbose: false
  reasoning_effort: medium
  environment_hint: "You are an AI assistant for ${finalBusinessName}. Never call yourself Hermes."
display:
  personality: silent
  busy_input_mode: queue
  streaming: true
  final_response_markdown: strip
gateway:
  home_channel_prompt: false
  suppress_home_channel_prompt: true
  skip_home_channel_nag: true
whatsapp:
  reply_prefix: ''
  reconnect_interval: 30
  max_reconnect_attempts: 10
memory:
  memory_enabled: true
  user_profile_enabled: false
  memory_char_limit: 2200
  user_char_limit: 1375
  nudge_interval: 10
  flush_min_turns: 6
session_reset:
  mode: context
  idle_minutes: 1440
  at_hour: 4
group_sessions_per_user: true
platform_toolsets:
  whatsapp:
    - clarify
    - memory
    - messaging
    - web
platforms:
  whatsapp:
    extra:
      bridge_port: ${bridgePort}
security:
  redact_secrets: true
  tirith_enabled: true
  tirith_fail_open: true
soul_file: /home/ubuntu/.hermes/profiles/${profileName}/SOUL.md
max_messages_per_contact_per_hour: 10
max_conversation_turns: 20
ignore_system_notifications: true`;

    const configWriteResult = await executeCommand(
      sharedServerIp,
      process.env.SHARED_SERVER_SSH_KEY!,
      `cat > ~/.hermes/profiles/${profileName}/config.yaml << 'YAML'\n${configYaml}\nYAML`,
      sharedServerUser
    );
    if (configWriteResult.exitCode !== 0) {
      throw new Error(`Failed to write config.yaml: ${configWriteResult.stderr}`);
    }
    await logProgress('config.yaml written successfully.', 'success');

    // Step 3: Write .env based on connection type
    await logProgress('Writing .env file based on connection type...', 'info');
    let envContent = '';

    if (finalConnectionType === 'cloud_api') {
      envContent = `WHATSAPP_CLOUD_PHONE_NUMBER_ID="${whatsappPhoneNumberId}"
WHATSAPP_CLOUD_ACCESS_TOKEN="${whatsappAccessToken}"
WHATSAPP_CLOUD_APP_SECRET="${whatsappAppSecret}"
WHATSAPP_CLOUD_ALLOW_ALL_USERS=true
GATEWAY_ALLOW_ALL_USERS=true
WHATSAPP_CLOUD_HOME_CHANNEL=${cleanBotPhone}@s.whatsapp.net
WHATSAPP_CLOUD_VERIFY_TOKEN=${profileName}-webhook-token
WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID="${whatsappWabaId || ''}"
WHATSAPP_CLOUD_WEBHOOK_PORT=${allocatedPort}
WHATSAPP_ENABLED=true
GOOGLE_API_KEY="${finalGeminiApiKey}"
GEMINI_API_KEY="${finalGeminiApiKey}"
TZ="Asia/Kolkata"`;
    } else {
      envContent = `GOOGLE_API_KEY="${finalGeminiApiKey}"
GEMINI_API_KEY="${finalGeminiApiKey}"
WHATSAPP_MODE=bot
WHATSAPP_ALLOWED_USERS=*
WHATSAPP_ALLOW_ALL_USERS=true
WHATSAPP_HOME_CHANNEL=${cleanBotPhone}@s.whatsapp.net
HERMES_GATEWAY_HOME_CHANNEL_PROMPT=false
WHATSAPP_ENABLED=true
TZ="Asia/Kolkata"`;
    }

    const envWriteResult = await executeCommand(
      sharedServerIp,
      process.env.SHARED_SERVER_SSH_KEY!,
      `cat > ~/.hermes/profiles/${profileName}/.env << 'ENV'\n${envContent}\nENV\nchmod 600 ~/.hermes/profiles/${profileName}/.env`,
      sharedServerUser
    );
    if (envWriteResult.exitCode !== 0) {
      throw new Error(`Failed to write .env: ${envWriteResult.stderr}`);
    }
    await logProgress('.env written successfully.', 'success');

    if (finalConnectionType === 'cloud_api') {
      // Write gateway.json with allocated port
      const gatewayJson = JSON.stringify({
        platforms: {
          whatsapp_cloud: {
            mode: 'bot',
            dm_policy: 'open',
            group_policy: 'ignore',
            port: allocatedPort
          }
        }
      }, null, 2);

      const gatewayWriteRes = await executeCommand(
        sharedServerIp,
        process.env.SHARED_SERVER_SSH_KEY!,
        `echo '${gatewayJson}' > ~/.hermes/profiles/${profileName}/gateway.json`,
        sharedServerUser
      );
      if (gatewayWriteRes.exitCode !== 0) {
        await logProgress(`[Warning] Failed to write gateway.json: ${gatewayWriteRes.stderr}`, 'warning');
      } else {
        await logProgress('gateway.json with allocated port written successfully.', 'success');
      }

      // Open the port in AWS Lightsail firewall
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const hasAwsCredentials = accessKeyId && secretAccessKey && !accessKeyId.startsWith('your_') && !secretAccessKey.startsWith('your_');

      if (hasAwsCredentials) {
        await logProgress(`Opening firewall port ${allocatedPort} on AWS Lightsail instance...`, 'info');
        try {
          const lightsail = new LightsailClient({
            region: 'ap-south-1',
            credentials: { accessKeyId, secretAccessKey },
          });
          const instanceName = process.env.SHARED_SERVER_LIGHTSAIL_INSTANCE_NAME || 'ScaleCraft-Shared-Server';
          await lightsail.send(new OpenInstancePublicPortsCommand({
            instanceName,
            portInfo: {
              fromPort: allocatedPort,
              toPort: allocatedPort,
              protocol: 'tcp'
            }
          }));
          await logProgress(`AWS Lightsail firewall port ${allocatedPort} successfully configured.`, 'success');
        } catch (portErr: any) {
          console.error('Failed to configure Lightsail ports:', portErr.message);
          await logProgress(`[Warning] Could not configure AWS firewall port automatically: ${portErr.message}`, 'warning');
        }
      } else {
        await logProgress(`[Demo Mode / No AWS Credentials] Skipping automatic AWS firewall port ${allocatedPort} opening.`, 'info');
      }
    }

    // Step 4: Install gateway service
    await updateStatus(3, 'Installing agent gateway service...');
    await logProgress('Installing agent gateway service...', 'info');

    const installResult = await executeCommand(
      sharedServerIp,
      process.env.SHARED_SERVER_SSH_KEY!,
      hermesCmd(`hermes -p ${profileName} gateway install`),
      sharedServerUser
    );
    if (installResult.exitCode !== 0) {
      throw new Error(`Gateway installation failed: ${installResult.stderr}`);
    }
    await logProgress('Gateway service installed successfully.', 'success');

    // Step 5: Start gateway
    await logProgress('Starting agent gateway...', 'info');
    const startResult = await executeCommand(
      sharedServerIp,
      process.env.SHARED_SERVER_SSH_KEY!,
      hermesCmd(`hermes -p ${profileName} gateway start`),
      sharedServerUser
    );
    if (startResult.exitCode !== 0) {
      throw new Error(`Failed to start gateway: ${startResult.stderr}`);
    }
    await logProgress('Gateway started successfully.', 'success');

    // Step 6: For Cloud API — run webhook registration
    if (finalConnectionType === 'cloud_api') {
      await logProgress('Registering WhatsApp Cloud API webhook...', 'info');
      const cloudSetupResult = await executeCommand(
        sharedServerIp,
        process.env.SHARED_SERVER_SSH_KEY!,
        hermesCmd(`hermes -p ${profileName} whatsapp-cloud`),
        sharedServerUser
      );
      if (cloudSetupResult.exitCode !== 0) {
        await logProgress(`[Warning] Webhook setup command warning: ${cloudSetupResult.stderr}`, 'warning');
      } else {
        await logProgress('WhatsApp Cloud API webhook configured successfully.', 'success');
      }
    }

    // Step 6.5: Post-provisioning Verification Gate
    await updateStatus(3.5, 'Running post-provisioning verification checks...');
    await logProgress('Running post-provisioning verification checks...', 'info');

    let verifySuccess = false;
    let verifyErrors: string[] = [];

    // Poll and retry verification to account for service startup latency
    for (let attempt = 1; attempt <= 5; attempt++) {
      await logProgress(`Verification attempt ${attempt}/5...`, 'info');
      try {
        const check = await verifyProfileStatus(
          sharedServerIp,
          process.env.SHARED_SERVER_SSH_KEY!,
          sharedServerUser,
          profileName,
          finalConnectionType
        );
        if (check.success) {
          verifySuccess = true;
          break;
        }
        verifyErrors = check.errors;
        await logProgress(`Attempt ${attempt} failed: ${verifyErrors.join(', ')}`, 'warning');
      } catch (err: any) {
        verifyErrors = [err.message || 'Execution error during verification'];
        await logProgress(`Attempt ${attempt} error: ${err.message}`, 'error');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!verifySuccess) {
      const errorMsg = `Post-provisioning verification failed: ${verifyErrors.join(', ')}`;
      await logProgress(errorMsg, 'error');

      // Update Supabase to provisioning_incomplete status
      if (!isMockDb) {
        await supabaseAdmin
          .from('agent_clients')
          .update({
            hermes_profile: profileName,
            shared_server_ip: sharedServerIp,
            connection_type: finalConnectionType,
            intended_connection_type: originalConnectionType,
            whatsapp_phone_number_id: whatsappPhoneNumberId || null,
            whatsapp_access_token: whatsappAccessToken || null,
            whatsapp_waba_id: whatsappWabaId || null,
            whatsapp_app_secret: whatsappAppSecret || null,
            whatsapp_verify_token: finalConnectionType === 'cloud_api' 
              ? `${profileName}-webhook-token` 
              : null,
            whatsapp_webhook_port: finalConnectionType === 'cloud_api' ? allocatedPort : 8090,
            status: 'provisioning_incomplete',
            stage: 'failed',
            server_ip: sharedServerIp,
            server_user: sharedServerUser,
            provisioning_logs: [errorMsg]
          })
          .eq('id', createdRecord._id);
      }

      await updateStatus(
        9,
        `Verification failed: ${verifyErrors.join(', ')}`,
        'failed'
      );

      return NextResponse.json({
        success: false,
        clientId,
        documentId: createdRecord._id,
        status: 'provisioning_incomplete',
        error: errorMsg,
        message: `Verification failed: ${verifyErrors.join(', ')}`
      }, { status: 500 });
    }

    await logProgress('Post-provisioning verification passed successfully!', 'success');

    // Step 7: Update Supabase with profile info
    const finalStatus = finalConnectionType === 'cloud_api' ? 'active' : 'installing';
    const finalStage = finalConnectionType === 'cloud_api' ? 'live' : 'pairing';

    if (!isMockDb) {
      await supabaseAdmin
        .from('agent_clients')
        .update({
          hermes_profile: profileName,
          shared_server_ip: sharedServerIp,
          connection_type: finalConnectionType,
          intended_connection_type: originalConnectionType,
          whatsapp_phone_number_id: whatsappPhoneNumberId || null,
          whatsapp_access_token: whatsappAccessToken || null,
          whatsapp_waba_id: whatsappWabaId || null,
          whatsapp_app_secret: whatsappAppSecret || null,
          whatsapp_verify_token: finalConnectionType === 'cloud_api' 
            ? `${profileName}-webhook-token` 
            : null,
          whatsapp_webhook_port: finalConnectionType === 'cloud_api' ? allocatedPort : 8090,
          status: finalStatus,
          stage: finalStage,
          server_ip: sharedServerIp,
          server_user: sharedServerUser,
        })
        .eq('id', createdRecord._id);
    }

    await updateStatus(
      4,
      finalConnectionType === 'cloud_api'
        ? 'Agent is live! Connected via WhatsApp Cloud API.'
        : 'Agent profile created. Waiting for WhatsApp QR pairing.',
      finalStatus
    );

    return NextResponse.json({
      success: true,
      clientId,
      documentId: createdRecord._id,
      status: finalStatus,
      message: finalConnectionType === 'cloud_api'
        ? 'Agent is live! Connected via WhatsApp Cloud API.'
        : 'Agent profile created. Waiting for WhatsApp QR pairing.',
    });

  } catch (error: any) {
    console.error('Provision API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

