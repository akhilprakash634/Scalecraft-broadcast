/**
 * GET /api/dashboard/usage
 *
 * Computes live Gemini/Server/Service usage cost, queries historical invoices
 * from the monthly_usage_snapshots table, and tracks Meta API limits.
 *
 * Security:
 *  - Auth: getSessionClient() validates the session cookie.
 *  - Supabase database access uses supabaseAdmin (service role) to query metrics safely.
 *  - Input parameters are validated server-side.
 */

import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, uploadFile, pauseAgentEmergency } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import {
  DEFAULT_MONTHLY_PRICE,
  GEMINI_COST_PER_MESSAGE,
  SERVER_COST_MONTHLY,
} from '@/lib/billingConstants';

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverIP, sshPrivateKey, serverUser, plan, setupDate } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // Python script to parse gateway.log directly and aggregate daily logs
    const parseLogsPython = `
import os, glob, datetime, json, time

counts = {}
today = datetime.date.today()
for i in range(30):
    d = today - datetime.timedelta(days=i)
    counts[d.strftime('%Y-%m-%d')] = 0

last_hour_count = 0
now = time.time()

profile = "${client.hermesProfile || ''}"
if profile:
    log_paths = glob.glob(os.path.expanduser(f'~/.hermes/profiles/{profile}/logs/gateway.log*'))
else:
    log_paths = glob.glob(os.path.expanduser('~/.hermes/logs/gateway.log*'))
for path in log_paths:
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if "inbound message:" in line:
                        try:
                            parts = line.strip().split(' ')
                            if len(parts) > 0:
                                dt = parts[0]
                                if dt in counts:
                                    counts[dt] += 1
                                    
                            if len(parts) >= 2:
                                # Parse timestamp safely
                                ts_str = f"{parts[0]} {parts[1].split(',')[0]}"
                                log_dt = datetime.datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                                if (datetime.datetime.now() - log_dt).total_seconds() < 3600:
                                    last_hour_count += 1
                        except Exception:
                            pass
        except Exception:
            pass

chart_data = [{"date": k, "count": v} for k, v in sorted(counts.items())]
print(json.dumps({
    "chart_data": chart_data,
    "last_hour_count": last_hour_count
}))
    `;

    const tmpScriptPath = `/home/ubuntu/parse_usage_logs_${client._id}.py`;
    await uploadFile(serverIP, sshPrivateKey, parseLogsPython, tmpScriptPath, serverUser || 'ubuntu');

    const result = await executeCommand(serverIP, sshPrivateKey, `python3 ${tmpScriptPath}`, serverUser || 'ubuntu');
    await executeCommand(serverIP, sshPrivateKey, `rm ${tmpScriptPath}`, serverUser || 'ubuntu');

    let parsedResult = { chart_data: [], last_hour_count: 0 };
    try {
      parsedResult = JSON.parse(result.stdout);
    } catch {
      // Fallback
    }

    const dailyUsage = parsedResult.chart_data.length > 0 ? parsedResult.chart_data : Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        date: d.toISOString().slice(0, 10),
        count: 0,
      };
    }).reverse();

    const lastHourCount = parsedResult.last_hour_count || 0;

    // Calculate total messages in current cycle (last 30 days)
    const totalMessages = dailyUsage.reduce((acc: number, cur: any) => acc + cur.count, 0);

    // Check if client is using their own API key
    const hasOwnKey = !!client.geminiApiKey && client.geminiApiKey.trim().length > 0;

    let monthlyPrice = DEFAULT_MONTHLY_PRICE;
    try {
      const { data: product } = await supabaseAdmin
        .from('saas_products')
        .select('monthly_price')
        .eq('id', 'scalecraft-agent-saas')
        .maybeSingle();

      if (product && product.monthly_price) {
        monthlyPrice = product.monthly_price;
      }
    } catch (err: any) {
      console.error('Error fetching monthly price from Supabase in usage API:', err.message);
    }

    // Cost calculations
    const geminiCostValue = hasOwnKey ? 0 : totalMessages * GEMINI_COST_PER_MESSAGE;
    const serverCost = SERVER_COST_MONTHLY;
    const serviceFee = monthlyPrice - serverCost;

    // Meta conversation cost for Cloud API clients
    let metaCost = 0;
    if (client.connectionType === 'cloud_api') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Try Meta Graph API
      if (client.whatsappWabaId && client.whatsappAccessToken) {
        try {
          const endTime = Math.floor(Date.now() / 1000);
          const startTime = Math.floor(startOfMonth.getTime() / 1000);
          const analyticsUrl = `https://graph.facebook.com/v20.0/${client.whatsappWabaId}/conversation_analytics?granularity=MONTHLY&start=${startTime}&end=${endTime}&dimensions=conversation_category`;
          const analyticsRes = await fetch(analyticsUrl, {
            headers: { 'Authorization': `Bearer ${client.whatsappAccessToken}` },
            cache: 'no-store'
          });
          if (analyticsRes.ok) {
            const resData = await analyticsRes.json();
            const dataPoints = resData.data || [];
            let conversationCount = 0;
            for (const dp of dataPoints) {
              const categories = dp.conversation_category || [];
              for (const cat of categories) {
                conversationCount += cat.count || 0;
              }
            }
            metaCost = conversationCount * 0.72; // safe estimate
          }
        } catch (err: any) {
          console.warn('[Usage API] Meta analytics fetch failed, using local logs fallback:', err.message);
        }
      }

      // Local logs count fallback
      if (metaCost === 0) {
        const { count } = await supabaseAdmin
          .from('broadcast_recipient_logs')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.clientId)
          .gte('sent_at', startOfMonth.toISOString())
          .eq('is_new_session', true);
        
        metaCost = (count || 0) * 0.72;
      }
    }

    const totalCost = Math.round(geminiCostValue + serverCost + serviceFee + metaCost);

    // Plan limits
    const limits: Record<string, number> = {
      starter: 500,
      growth: 2000,
      pro: 999999, // unlimited
    };
    const planLimit = limits[plan || 'starter'] || 500;

    // Fetch invoices from monthly_usage_snapshots table (NO fabrication)
    const { data: dbSnapshots } = await supabaseAdmin
      .from('monthly_usage_snapshots')
      .select('*')
      .eq('client_id', client.clientId)
      .order('month', { ascending: false });

    const invoices = (dbSnapshots || []).map((s) => ({
      id: s.id,
      month: s.month,
      messages: s.message_count,
      apiCost: Math.round(s.gemini_cost),
      serviceFee: s.service_fee,
      metaCost: s.meta_cost || 0,
      total: Math.round(s.total),
      status: s.status as 'Paid' | 'Pending' | 'Overdue',
    }));

    // Add current month's pending invoice dynamically to the frontend list
    const currentMonthStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!invoices.find((inv) => inv.month === currentMonthStr)) {
      invoices.unshift({
        id: 'PENDING',
        month: currentMonthStr,
        messages: totalMessages,
        apiCost: Math.round(geminiCostValue),
        serviceFee,
        metaCost: Math.round(metaCost),
        total: Math.round(totalCost),
        status: 'Pending',
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayUsageObj = dailyUsage.find((d: any) => d.date === todayStr);
    const todayCount = todayUsageObj ? todayUsageObj.count : 0;

    const dailyLimits: Record<string, number> = {
      starter: 100,
      growth: 500,
      pro: 2000,
    };
    const dailyLimit = dailyLimits[plan || 'starter'] || 100;
    
    // Unified cost formula: estimatedDailyCost matches usage billing exactly
    const estimatedDailyCost = todayCount * GEMINI_COST_PER_MESSAGE;
    const burnRatePerHour = lastHourCount * GEMINI_COST_PER_MESSAGE;
    const remainingHours = 24 - new Date().getHours();
    const predictedDailyCost = estimatedDailyCost + (burnRatePerHour * remainingHours);

    // Meta conversation headroom tracking
    let metaLimitTier = client.metaLimitTier || null;
    let metaQualityRating = client.metaQualityRating || null;
    let metaRemaining = null;

    if (client.connectionType === 'cloud_api') {
      const tierMap: Record<string, number> = {
        TIER_250: 250,
        TIER_1K: 1000,
        TIER_10K: 10000,
        TIER_100K: 100000,
        TIER_UNLIMITED: 1000000,
      };
      const limit = tierMap[metaLimitTier || 'TIER_250'] || 250;
      
      const { count: sentToday } = await supabaseAdmin
        .from('broadcast_recipient_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.clientId)
        .gte('sent_at', startOfDay.toISOString())
        .eq('is_new_session', true);

      metaRemaining = Math.max(0, limit - (sentToday || 0));
    }

    // Check Supabase for active usage alerts
    const { data: activeAlerts } = await supabaseAdmin
      .from('usage_alerts')
      .select('*')
      .eq('client_id', client._id)
      .eq('resolved', false);

    const activeTypes = new Set((activeAlerts || []).map((a: any) => a.alert_type));

    const triggerAlert = async (type: string, message: string, currentVal: number, thresholdVal: number) => {
      if (!activeTypes.has(type)) {
        await supabaseAdmin.from('usage_alerts').insert({
          client_id: client._id,
          alert_type: type,
          message,
          current_value: Math.round(currentVal),
          threshold_value: Math.round(thresholdVal),
          resolved: false
        });
      }
    };

    // 1. Check daily message limits
    if (todayCount > dailyLimit) {
      await triggerAlert(
        'critical',
        `Your agent sent ${todayCount} messages today, exceeding your daily limit of ${dailyLimit}.`,
        todayCount,
        dailyLimit
      );
    } else if (todayCount > dailyLimit * 0.8) {
      await triggerAlert(
        'warning',
        `Your agent sent ${todayCount} messages today, approaching your daily limit of ${dailyLimit}.`,
        todayCount,
        dailyLimit
      );
    }

    // 2. Check daily estimated cost and predicted cost alert levels
    if (estimatedDailyCost > 500) {
      await triggerAlert(
        'cost_emergency',
        `EMERGENCY: Daily actual API cost is Rs.${estimatedDailyCost.toFixed(2)}, exceeding limit of Rs.500. Agent paused.`,
        estimatedDailyCost,
        500
      );
      await pauseAgentEmergency(client, sshPrivateKey, todayCount, estimatedDailyCost, serverUser || 'ubuntu');
    } else if (predictedDailyCost > 200) {
      await triggerAlert(
        'cost_critical',
        `CRITICAL WARNING: Predicted daily API cost is Rs.${predictedDailyCost.toFixed(2)} (burn rate Rs.${burnRatePerHour.toFixed(2)}/hr), exceeding threshold of Rs.200.`,
        predictedDailyCost,
        200
      );
    } else if (predictedDailyCost > 50) {
      await triggerAlert(
        'cost_warning',
        `WARNING: Predicted daily API cost is Rs.${predictedDailyCost.toFixed(2)} (burn rate Rs.${burnRatePerHour.toFixed(2)}/hr), exceeding threshold of Rs.50.`,
        predictedDailyCost,
        50
      );
    }

    return NextResponse.json({
      plan: plan || 'starter',
      limit: planLimit,
      usageCount: totalMessages,
      geminiCost: Math.round(geminiCostValue),
      serverCost,
      serviceFee,
      metaCost: Math.round(metaCost),
      totalCost,
      dailyUsage,
      hasOwnKey,
      invoices,
      todayUsage: todayCount,
      estimatedDailyCost: Math.round(estimatedDailyCost),
      predictedDailyCost: Math.round(predictedDailyCost),
      burnRatePerHour: Math.round(burnRatePerHour),
      dailyLimit,
      metaLimitTier,
      metaQualityRating,
      metaRemaining,
    });
  } catch (error: any) {
    console.error('Usage GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = await request.json();
    if (!alertId) {
      return NextResponse.json({ error: 'Missing alertId' }, { status: 400 });
    }

    await supabaseAdmin
      .from('usage_alerts')
      .update({ resolved: true })
      .eq('id', alertId)
      .eq('client_id', client._id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Usage POST API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
