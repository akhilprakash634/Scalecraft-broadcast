import { supabaseAdmin } from './supabase';

export interface AgentClient {
  id: string;
  _id: string;
  clientId: string;
  businessName: string;
  ownerName: string;
  whatsappBotNumber: string;
  ownerPhone: string;
  email: string;
  serverIP: string;
  sshPrivateKey: string;
  serverUser: string;
  geminiApiKey: string;
  timezone?: string;
  googleSheetId: string;
  plan: 'starter' | 'growth' | 'pro';
  status: 'active' | 'suspended' | 'pending' | 'installed' | 'provisioning' | 'installing' | 'paid';
  setupDate: string;
  monthlyUsage: number;
  licenseKey: string;
  currentOtp?: string;
  otpExpiresAt?: string;
  portalPassword?: string;
  portalCreatedAt?: string;
  provisioningLogs?: string[];
  installedAt?: string;
  botProtectionEnabled?: boolean;
  botProtectionAppliedAt?: string;
  stage?: string;
  instanceName?: string;
  _createdAt?: string;
  _updatedAt?: string;
  installStartedAt?: string;
  installTriggeredAt?: string | null;
  shopifyStoreUrl?: string;
  shopifyApiKey?: string;
  planType?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  trialReminderSent?: boolean;
  gracePeriodEndsAt?: string;
  agentPausedAt?: string | null;
  cachedStatus?: string;
  statusCheckedAt?: string;
  typeSpecificData?: string;
  autoFollowUpEnabled?: boolean;
  hermesProfile?: string | null;
  sharedServerIp?: string | null;
  connectionType?: 'baileys' | 'cloud_api' | null;
  whatsappPhoneNumberId?: string | null;
  whatsappAccessToken?: string | null;
  whatsappAppSecret?: string | null;
  whatsappWabaId?: string | null;
  whatsappVerifyToken?: string | null;
  intendedConnectionType?: string | null;
  heartbeat_token?: string | null;
  heartbeatToken?: string | null;
  metaLimitTier?: string | null;
  metaQualityRating?: string | null;
  metaLimitExpiresAt?: string | null;
  metaThroughputLimit?: number | null;
  dailyBroadcastLimit?: number | null;
  // Billing / subscription fields
  monthlyAmount?: number;
  nextBillingDate?: string | null;
  lastPaymentAt?: string | null;
  billingStatus?: 'active' | 'overdue' | 'paused_unpaid';
  lastBillingReminderSentAt?: string | null;
  billingReminderCount?: number;
  currentPaymentLinkId?: string | null;
  currentPaymentLinkUrl?: string | null;
  paymentLinkExpiresAt?: string | null;
  setupAmount?: number;
  agentName?: string;
  agent_name?: string;
  description?: string;
  tagline?: string;
  website?: string;
  location?: string;
  workingHours?: string;
  working_hours?: string;
  primaryLanguage?: string;
  primary_language?: string;
  businessType?: string;
  business_type?: string;
  responseStyle?: string;
  response_style?: string;
  responseLength?: string;
  response_length?: string;
  useEmojis?: boolean;
  use_emojis?: boolean;
  collectLeadInfo?: boolean;
  collect_lead_info?: boolean;
  useUrgency?: boolean;
  use_urgency?: boolean;
  handoffNumber?: string;
  handoff_number?: string;
  handoffTriggers?: string;
  handoff_triggers?: string;
  handoffMessage?: string;
  handoff_message?: string;
  specialOffers?: string;
  special_offers?: string;
  advancedInstructions?: string;
  advanced_instructions?: string;
  primaryAudience?: string;
  primary_audience?: string;
  keySellingPoints?: string;
  key_selling_points?: string;
  restrictions?: string;
  competitors?: string;
}

// Find agent client by their bot WhatsApp number
export async function getAgentClientByBotNumber(botNumber: string): Promise<AgentClient | null> {
  try {
    const normalized = botNumber.trim().replace(/\D/g, '');
    const { data, error } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .or(`whatsapp_bot_number.eq.${botNumber},whatsapp_bot_number.eq.${normalized}`)
      .maybeSingle();

    if (error) throw error;
    return mapDbClientToAgentClient(data);
  } catch (error) {
    console.error('Error fetching agent client by bot number:', error);
    return null;
  }
}

// Find agent client by client ID
export async function getAgentClientByClientId(clientId: string): Promise<AgentClient | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (error) throw error;
    return mapDbClientToAgentClient(data);
  } catch (error) {
    console.error('Error fetching agent client by ID:', error);
    return null;
  }
}

// Update OTP on Supabase client record
export async function updateAgentClientOtp(
  clientId: string,
  otp: string,
  expiresAt: Date
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('agent_clients')
      .update({
        current_otp: otp,
        otp_expires_at: expiresAt.toISOString(),
      })
      .eq('id', clientId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating client OTP in Supabase:', error);
    return false;
  }
}

