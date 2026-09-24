import { NextRequest, NextResponse } from 'next/server';
import { mapDbClientToAgentClient } from '@/lib/agents';
import { executeCommand, uploadFile, applyBotProtectionConfig, hermesCmd } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminAuthenticated, getSessionClient } from '@/lib/auth';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

function hashStringToPort(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 3001 + Math.abs(hash) % 999;
}

async function updateLogs(clientId: string, log: string, level = 'info') {
  console.log(`[INSTALL ${clientId}][${level.toUpperCase()}]: ${log}`);
}

async function updateStatus(clientId: string, step: number, desc: string, status = 'installing', extra = {}) {
  try {
    await supabaseAdmin
      .from('installation_status')
      .upsert({
        client_id: clientId,
        status,
        current_step: step,
        step_description: desc,
        updated_at: new Date().toISOString(),
        ...extra
      }, { onConflict: 'client_id' });
  } catch (err: any) {
    console.error('updateStatus error:', err.message);
  }
}

export async function POST(request: NextRequest) {
  let docId = '';
  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
    docId = documentId;

    const { data: dbClient } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();
    const doc = dbClient ? mapDbClientToAgentClient(dbClient) : null;
    if (!doc) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }

    let isAuthorized = await isAdminAuthenticated();
    if (!isAuthorized) {
      const adminSecret = request.headers.get('x-admin-secret');
      if (adminSecret && process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      // 1. Allow if the logged-in client owns the document
      const sessionClient = await getSessionClient();
      if (sessionClient && sessionClient._id === doc._id) {
        isAuthorized = true;
      }
      // 2. Allow if the pre-created document status is installing (since it's a valid paid client awaiting install trigger)
      else if (doc.status === 'installing') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    if (doc.status !== 'installing') {
      return NextResponse.json({ error: 'Client is not in installing state' }, { status: 400 });
    }

    const serverIP = doc.serverIP;
    const licenseKey = doc.licenseKey;
    const geminiApiKey = doc.geminiApiKey;
    const businessName = doc.businessName;
    const ownerPhone = doc.ownerPhone;

    const sshPrivateKey = process.env.SCALECRAFT_SSH_PRIVATE_KEY || 'mock-private-key-content';

    if (doc.hermesProfile) {
      const profile = doc.hermesProfile;
      const bridgePort = hashStringToPort(profile);
      const sharedServerIp = doc.sharedServerIp || serverIP;
      const logPrefix = `[Shared][Client: ${documentId}][IP: ${sharedServerIp}][Profile: ${profile}]`;

      await updateLogs(documentId, `${logPrefix} Initiating multi-tenant profile installation...`, 'info');
      await updateStatus(documentId, 5, 'Performing pre-flight capability checks on shared host...', 'installing');

      // 1. Pre-flight Capability check using profile list JSON check
      const checkCli = await executeCommand(sharedServerIp, sshPrivateKey, hermesCmd('hermes profile list --json'), doc.serverUser || 'ubuntu');
      if (checkCli.exitCode !== 0) {
        const checkErr = `Hermes CLI capability verification failed: ${checkCli.stdout || checkCli.stderr}`;
        await updateLogs(documentId, `${logPrefix} [ERROR] ${checkErr}`, 'error');
        await updateStatus(documentId, 5, 'Pre-flight capability check failed', 'failed', { failed_reason: checkErr });
        return NextResponse.json({ error: checkErr }, { status: 500 });
      }

      await updateStatus(documentId, 6, 'Creating profile and directories...', 'installing');
      await updateLogs(documentId, `${logPrefix} Creating profile and configuration folders...`, 'info');

      // 2. Setup commands
      const configYaml = `
gateway:
  port: 3000
  host: 127.0.0.1
session:
  license_key: "${licenseKey}"
  gemini_api_key: "${geminiApiKey}"
  auto_reply: true
  user_profile_enabled: false
  session_reset:
    mode: "none"
platform:
  type: "whatsapp"
platforms:
  whatsapp:
    extra:
      bridge_port: ${bridgePort}
`;
      const escapedConfigYaml = configYaml.replace(/'/g, "'\\''");

      const serviceContent = `
[Unit]
Description=Hermes Gateway Profile - ${profile}
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/.hermes/bin/hermes -p ${profile} gateway start --foreground
Restart=always
RestartSec=5
Environment=PATH=/usr/bin:/usr/local/bin:/home/ubuntu/.hermes/bin:/home/ubuntu/.local/bin
Environment=XDG_RUNTIME_DIR=/run/user/1000

[Install]
WantedBy=default.target
`;
      const escapedServiceContent = serviceContent.replace(/'/g, "'\\''");

      const setupCmd = hermesCmd(
        `hermes profile add ${profile} 2>/dev/null || true\n` +
        `mkdir -p ~/.hermes/profiles/${profile}/logs ~/.hermes/profiles/${profile}/sessions ~/.hermes/profiles/${profile}/platforms/whatsapp\n` +
        `echo '${escapedConfigYaml}' > ~/.hermes/profiles/${profile}/config.yaml\n` +
        `mkdir -p ~/.config/systemd/user\n` +
        `echo '${escapedServiceContent}' > ~/.config/systemd/user/hermes-gateway-${profile}.service\n` +
        `systemctl --user daemon-reload\n` +
        `systemctl --user enable hermes-gateway-${profile}.service\n` +
        `systemctl --user restart hermes-gateway-${profile}.service`
      );

      try {
        const setupRes = await executeCommand(sharedServerIp, sshPrivateKey, setupCmd, doc.serverUser || 'ubuntu');
        if (setupRes.exitCode !== 0) {
          throw new Error(`Profile setup script returned exit code ${setupRes.exitCode}: ${setupRes.stdout || setupRes.stderr}`);
        }

        // Apply bot protection config for the profile
        await updateStatus(documentId, 7, 'Configuring bot protection limits...', 'installing');
        await updateLogs(documentId, `${logPrefix} Applying bot protection configuration...`, 'info');
        const botGuardRes = await applyBotProtectionConfig(doc, sshPrivateKey, doc._id, doc.serverUser || 'ubuntu');
        if (!botGuardRes) {
          throw new Error('Failed to configure bot protection rules');
        }

        // Install shared server heartbeat cron (best effort, non-blocking)
        await updateStatus(documentId, 8, 'Installing heartbeat cron job...', 'installing');
        try {
          // Generate and persist a per-client secret token so the heartbeat
          // endpoint can validate that pings come from the real VPS.
          const heartbeatToken = [
            Math.random().toString(36).slice(2),
            Math.random().toString(36).slice(2),
            Date.now().toString(36),
          ].join('-');

          await supabaseAdmin
            .from('agent_clients')
            .update({ heartbeat_token: heartbeatToken })
            .eq('id', documentId);

          const installHeartbeat = `
cat << 'EOF' > ~/heartbeat.py
import json, time, datetime, subprocess, sys, urllib.request

webhook_url = "https://thescalecraft.in/api/internal/heartbeat"
heartbeat_token = "${heartbeatToken}"
host_ip = subprocess.run(['hostname', '-I'], capture_output=True, text=True).stdout.strip().split()[0]

try:
    res = subprocess.run(['hermes', 'profile', 'list', '--json'], capture_output=True, text=True)
    if res.returncode == 0:
        profiles = json.loads(res.stdout)
        for p in profiles:
            payload = {
                "clientId": p.get('name'),
                "profile": p.get('name'),
                "host": host_ip,
                "hermesVersion": "1.0.0",
                "status": "online" if p.get('gateway_running') else "offline",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "uptime": "N/A"
            }
            try:
                req = urllib.request.Request(
                    webhook_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {heartbeat_token}'
                    },
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    pass
            except Exception as e:
                print(f"Failed to post heartbeat for {p.get('name')}: {e}")
except Exception as e:
    print(f"Heartbeat check error: {e}")
EOF
chmod +x ~/heartbeat.py
crontab -l 2>/dev/null | grep -v "heartbeat.py" | { cat; echo "*/2 * * * * python3 ~/heartbeat.py >> ~/heartbeat.log 2>&1"; } | crontab -
`;
          await executeCommand(sharedServerIp, sshPrivateKey, hermesCmd(installHeartbeat), doc.serverUser || 'ubuntu');
        } catch (hbErr: any) {
          console.warn('Heartbeat setup failed (non-blocking):', hbErr.message);
        }

        // Update installation status and activate client - only active on complete success
        await updateStatus(documentId, 10, 'Installation completed successfully!', 'installed');
        await updateLogs(documentId, `${logPrefix} Multi-tenant profile installation completed successfully!`, 'success');

        await supabaseAdmin
          .from('agent_clients')
          .update({ status: 'active', stage: 'done' })
          .eq('id', documentId);

        // Send credentials email if the client doesn't already have a portal password
        // (this covers cases where saas/checkout created the record but webhook never fired)
        try {
          const { data: freshClient } = await supabaseAdmin
            .from('agent_clients')
            .select('portal_password, email, owner_name, whatsapp_bot_number')
            .eq('id', documentId)
            .maybeSingle();

          if (freshClient && freshClient.email) {
            let plainPassword: string | null = null;
            if (!freshClient.portal_password) {
              // Generate and save password — this is the first time
              const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
              plainPassword = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
              const hashed = await bcrypt.hash(plainPassword, 10);
              await supabaseAdmin
                .from('agent_clients')
                .update({ portal_password: hashed, portal_created_at: new Date().toISOString() })
                .eq('id', documentId);
              await supabaseAdmin
                .from('portal_users')
                .upsert({
                  client_id: documentId,
                  bot_phone: freshClient.whatsapp_bot_number,
                  email: freshClient.email,
                  owner_name: freshClient.owner_name,
                  password_hash: hashed,
                  portal_created_at: new Date().toISOString(),
                }, { onConflict: 'client_id' });
            }

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

            const loginLine = plainPassword
              ? `Bot WhatsApp Number: ${freshClient.whatsapp_bot_number}\nPassword: ${plainPassword}\n\n⚠️ Please save this password.`
              : `Bot WhatsApp Number: ${freshClient.whatsapp_bot_number}\nUse the password you set during checkout.`;

            await transporter.sendMail({
              from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
              to: freshClient.email,
              subject: '🎉 Your ScaleCraft Agent is Ready! Link WhatsApp Now',
              text: `Hi ${freshClient.owner_name || 'there'},\n\nYour ScaleCraft Agent has been fully installed and is ready to use!\n\nDashboard: https://thescalecraft.in/dashboard\n\nLogin with:\n${loginLine}\n\nNext step — scan the QR code to connect your WhatsApp:\nOpen Dashboard → Agent Status → Re-pair WhatsApp\n\n- ScaleCraft Team\nthescalecraft.in`,
            });
            console.log(`[INSTALL] Credentials email sent to ${freshClient.email}`);
          }
        } catch (emailErr: any) {
          console.warn('[INSTALL] Failed to send credentials email (non-blocking):', emailErr.message);
        }

        return NextResponse.json({
          success: true,
          message: 'Multi-tenant profile installed and activated successfully.'
        });

      } catch (err: any) {
        // Rollback
        await updateLogs(documentId, `${logPrefix} [ERROR] Installation failed: ${err.message}. Rolling back...`, 'error');
        await updateStatus(documentId, 9, 'Installation failed. Initiating rollback...', 'failed', { failed_reason: err.message });

        const rollbackCmd = hermesCmd(
          `systemctl --user stop hermes-gateway-${profile} 2>/dev/null || true; ` +
          `systemctl --user disable hermes-gateway-${profile} 2>/dev/null || true; ` +
          `rm -f ~/.config/systemd/user/hermes-gateway-${profile}.service; ` +
          `hermes profile remove ${profile} 2>/dev/null || true; ` +
          `tmux kill-session -t hermes_pairing_${profile} 2>/dev/null || true; ` +
          `rm -rf ~/.hermes/profiles/${profile} ~/pair_whatsapp_${profile}.py 2>/dev/null || true`
        );
        await executeCommand(sharedServerIp, sshPrivateKey, rollbackCmd, doc.serverUser || 'ubuntu');

        // Verification of rollback
        const verifyCmd = hermesCmd(
          `if [ -d ~/.hermes/profiles/${profile} ] || systemctl --user list-unit-files | grep -q hermes-gateway-${profile}; then echo "DIRTY"; else echo "CLEAN"; fi`
        );
        const verifyRes = await executeCommand(sharedServerIp, sshPrivateKey, verifyCmd, doc.serverUser || 'ubuntu');
        if (verifyRes.stdout.trim() === 'DIRTY') {
          await updateLogs(documentId, `${logPrefix} [WARNING] Rollback incomplete. Remaining profile directories or services detected!`, 'error');
        } else {
          await updateLogs(documentId, `${logPrefix} Rollback verification succeeded. System is clean.`, 'info');
        }

        await supabaseAdmin
          .from('agent_clients')
          .update({ status: 'suspended', stage: 'done' })
          .eq('id', documentId);

        return NextResponse.json({ error: 'Profile installation failed. Rollback executed.', details: err.message }, { status: 500 });
      }
    } else {
      // Step 1: Waiting for SSH daemon...
      await updateStatus(documentId, 5, 'Waiting for SSH daemon to start up...', 'installing');
      await updateLogs(documentId, "Waiting for SSH daemon to start up...", 'info');

      // Step 2: Connection test to the server IP (Check SSH is actually connecting)
      await updateStatus(documentId, 6, 'Testing SSH connection to target VPS...', 'installing');
      await updateLogs(documentId, `Testing SSH connection to ${serverIP}...`, 'info');
      let sshConnected = false;
      let lastErrorMsg = '';
      const maxRetries = 15;
      const retryDelayMs = 8000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const testRes = await executeCommand(serverIP, sshPrivateKey, 'echo "test"', 'ubuntu');
          if (testRes.exitCode === 0) {
            sshConnected = true;
            await updateLogs(documentId, "SSH connected successfully!", 'success');
            break;
          } else {
            lastErrorMsg = `SSH command returned exit code ${testRes.exitCode}`;
          }
        } catch (err: any) {
          lastErrorMsg = err.message;
        }

        if (attempt < maxRetries) {
          await updateLogs(documentId, `SSH daemon not ready yet (Attempt ${attempt}/${maxRetries} failed: ${lastErrorMsg}). Retrying in 8s...`, 'warning');
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }

      if (!sshConnected) {
        await updateLogs(documentId, `[ERROR] SSH connection test failed after ${maxRetries} attempts: ${lastErrorMsg}`, 'error');
        // Mark as failed in Sanity & Supabase
        await updateStatus(documentId, 6, 'SSH connection failed', 'failed', { failed_reason: lastErrorMsg });
        await supabaseAdmin
          .from('agent_clients')
          .update({ status: 'suspended', stage: 'done' })
          .eq('id', documentId);
        return NextResponse.json({ error: 'SSH connection failed', details: lastErrorMsg }, { status: 500 });
      }

      // Step 3: Generating license key...
      await updateStatus(documentId, 7, 'Generating license key...', 'installing');
      await updateLogs(documentId, `Generating license key... (Key: ${licenseKey})`, 'info');

      // Step 4: Running install script in background...
      await updateLogs(documentId, "Clean up old log and status files on target VPS...", 'info');
      try {
        await executeCommand(serverIP, sshPrivateKey, 'rm -f /home/ubuntu/install.done /home/ubuntu/install.log', 'ubuntu');
      } catch (cleanErr: any) {
        console.warn('Stale file cleanup warning:', cleanErr.message);
      }

      await updateStatus(documentId, 8, 'Launching installation script in background...', 'installing');
      await updateLogs(documentId, "Launching installation script in background...", 'info');

      // Check if tmux is installed on the VPS, if so use it to prevent SSH hangup disconnects
      let useTmux = false;
      try {
        const checkTmux = await executeCommand(serverIP, sshPrivateKey, 'command -v tmux', 'ubuntu');
        if (checkTmux.exitCode === 0) {
          useTmux = true;
        }
      } catch (err: any) {
        console.warn('Tmux detection check failed:', err.message);
      }

      const scriptContent = `#!/bin/bash
(curl -fsSL https://thescalecraft.in/agent/install.sh | bash -s -- \\
  --key '${licenseKey.replace(/'/g, "'\\''")}' \\
  --gemini-key '${geminiApiKey.replace(/'/g, "'\\''")}' \\
  --agent-name 'AI Sales Assistant' \\
  --biz-name '${businessName.replace(/'/g, "'\\''")}' \\
  --products 'Our Products' \\
  --pricing 'Contact us' \\
  --website 'https://thescalecraft.in' \\
  --team-num '${ownerPhone.replace(/'/g, "'\\''")}' \\
  --client-id '${documentId}') > /home/ubuntu/install.log 2>&1
echo $? > /home/ubuntu/install.done
`;

      const scriptPath = '/home/ubuntu/install_bg.sh';
      try {
        await updateLogs(documentId, "Uploading install helper script to remote VPS...", 'info');
        await uploadFile(serverIP, sshPrivateKey, scriptContent, scriptPath, 'ubuntu');
        await executeCommand(serverIP, sshPrivateKey, `chmod +x ${scriptPath}`, 'ubuntu');
        await updateLogs(documentId, "Install helper script configured and executable.", 'success');
      } catch (err: any) {
        await updateLogs(documentId, `[ERROR] Failed to write helper script to VPS: ${err.message}`, 'error');
        throw err;
      }

      let installCommand = '';
      if (useTmux) {
        await updateLogs(documentId, "Using detached tmux session for stable installation backgrounding...", 'info');
        // Kill any existing tmux session by the same name
        try {
          await executeCommand(serverIP, sshPrivateKey, 'tmux kill-session -t scalecraft_install', 'ubuntu');
        } catch (e) {}

        installCommand = `tmux new-session -d -s scalecraft_install 'bash ${scriptPath}'`;
      } else {
        await updateLogs(documentId, "Tmux not detected. Falling back to nohup backgrounding...", 'warning');
        installCommand = `nohup bash ${scriptPath} > /dev/null 2>&1 &`;
      }

      console.log('Starting background SSH install on:', serverIP);
      console.log('Running background command:', installCommand);
      
      try {
        const runRes = await executeCommand(serverIP, sshPrivateKey, installCommand, 'ubuntu');
        console.log(`[Install] Background SSH executeCommand initiated:`, runRes);
        
        if (runRes.exitCode === 0) {
          await updateLogs(documentId, "Background installation successfully started! Streaming logs...", 'success');
        } else {
          await updateLogs(documentId, `[ERROR] Failed to launch background installer. Exit code: ${runRes.exitCode}`, 'error');
          await updateStatus(documentId, 8, 'Failed to launch background installer', 'failed', { failed_reason: runRes.stderr });
          await supabaseAdmin
            .from('agent_clients')
            .update({ status: 'suspended', stage: 'done' })
            .eq('id', documentId);
          return NextResponse.json({ error: 'Failed to launch background installer', details: runRes.stderr }, { status: 500 });
        }
      } catch (runErr: any) {
        await updateLogs(documentId, `[ERROR] Failed to execute background install command: ${runErr.message}`, 'error');
        await updateStatus(documentId, 8, 'Failed to execute background install command', 'failed', { failed_reason: runErr.message });
        await supabaseAdmin
          .from('agent_clients')
          .update({ status: 'suspended', stage: 'done' })
          .eq('id', documentId);
        return NextResponse.json({ error: 'Background install script launch failed', details: runErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Background installation initiated successfully.'
    });

  } catch (error: any) {
    console.error('BG Install Endpoint Error:', error.message);
    if (docId) {
      await updateLogs(docId, `[ERROR] Internal error: ${error.message}`);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
