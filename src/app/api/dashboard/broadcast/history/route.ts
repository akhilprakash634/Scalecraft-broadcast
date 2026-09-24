import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getBroadcastProgress, executeCommand } from '@/lib/ssh';

export const dynamic = 'force-dynamic';

// High-performance background task to self-heal stuck running campaigns without blocking the API response
async function healRunningCampaignsInBackground(
  serverIP: string,
  sshPrivateKey: string,
  serverUser: string,
  regularCampaigns: any[] | null,
  coldCampaigns: any[] | null
) {
  try {
    // Heal regular broadcasts
    if (regularCampaigns && regularCampaigns.length > 0) {
      for (const campaign of regularCampaigns) {
        if (campaign.status === 'running') {
          try {
            const progress = await getBroadcastProgress(serverIP, sshPrivateKey, serverUser || 'ubuntu');
            if (progress && !progress.running) {
              const finalStatus = (progress.sent + progress.failed >= progress.total) ? 'completed' : 'stopped';
              
              await supabaseAdmin
                .from('broadcast_audit')
                .update({
                  sent: progress.sent,
                  failed: progress.failed,
                  status: finalStatus,
                  completed_at: new Date().toISOString()
                })
                .eq('id', campaign.id);
            }
          } catch (err: any) {
            console.error(`[background heal] Failed to self-heal regular campaign ${campaign.id}:`, err.message);
          }
        }
      }
    }

    // Heal cold outreach campaigns
    if (coldCampaigns && coldCampaigns.length > 0) {
      for (const job of coldCampaigns) {
        if (job.status === 'running') {
          try {
            const tmuxCheck = await executeCommand(
              serverIP,
              sshPrivateKey,
              'tmux has-session -t cold_outreach 2>/dev/null && echo "running" || echo "stopped"',
              serverUser || 'ubuntu'
            );
            
            const isRunning = tmuxCheck.stdout.trim() === 'running';
            if (!isRunning) {
              const parseCmd = `python3 -c "
import os
sent, failed = 0, 0
if os.path.exists('/home/ubuntu/cold_outreach_details.log'):
    with open('/home/ubuntu/cold_outreach_details.log') as f:
        for line in f:
            if line.startswith('SUCCESS |'): sent += 1
            elif line.startswith('FAILED |'): failed += 1
print(f'{sent},{failed}')
"`;
              const parseRes = await executeCommand(serverIP, sshPrivateKey, parseCmd, serverUser || 'ubuntu');
              const [sentStr, failedStr] = parseRes.stdout.trim().split(',');
              const sent = parseInt(sentStr || '0', 10);
              const failed = parseInt(failedStr || '0', 10);

              const abortCheck = await executeCommand(
                serverIP,
                sshPrivateKey,
                'ls /home/ubuntu/cold_outreach_abort 2>/dev/null && echo "aborted" || echo "normal"',
                serverUser || 'ubuntu'
              );
              const finalStatus = abortCheck.stdout.trim() === 'aborted' ? 'stopped' : 'completed';

              await supabaseAdmin
                .from('broadcast_jobs')
                .update({
                  sent,
                  failed,
                  status: finalStatus,
                  completed_at: new Date().toISOString()
                })
                .eq('id', job.id);
            }
          } catch (err: any) {
            console.error(`[background heal] Failed to self-heal cold campaign ${job.id}:`, err.message);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[background heal] Main background routine exception:', err.message);
  }
}

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverIP, sshPrivateKey, serverUser } = client;

    // 1. Fetch regular broadcasts from broadcast_audit
    const { data: regularCampaigns, error: regError } = await supabaseAdmin
      .from('broadcast_audit')
      .select('*')
      .eq('client_id', client.clientId)
      .order('started_at', { ascending: false });

    if (regError) {
      console.error('Failed to fetch regular campaigns:', regError.message);
    }

    // 2. Fetch cold outreach campaigns from broadcast_jobs
    const { data: coldCampaigns, error: coldError } = await supabaseAdmin
      .from('broadcast_jobs')
      .select('*')
      .eq('client_id', client.clientId)
      .order('created_at', { ascending: false });

    if (coldError) {
      console.error('Failed to fetch cold campaigns:', coldError.message);
    }

    // High performance optimization: trigger self-healing asynchronously in background,
    // so we return DB history instantly without waiting for SSH command roundtrips!
    const hasRunningCampaign = 
      (regularCampaigns || []).some((c) => c.status === 'running') ||
      (coldCampaigns || []).some((j) => j.status === 'running');

    if (hasRunningCampaign && serverIP && sshPrivateKey) {
      healRunningCampaignsInBackground(serverIP, sshPrivateKey, serverUser || 'ubuntu', regularCampaigns, coldCampaigns)
        .catch((err) => console.error('[background heal] failed to trigger in background:', err.message));
    }

    // 3. Query status logs from broadcast_recipient_logs for the client's campaigns to count statuses
    const campaignIds = [
      ...(regularCampaigns || []).map(c => c.id),
      ...(coldCampaigns || []).map(j => j.id)
    ];

    const statusCountsMap: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {};
    for (const id of campaignIds) {
      statusCountsMap[id] = { sent: 0, delivered: 0, read: 0, failed: 0 };
    }

    if (campaignIds.length > 0) {
      const clientIds = Array.from(new Set([client.clientId, client.id, client._id].filter(Boolean)));
      
      let statusLogs: any[] = [];
      let page = 0;
      const limit = 1000;
      let hasMore = true;
      let logsErr = null;

      while (hasMore) {
        const { data: pageData, error: pageErr } = await supabaseAdmin
          .from('broadcast_recipient_logs')
          .select('campaign_id, phone, status, sent_at')
          .in('client_id', clientIds)
          .range(page * limit, (page + 1) * limit - 1);
        
        if (pageErr) {
          logsErr = pageErr;
          break;
        }

        if (pageData && pageData.length > 0) {
          statusLogs = statusLogs.concat(pageData);
          page++;
          if (pageData.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Query leads_cache for read/reply timestamps to cross-reference campaign delivery
      const { data: leadRecords } = await supabaseAdmin
        .from('leads_cache')
        .select('phone, last_read_at, last_customer_message_at')
        .in('client_id', clientIds);

      const leadReadMap = new Map<string, number>();
      if (leadRecords) {
        for (const l of leadRecords) {
          const pDigits = (l.phone || '').replace(/\D/g, '');
          const lastRead = Math.max(
            l.last_read_at ? new Date(l.last_read_at).getTime() : 0,
            l.last_customer_message_at ? new Date(l.last_customer_message_at).getTime() : 0
          );
          if (lastRead > 0) {
            leadReadMap.set(pDigits, lastRead);
            if (pDigits.startsWith('91')) {
              leadReadMap.set(pDigits.slice(2), lastRead);
            }
          }
        }
      }

      if (logsErr) {
        console.error('Failed to fetch status logs:', logsErr.message);
      } else if (statusLogs) {
        for (const log of statusLogs) {
          const campId = String(log.campaign_id || '');
          let status = (log.status || 'sent').toLowerCase();
          const pDigits = (log.phone || '').replace(/\D/g, '');
          const logSentAt = log.sent_at ? new Date(log.sent_at).getTime() : 0;
          const leadReadTime = leadReadMap.get(pDigits) || 0;

          // Cross-reference read state from leads_cache
          if (status !== 'read' && leadReadTime > 0 && logSentAt > 0 && leadReadTime >= (logSentAt - 30000)) {
            status = 'read';
          }

          // Match exact or string representation of campaign ID
          const matchedCampId = campaignIds.find(id => String(id) === campId) || campId;

          if (!statusCountsMap[matchedCampId]) {
            statusCountsMap[matchedCampId] = { sent: 0, delivered: 0, read: 0, failed: 0 };
          }
          if (status === 'sent') {
            statusCountsMap[matchedCampId].sent++;
          } else if (status === 'delivered') {
            statusCountsMap[matchedCampId].sent++;
            statusCountsMap[matchedCampId].delivered++;
          } else if (status === 'read') {
            statusCountsMap[matchedCampId].sent++;
            statusCountsMap[matchedCampId].delivered++;
            statusCountsMap[matchedCampId].read++;
          } else if (status === 'failed') {
            statusCountsMap[matchedCampId].failed++;
          }
        }
      }
    }

    // 4. Map both lists into a unified schema
    const regularMapped = (regularCampaigns || []).map((c) => {
      const counts = statusCountsMap[c.id] || { sent: 0, delivered: 0, read: 0, failed: 0 };
      const total = c.recipient_count || 0;
      const effectiveSent = Math.max(counts.sent, c.sent || 0);
      const effectiveDelivered = Math.max(counts.delivered, c.delivered || 0);

      return {
        id: c.id,
        type: 'regular',
        job_type: 'regular',
        campaign_type: c.campaign_type || 'Custom',
        campaignType: c.campaign_type || 'Custom',
        total_leads: total,
        totalLeads: total,
        sent: effectiveSent,
        failed: counts.failed || c.failed || 0,
        status: c.status,
        created_at: c.started_at,
        createdAt: c.started_at,
        completed_at: c.completed_at,
        completedAt: c.completed_at,
        message: c.campaign_type || 'Custom',
        statusCounts: {
          sent: effectiveSent,
          delivered: effectiveDelivered,
          read: counts.read,
          failed: counts.failed || c.failed || 0,
        },
      };
    });

    const coldMapped = (coldCampaigns || []).map((c) => {
      const counts = statusCountsMap[c.id] || { sent: 0, delivered: 0, read: 0, failed: 0 };
      const total = c.total_leads || c.sent_count || 0;
      const effectiveSent = Math.max(counts.sent, c.sent || 0);
      const effectiveDelivered = Math.max(counts.delivered, c.delivered || 0);

      return {
        id: c.id,
        type: 'cold',
        job_type: 'cold_outreach',
        campaign_type: 'Cold Outreach',
        campaignType: 'Cold Outreach',
        total_leads: c.total_leads || 0,
        totalLeads: c.total_leads || 0,
        sent: effectiveSent,
        failed: counts.failed || c.failed || 0,
        status: c.status,
        created_at: c.created_at,
        createdAt: c.created_at,
        completed_at: c.completed_at,
        completedAt: c.completed_at,
        message: 'Cold Outreach',
        statusCounts: {
          sent: effectiveSent,
          delivered: effectiveDelivered,
          read: counts.read,
          failed: counts.failed || c.failed || 0,
        },
      };
    });

    // Combine and sort by date descending
    const history = [...regularMapped, ...coldMapped].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Campaign History API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, type } = await request.json();
    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type parameter' }, { status: 400 });
    }

    if (type === 'regular') {
      const { error } = await supabaseAdmin
        .from('broadcast_audit')
        .delete()
        .eq('id', id)
        .eq('client_id', client.clientId);

      if (error) throw error;
    } else if (type === 'cold') {
      const { error } = await supabaseAdmin
        .from('broadcast_jobs')
        .delete()
        .eq('id', id)
        .eq('client_id', client.clientId);

      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Campaign record deleted successfully.' });
  } catch (error: any) {
    console.error('Delete Campaign API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