// Clear OTP (security best practice after verification or expiration)
export async function clearAgentClientOtp(clientId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('agent_clients')
      .update({
        current_otp: null,
        otp_expires_at: null,
      })
      .eq('id', clientId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clearing client OTP in Supabase:', error);
    return false;
  }
}

// Get all clients (admin views)
export async function getAllAgentClients(): Promise<AgentClient[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbClientToAgentClient).filter(Boolean) as AgentClient[];
  } catch (error) {
    console.error('Error fetching all agent clients:', error);
    return [];
  }
}

// Find agent client by server IP
export async function getAgentClientByServerIp(ip: string): Promise<AgentClient | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('server_ip', ip)
      .maybeSingle();

    if (error) throw error;
    return mapDbClientToAgentClient(data);
  } catch (error) {
    console.error('Error fetching agent client by server IP:', error);
    return null;
  }
}

// Update status of agent client
export async function updateAgentClientStatus(clientId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('agent_clients')
      .update({ status })
      .eq('id', clientId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating agent client status:', error);
    return false;
  }
}


// Helper to map DB snake_case schema to camelCase AgentClient interface
export function mapDbClientToAgentClient(dbClient: any): AgentClient | null {
  if (!dbClient) return null;

  let sshKey = dbClient.ssh_private_key || '';
  if (!sshKey && dbClient.hermes_profile) {
    const rawKey = process.env.SHARED_SERVER_SSH_KEY || process.env.SCALECRAFT_SSH_PRIVATE_KEY || '';
    if (rawKey.includes('BEGIN')) {
      sshKey = rawKey;
    } else {
      try {
        sshKey = Buffer.from(rawKey, 'base64').toString('utf8');
      } catch {
        sshKey = rawKey;
      }
    }
  }

  let tsd: any = {};
  if (dbClient.type_specific_data) {
    try { tsd = JSON.parse(dbClient.type_specific_data); } catch {}
  }

  return {
    id: dbClient.id,
    _id: dbClient.id,
    clientId: dbClient.id,
    businessName: dbClient.business_name || '',
    ownerName: dbClient.owner_name || '',
    whatsappBotNumber: dbClient.whatsapp_bot_number || '',
    ownerPhone: dbClient.owner_phone || '',
    email: dbClient.email || '',
    serverIP: dbClient.server_ip || '',
    sshPrivateKey: sshKey,
    serverUser: dbClient.server_user || 'ubuntu',
    geminiApiKey: dbClient.gemini_api_key || '',
    timezone: dbClient.timezone || 'UTC',
    googleSheetId: dbClient.google_sheet_id || '',
    plan: dbClient.plan || 'starter',
    status: dbClient.status || 'pending',
    setupDate: dbClient.setup_date || dbClient.created_at || new Date().toISOString(),
    monthlyUsage: dbClient.monthly_usage || 0,
    licenseKey: dbClient.license_key || '',
    currentOtp: dbClient.current_otp || undefined,
    otpExpiresAt: dbClient.otp_expires_at || undefined,
    portalPassword: dbClient.portal_password || undefined,
    portalCreatedAt: dbClient.portal_created_at || undefined,
    provisioningLogs: dbClient.provisioning_logs || [],
    installedAt: dbClient.installed_at || undefined,
    botProtectionEnabled: dbClient.bot_protection_enabled || false,
    botProtectionAppliedAt: dbClient.bot_protection_applied_at || undefined,
    stage: dbClient.stage || 'creating',
    instanceName: dbClient.instance_name || undefined,
    _createdAt: dbClient.created_at || undefined,
    _updatedAt: dbClient.updated_at || undefined,
    installStartedAt: dbClient.install_started_at || undefined,
    installTriggeredAt: dbClient.install_triggered_at || undefined,
    shopifyStoreUrl: dbClient.shopify_store_url || undefined,
    shopifyApiKey: dbClient.shopify_api_key || undefined,
    planType: dbClient.plan_type || 'standard',
    trialStartedAt: dbClient.trial_started_at || undefined,
    trialEndsAt: dbClient.trial_ends_at || undefined,
    trialReminderSent: dbClient.trial_reminder_sent || false,
    gracePeriodEndsAt: dbClient.grace_period_ends_at || undefined,
    agentPausedAt: dbClient.agent_paused_at || null,
    cachedStatus: dbClient.cached_status || 'unknown',
    statusCheckedAt: dbClient.status_checked_at || undefined,
    typeSpecificData: dbClient.type_specific_data || '',
    agentName: dbClient.agent_name || dbClient.agentName || '',
    agent_name: dbClient.agent_name || dbClient.agentName || '',
    description: dbClient.description !== undefined && dbClient.description !== null ? dbClient.description : '',
    tagline: dbClient.tagline || '',
    website: dbClient.website || '',
    location: dbClient.location || '',
    workingHours: dbClient.working_hours || dbClient.workingHours || '',
    working_hours: dbClient.working_hours || dbClient.workingHours || '',
    primaryLanguage: dbClient.primary_language || dbClient.primaryLanguage || '',
    primary_language: dbClient.primary_language || dbClient.primaryLanguage || '',
    businessType: dbClient.business_type || dbClient.businessType || '',
    business_type: dbClient.business_type || dbClient.businessType || '',
    responseStyle: dbClient.response_style || dbClient.responseStyle || '',
    response_style: dbClient.response_style || dbClient.responseStyle || '',
    responseLength: dbClient.response_length || dbClient.responseLength || '',
    response_length: dbClient.response_length || dbClient.responseLength || '',
    useEmojis: dbClient.use_emojis !== undefined ? dbClient.use_emojis : dbClient.useEmojis,
    use_emojis: dbClient.use_emojis !== undefined ? dbClient.use_emojis : dbClient.useEmojis,
    collectLeadInfo: dbClient.collect_lead_info !== undefined ? dbClient.collect_lead_info : dbClient.collectLeadInfo,
    collect_lead_info: dbClient.collect_lead_info !== undefined ? dbClient.collect_lead_info : dbClient.collectLeadInfo,
    useUrgency: dbClient.use_urgency !== undefined ? dbClient.use_urgency : dbClient.useUrgency,
    use_urgency: dbClient.use_urgency !== undefined ? dbClient.use_urgency : dbClient.useUrgency,
    handoffNumber: dbClient.handoff_number || dbClient.handoffNumber || '',
    handoff_number: dbClient.handoff_number || dbClient.handoffNumber || '',
    handoffTriggers: dbClient.handoff_triggers || dbClient.handoffTriggers || '',
    handoff_triggers: dbClient.handoff_triggers || dbClient.handoffTriggers || '',
    handoffMessage: dbClient.handoff_message || dbClient.handoffMessage || '',
    handoff_message: dbClient.handoff_message || dbClient.handoffMessage || '',
    specialOffers: dbClient.special_offers || dbClient.specialOffers || '',
    special_offers: dbClient.special_offers || dbClient.specialOffers || '',
    advancedInstructions: dbClient.advanced_instructions || dbClient.advancedInstructions || '',
    advanced_instructions: dbClient.advanced_instructions || dbClient.advancedInstructions || '',
    primaryAudience: dbClient.primary_audience || dbClient.primaryAudience || '',
    primary_audience: dbClient.primary_audience || dbClient.primaryAudience || '',
    keySellingPoints: dbClient.key_selling_points || dbClient.keySellingPoints || '',
    key_selling_points: dbClient.key_selling_points || dbClient.keySellingPoints || '',
    restrictions: dbClient.restrictions || '',
    competitors: dbClient.competitors || '',
    hermesProfile: dbClient.hermes_profile || null,
    sharedServerIp: dbClient.shared_server_ip || null,
    connectionType: 'cloud_api',
    whatsappPhoneNumberId: dbClient.whatsapp_phone_number_id || tsd.whatsapp_phone_number_id || null,
    whatsappAccessToken: dbClient.whatsapp_access_token || tsd.whatsapp_access_token || null,
    whatsappAppSecret: dbClient.whatsapp_app_secret || tsd.whatsapp_app_secret || null,
    whatsappWabaId: dbClient.whatsapp_waba_id || tsd.whatsapp_waba_id || null,
    whatsappVerifyToken: dbClient.whatsapp_verify_token || tsd.whatsapp_verify_token || null,
    intendedConnectionType: dbClient.intended_connection_type || tsd.intended_connection_type || null,
    heartbeat_token: dbClient.heartbeat_token || null,
    heartbeatToken: dbClient.heartbeat_token || null,
    metaLimitTier: dbClient.meta_limit_tier || tsd.meta_limit_tier || null,
    metaQualityRating: dbClient.meta_quality_rating || tsd.meta_quality_rating || null,
    metaLimitExpiresAt: dbClient.meta_limit_expires_at || tsd.meta_limit_expires_at || null,
    metaThroughputLimit: dbClient.meta_throughput_limit || 80,
    dailyBroadcastLimit: dbClient.daily_broadcast_limit ?? null,
    // Billing
    monthlyAmount: dbClient.monthly_amount ?? 1299,
    nextBillingDate: dbClient.next_billing_date || null,
    lastPaymentAt: dbClient.last_payment_at || null,
    billingStatus: dbClient.billing_status || 'active',
    lastBillingReminderSentAt: dbClient.last_billing_reminder_sent_at || null,
    billingReminderCount: dbClient.billing_reminder_count ?? 0,
    currentPaymentLinkId: dbClient.current_payment_link_id || null,
    currentPaymentLinkUrl: dbClient.current_payment_link_url || null,
    paymentLinkExpiresAt: dbClient.payment_link_expires_at || null,
    setupAmount: dbClient.setup_amount ?? 6999,
    autoFollowUpEnabled: (() => {
      if (dbClient.type_specific_data) {
        try {
          const tsd = JSON.parse(dbClient.type_specific_data);
          if (tsd.autoFollowUpEnabled !== undefined) {
            return tsd.autoFollowUpEnabled;
          }
        } catch {}
      }
      return true;
    })(),
  };
}
