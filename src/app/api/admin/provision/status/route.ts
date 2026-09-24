import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { mapDbClientToAgentClient } from '@/lib/agents';
import { executeCommand, uploadFile, hermesCmd, readFile } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import { LightsailClient, GetInstanceStateCommand, GetInstanceCommand, PutInstancePublicPortsCommand } from '@aws-sdk/client-lightsail';
import nodemailer from 'nodemailer';

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


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id') || searchParams.get('docId');
    const clientId = searchParams.get('clientId');

    if (!docId && !clientId) {
      return NextResponse.json({ error: 'Document ID or Client ID is required' }, { status: 400 });
    }

    let isAuthorized = await isAdminAuthenticated();
    if (!isAuthorized) {
      // Allow client checkouts to poll status using document ID or clientId
      if (docId || clientId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query Supabase
    const searchId = docId || clientId;
    const { data: dbClient } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('id', searchId)
      .maybeSingle();

    const doc = dbClient ? mapDbClientToAgentClient(dbClient) : null;
    if (!doc) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Load logs directly via SSH or construct fallback logs representing the progress stages
    const logs: string[] = [];
    const createdDate = new Date(doc._createdAt || doc.setupDate || new Date());
    logs.push(`[${createdDate.toISOString()}] Onboarding completed. Client account registered.`);
    if (doc.instanceName) {
      logs.push(`[${createdDate.toISOString()}] AWS Lightsail instance allocated: ${doc.instanceName}`);
    }
    if (doc.serverIP) {
      logs.push(`[${createdDate.toISOString()}] Dedicated VPS online at IP: ${doc.serverIP}`);
    }

    if (doc.serverIP) {
      try {
        const sshPrivateKey = process.env.SCALECRAFT_SSH_PRIVATE_KEY || 'mock-private-key-content';
        const logCheck = await executeCommand(doc.serverIP, sshPrivateKey, 'tail -n 100 /home/ubuntu/install.log 2>/dev/null || echo ""', 'ubuntu');
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

    // If status is final or waiting for pairing (for profile client), return immediately
    const isProfileInstalling = doc.hermesProfile && doc.status === 'installing';
    if (doc.status === 'active' || doc.status === 'suspended' || doc.status === 'installed' || isProfileInstalling) {
      const isComplete = doc.status === 'active' || doc.status === 'installed' || isProfileInstalling;
      return NextResponse.json({
        status: isComplete ? 'complete' : 'failed',
        stage: isProfileInstalling ? 'pairing' : 'done',
        serverIP: doc.serverIP || '',
        logs: logs,
        lastUpdated: doc._updatedAt || new Date().toISOString(),
        // Keep old fields for compatibility
        provisioningLogs: logs,
        oldStatus: doc.status
      });
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = 'ap-south-1';
    const instanceName = doc.instanceName;

    // helper to update status
    const updateStatus = async (step: number, desc: string, statusState = 'provisioning', extra = {}) => {
      try {
        await supabaseAdmin
          .from('installation_status')
          .upsert({
            client_id: doc._id,
            status: statusState,
            current_step: step,
            step_description: desc,
            license_key: doc.licenseKey || '',
            updated_at: new Date().toISOString(),
            ...extra
          }, { onConflict: 'client_id' });
      } catch (err: any) {
        console.error('Failed to update status in Supabase:', err.message);
      }
    };

    // helper to append logs
    const logProgress = async (msg: string, level = 'info') => {
      console.log(`[STATUS CHECK ${doc.clientId}]: ${msg}`);
      try {
        const ts = new Date().toISOString();
        logs.push(`[${ts}] ${msg}`);
        await supabaseAdmin.from('installation_logs').insert({
          client_id: doc._id,
          log_message: msg,
          log_level: level
        });
      } catch (err: any) {
        console.error('Failed to append status logs in Supabase:', err.message);
      }
    };

    if (doc.status === 'provisioning') {
      const hasAwsCredentials = accessKeyId && secretAccessKey && !accessKeyId.startsWith('your_') && !secretAccessKey.startsWith('your_');

      if (hasAwsCredentials) {
        if (!instanceName) {
          // AWS instance creation is still in progress in POST request, wait for it
          return NextResponse.json({
            status: 'provisioning',
            stage: 'creating',
            serverIP: '',
            logs: logs,
            lastUpdated: doc._updatedAt || new Date().toISOString(),
            // compatibility fields
            state: 'pending',
            provisioningLogs: logs
          });
        }

        const lightsail = new LightsailClient({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });

        try {
          const stateRes = await lightsail.send(new GetInstanceStateCommand({ instanceName }));
          const stateName = stateRes.state?.name;

          if (stateName === 'running') {
            // Get public IP
            const instanceRes = await lightsail.send(new GetInstanceCommand({ instanceName }));
            
            // Try all possible field paths
            const ip = 
              instanceRes.instance?.publicIpAddress ||
              (instanceRes.instance?.networking?.ports?.[0] as any)?.ipv4Cidrs?.[0] ||
              instanceRes.instance?.networking?.ports?.[0]?.cidrs?.[0] ||
              null;

            if (!ip) {
              throw new Error('No public IPv4 found on instance');
            }

            if (ip) {
              await logProgress(`VPS instance is running. Allocated IP: ${ip}. Ready for install - browser will trigger installer...`, 'success');

              // Open ports since the instance is now running
              await logProgress(`Opening firewall ports 22, 80, 443, and 3009 on AWS Lightsail instance...`, 'info');
              try {
                await lightsail.send(new PutInstancePublicPortsCommand({
                  instanceName: instanceName,
                  portInfos: [
                    { fromPort: 22, toPort: 22, protocol: "tcp" },
                    { fromPort: 80, toPort: 80, protocol: "tcp" },
                    { fromPort: 443, toPort: 443, protocol: "tcp" },
                    { fromPort: 3009, toPort: 3009, protocol: "tcp" },
                  ]
                }));
                await logProgress(`AWS Lightsail firewall ports successfully configured.`, 'success');
              } catch (portErr: any) {
                console.error('Failed to configure Lightsail ports:', portErr.message);
                await logProgress(`[Warning] Could not configure AWS firewall ports automatically: ${portErr.message}`, 'warning');
              }

              // Update status to 'installing', stage to 'ssh_connecting', and save IP in Supabase
              await supabaseAdmin
                .from('agent_clients')
                .update({
                  server_ip: ip,
                  status: 'installing',
                  stage: 'ssh_connecting',
                  install_started_at: new Date().toISOString(),
                  install_triggered_at: null // null = not yet triggered by browser
                })
                .eq('id', doc._id);

              // Update status in Supabase
              await updateStatus(5, 'VPS is running. Ready for SSH installation...', 'installing', { server_ip: ip });

              console.log(`[STATUS] Instance running, IP: ${ip}. Returning needsInstallTrigger=true to browser for doc ${doc._id}`);

              return NextResponse.json({
                status: 'installing',
                stage: 'ssh_connecting',
                serverIP: ip,
                logs: logs,
                lastUpdated: new Date().toISOString(),
                needsInstallTrigger: true, // Frontend must call POST /api/admin/provision/install
                documentId: doc._id,
                // compatibility fields
                state: 'running',
                ip,
                provisioningLogs: logs
              });
            }
          }
          
          const currentStage = stateName === 'pending' ? 'booting' : 'creating';
          if (doc.stage !== currentStage) {
            await supabaseAdmin
              .from('agent_clients')
              .update({ stage: currentStage })
              .eq('id', doc._id);
          }

          // Update status in Supabase
          await updateStatus(currentStage === 'booting' ? 2 : 1, currentStage === 'booting' ? 'VPS server is booting...' : 'Allocating VPS server on AWS Lightsail...');

          return NextResponse.json({
            status: 'provisioning',
            stage: currentStage,
            serverIP: '',
            logs: logs,
            lastUpdated: doc._updatedAt || new Date().toISOString(),
            // compatibility fields
            state: stateName || 'pending',
            provisioningLogs: logs
          });
        } catch (awsErr: any) {
          console.error('AWS Lightsail status query failed:', awsErr.message);
          return NextResponse.json({
            status: 'provisioning',
            stage: 'creating',
            serverIP: '',
            logs: logs,
            lastUpdated: doc._updatedAt || new Date().toISOString(),
            // compatibility fields
            state: 'unknown',
            provisioningLogs: logs
          });
        }
      } else {
        // Demo mode state transition
        await logProgress('[DEMO MODE] Simulating running state. Allocated Demo IP: 159.69.120.45', 'success');
        const ip = '159.69.120.45';
        await supabaseAdmin
          .from('agent_clients')
          .update({
            server_ip: ip,
            status: 'installing',
            stage: 'ssh_connecting',
            install_started_at: new Date().toISOString(),
            install_triggered_at: null
          })
          .eq('id', doc._id);

        // Update status in Supabase
        await updateStatus(5, 'VPS is running. Ready for SSH installation...', 'installing', { server_ip: ip });

        console.log(`[STATUS DEMO] Returning needsInstallTrigger=true to browser for doc ${doc._id}`);

        return NextResponse.json({
          status: 'installing',
          stage: 'ssh_connecting',
          serverIP: ip,
          logs: logs,
          lastUpdated: new Date().toISOString(),
          needsInstallTrigger: true, // Frontend must call POST /api/admin/provision/install
          documentId: doc._id,
          // compatibility fields
          state: 'running',
          ip,
          provisioningLogs: logs
        });
      }
    }    if (doc.status === 'installing') {
      const serverIP = doc.serverIP;
      const sshPrivateKey = process.env.SCALECRAFT_SSH_PRIVATE_KEY || 'mock-private-key-content';

      if (!serverIP || serverIP === '127.0.0.1') {
        return NextResponse.json({
          status: 'installing',
          stage: 'ssh_connecting',
          serverIP: serverIP || '',
          logs: logs,
          lastUpdated: doc._updatedAt || new Date().toISOString(),
          // compatibility fields
          state: 'running',
          provisioningLogs: logs
        });
      }

      try {
        // 1. Check if installation finished
        const doneCheck = await executeCommand(serverIP, sshPrivateKey, 'cat /home/ubuntu/install.done', 'ubuntu');
        const doneContent = (doneCheck.stdout || '').trim();

        // Since we successfully ran a command, update stage to 'installing' in Sanity
        if (doc.stage !== 'installing') {
          await supabaseAdmin
            .from('agent_clients')
            .update({ stage: 'installing' })
            .eq('id', doc._id);
        }

        if (doneCheck.exitCode === 0 && doneContent !== '') {
          const exitCode = parseInt(doneContent);
          if (exitCode === 0) {
            // Success! Set up Sheets config + send WhatsApp
            await logProgress('Hermes installer exited successfully on VPS. Configuring sheets integrations...', 'info');
            
            const googleSheetId = '1mockSheetID_' + Date.now().toString().slice(-6);
            const configData = JSON.stringify({ sheets_id: googleSheetId });
            await uploadFile(serverIP, sshPrivateKey, configData, '/home/ubuntu/.hermes/config', 'ubuntu');
            
            // STEP 1 & 2 & 3: Deploy Bot Protection & Prepend SOUL.md anti-bot rules
            await logProgress('[Step 10/10] Deploying bot loop protection...', 'info');
            
            // a. Prepend anti-bot rules to SOUL.md
            try {
              const { prependAntiBotRules, applyBotProtectionConfig } = require('@/lib/ssh');
              const soulPath = '/home/ubuntu/.hermes/SOUL.md';
              const currentSoul = await readFile(serverIP, sshPrivateKey, soulPath, 'ubuntu');
              if (currentSoul) {
                const updatedSoul = prependAntiBotRules(currentSoul);
                await uploadFile(serverIP, sshPrivateKey, updatedSoul, soulPath, 'ubuntu');
                await logProgress('✅ SOUL.md anti-bot rules applied', 'success');
              } else {
                await logProgress('⚠️ SOUL.md not found or empty, skipping prepend', 'warning');
              }
              
              // b & c & d: Upload bot_guard.py, bot_filters.json, configs, cron
              const applied = await applyBotProtectionConfig(serverIP, sshPrivateKey, doc._id, 'ubuntu');
              if (applied) {
                await logProgress('✅ bot_guard.py installed', 'success');
                await logProgress('✅ Cron job configured (runs every 5 minutes)', 'success');
                await logProgress('✅ Hermes config updated (10 msgs/hour limit)', 'success');
                await logProgress('✅ bot_filters.json deployed', 'success');
                await logProgress('✅ Bot protection active!', 'success');
                await logProgress('Bot loop protection deployed successfully', 'info');
                await logProgress('Cron job set: bot_guard.py runs every 5 minutes', 'info');
              } else {
                throw new Error('applyBotProtectionConfig returned false');
              }
            } catch (err: any) {
              await logProgress(`⚠️ Failed to deploy bot loop protection: ${err.message}`, 'error');
            }

            await logProgress("Running post-install commands via SSH...", 'info');
            await executeCommand(serverIP, sshPrivateKey, hermesCmd('hermes gateway start'), 'ubuntu');
            
            // Step 10: Configure SOUL.md path
            await updateStatus(10, 'Configuring SOUL.md path...', 'installing');
            await logProgress('Configuring SOUL.md path...', 'info');
            await executeCommand(
              serverIP,
              sshPrivateKey,
              hermesCmd('hermes config set soul_file /home/ubuntu/.hermes/SOUL.md'),
              'ubuntu'
            );
            await logProgress('✅ SOUL.md path configured', 'success');

            await logProgress("Install complete!", 'success');
            
            await supabaseAdmin
              .from('agent_clients')
              .update({
                google_sheet_id: googleSheetId,
                status: 'active',
                stage: 'done',
                server_ip: serverIP,
                server_user: 'ubuntu',
                ssh_private_key: process.env.SCALECRAFT_SSH_PRIVATE_KEY || '',
                installed_at: new Date().toISOString(),
                bot_protection_enabled: true,
                bot_protection_applied_at: new Date().toISOString()
              })
              .eq('id', doc._id);

            // Update status in Supabase
            await updateStatus(10, 'Agent successfully installed and configured!', 'active', { installed_at: new Date().toISOString() });
            
            await logProgress('Agent fully installed! Sending onboarding WhatsApp welcome to owner...', 'info');
            
            const completionText = `🎉 Your ScaleCraft Agent is ready!\n\nLogin to your dashboard:\nhttps://thescalecraft.in/dashboard\n\nUse your bot number to login.\nOTP will be sent to this number.\n\nOne last step - scan QR code to connect WhatsApp:\nOpen dashboard → Agent Status → Re-pair WhatsApp`;
            
            try {
              const { data: dbActiveClient } = await supabaseAdmin
                .from('agent_clients')
                .select('server_ip')
                .neq('id', doc._id)
                .in('status', ['active', 'installed'])
                .not('server_ip', 'is', null)
                .limit(1)
                .maybeSingle();
              const activeClient = dbActiveClient ? mapDbClientToAgentClient(dbActiveClient) : null;
              const bridgeIp = activeClient?.serverIP || '13.127.46.147';
              await fetch(`http://${bridgeIp}:3009/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chatId: `${doc.ownerPhone}@s.whatsapp.net`,
                  message: completionText
                }),
                signal: AbortSignal.timeout(4000),
              });
              await logProgress('Onboarding WhatsApp sent successfully via bridge!', 'success');
            } catch (bridgeErr: any) {
              console.error('Bridge notification error:', bridgeErr.message);
              await logProgress('Onboarding WhatsApp could not be sent via bridge. Please link WhatsApp via dashboard.', 'warning');
            }

            // Send provisioning completion email
            try {
              if (doc.email) {
                const completionMailOptions = {
                  from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
                  to: doc.email,
                  subject: 'Your ScaleCraft Agent is Live! 🎉',
                  text: `Hi ${doc.ownerName || 'Grower'},
 
Your WhatsApp AI Agent is ready!
 
One last step - connect your WhatsApp:
1. Login to your dashboard: https://thescalecraft.in/dashboard
2. Go to Agent Status
3. Click 'Re-pair WhatsApp Link'
4. Scan the QR code with your bot phone
 
Your agent will be fully live in 2 minutes after scanning.
 
Dashboard: https://thescalecraft.in/dashboard
Bot Number: ${doc.whatsappBotNumber || ''}
 
Need help? WhatsApp us: +91 80780 04732
 
- scalecraft team`,
                };
                await transporter.sendMail(completionMailOptions);
                await logProgress(`Completion email sent successfully to ${doc.email}`, 'success');
              } else {
                await logProgress('Completion email skipped (no email address recorded).', 'info');
              }
            } catch (emailErr: any) {
              console.error('Failed to send completion email:', emailErr.message);
              await logProgress(`[Warning] Could not send completion email: ${emailErr.message}`, 'warning');
            }

            await logProgress('Provisioning process completed successfully! ✅', 'success');

            return NextResponse.json({
              status: 'complete',
              stage: 'done',
              serverIP,
              logs: logs,
              lastUpdated: new Date().toISOString(),
              // compatibility fields
              provisioningLogs: logs
            });
          } else {
            // Failed
            await logProgress(`Installer process failed on VPS with exit code ${exitCode}. Checking logs...`, 'error');
            await supabaseAdmin.from('agent_clients').update({ status: 'suspended', stage: 'done' }).eq('id', doc._id);

            // Update status in Supabase
            await updateStatus(8, 'Installation failed on VPS', 'failed', { failed_reason: `Installer process exited with code ${exitCode}` });
            
            return NextResponse.json({
              status: 'failed',
              stage: 'done',
              serverIP,
              logs: logs,
              lastUpdated: new Date().toISOString(),
              // compatibility fields
              provisioningLogs: logs
            });
          }
        }

        // 2. SSH remote logs are already loaded on-demand at the start of GET request.

        // 3. Timeout check (15 minutes limit)
        const installStarted = doc.installStartedAt ? new Date(doc.installStartedAt).getTime() : new Date(doc._createdAt || doc.setupDate || '').getTime();
        const duration = Date.now() - installStarted;
        const timeoutLimit = 15 * 60 * 1000; // 15 minutes
        if (duration > timeoutLimit) {
          await logProgress(`Installation timed out after 15 minutes. Marking setup as failed.`, 'error');
          await supabaseAdmin.from('agent_clients').update({ status: 'suspended', stage: 'done' }).eq('id', doc._id);

          // Update status in Supabase
          await updateStatus(8, 'Installation timed out', 'failed', { failed_reason: 'Installation timed out after 15 minutes' });
          
          return NextResponse.json({
            status: 'failed',
            stage: 'done',
            serverIP,
            logs: logs,
            lastUpdated: new Date().toISOString(),
            // compatibility fields
            provisioningLogs: logs
          });
        }

        return NextResponse.json({
          status: 'installing',
          stage: 'installing',
          serverIP,
          logs: logs,
          lastUpdated: new Date().toISOString(),
          // compatibility fields
          state: 'running',
          provisioningLogs: logs
        });

      } catch (sshErr: any) {
        console.warn('SSH check failed (booting / setup in progress):', sshErr.message);

        // Check for timeout even if SSH connection fails
        const installStarted = doc.installStartedAt ? new Date(doc.installStartedAt).getTime() : new Date(doc._createdAt || doc.setupDate || '').getTime();
        const duration = Date.now() - installStarted;
        const timeoutLimit = 15 * 60 * 1000; // 15 minutes
        if (duration > timeoutLimit) {
          await logProgress(`Installation timed out during SSH connection stage after 15 minutes. Marking setup as failed.`, 'error');
          await supabaseAdmin.from('agent_clients').update({ status: 'suspended', stage: 'done' }).eq('id', doc._id);

          // Update status in Supabase
          await updateStatus(8, 'SSH connection timed out', 'failed', { failed_reason: 'SSH connection timed out after 15 minutes' });
          
          return NextResponse.json({
            status: 'failed',
            stage: 'done',
            serverIP,
            logs: logs,
            lastUpdated: new Date().toISOString(),
            // compatibility fields
            provisioningLogs: logs
          });
        }

        // Update stage in Supabase
        await updateStatus(6, 'Testing SSH connection to target VPS...', 'installing');

        // Update stage to 'ssh_connecting' in Sanity if not already
        if (doc.stage !== 'ssh_connecting') {
          await supabaseAdmin.from('agent_clients').update({ stage: 'ssh_connecting' }).eq('id', doc._id);
        }

        return NextResponse.json({
          status: 'installing',
          stage: 'ssh_connecting',
          serverIP,
          logs: logs,
          lastUpdated: new Date().toISOString(),
          // compatibility fields
          state: 'running',
          provisioningLogs: logs
        });
      }
    }

    const docStatus = doc.status as string;
    let mappedStatus = 'provisioning';
    if (docStatus === 'active' || docStatus === 'installed') mappedStatus = 'complete';
    else if (docStatus === 'suspended') mappedStatus = 'failed';
    else if (docStatus === 'installing') mappedStatus = 'installing';

    let mappedStage = 'creating';
    if (docStatus === 'active' || docStatus === 'suspended' || docStatus === 'installed') mappedStage = 'done';
    else if (docStatus === 'installing') mappedStage = doc.stage || 'ssh_connecting';
    else if (docStatus === 'provisioning') mappedStage = doc.stage || 'creating';

    return NextResponse.json({
      status: mappedStatus,
      stage: mappedStage,
      serverIP: doc.serverIP || '',
      logs: doc.provisioningLogs || [],
      lastUpdated: doc._updatedAt || new Date().toISOString(),
      // compatibility fields
      provisioningLogs: doc.provisioningLogs || []
    });

  } catch (error: any) {
    console.error('Status GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
