import { randomUUID } from 'crypto';
import { supabaseAdmin as supabase } from './supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── AGENT CLIENTS ────────────────────────────

export async function getClientById(id: string) {
  const { data, error } = await supabase
    .from('agent_clients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getClientByEmail(email: string) {
  const { data, error } = await supabase
    .from('agent_clients')
    .select('*')
    .eq('email', email)
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(id: string, fields: Record<string, any>) {
  const { data, error } = await supabase
    .from('agent_clients')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllClients() {
  const { data, error } = await supabase
    .from('agent_clients')
    .select(`
      id, email, business_name, agent_name,
      business_type, plan, setup_paid,
      monthly_active, created_at, updated_at,
      server_ip, whatsapp_bot_number
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── ORDERS ───────────────────────────────────

export async function createOrder(order: {
  order_id: string;
  payment_id?: string;
  customer_name?: string;
  customer_email: string;
  customer_phone?: string;
  sanity_product_id: string;
  product_name?: string;
  product_slug?: string;
  amount: number;
  currency?: string;
  original_price?: number;
  coupon_code?: string;
  discount_amount?: number;
  notion_url?: string;
  license_key?: string;
  status?: string;
  city?: string;
  country_code?: string;
  razorpay_webhook_data?: any;
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrder(orderId: string, fields: Record<string, any>) {
  const { data, error } = await supabase
    .from('orders')
    .update(fields)
    .eq('order_id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOrderByRazorpayId(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .single();
  if (error) return null;
  return data;
}

export async function getOrdersByEmail(email: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_email', email)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllOrders(limit = 100) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ─── COUPONS ──────────────────────────────────

export async function getCouponByCode(code: string) {
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single();
  return data || null;
}

export async function validateCoupon(
  code: string,
  sanityProductId: string,
  originalPrice: number,
  currency: string = 'INR'
) {
  try {
    let coupon = await getCouponByCode(code);
    let isOfferCampaign = false;
    let offerCampaign: any = null;

    if (!coupon) {
      // Fallback: search for active offer campaign with this coupon code
      const { data: dbOffer } = await supabase
        .from('offers')
        .select('*')
        .eq('active', true)
        .eq('coupon_code', code.toUpperCase().trim())
        .maybeSingle();

      if (dbOffer) {
        const now = new Date();
        const start = dbOffer.start_date ? new Date(dbOffer.start_date) : null;
        const end = dbOffer.end_date ? new Date(dbOffer.end_date) : null;
        
        if ((!start || start <= now) && (!end || end >= now)) {
          isOfferCampaign = true;
          offerCampaign = dbOffer;
        }
      }
    }

    if (!coupon && !isOfferCampaign) {
      return { valid: false, error: 'Invalid coupon code' };
    }

    if (coupon) {
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { valid: false, error: 'Coupon has expired' };
      }
      if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
        return { valid: false, error: 'Coupon limit reached' };
      }
      if (
        coupon.allowed_product_ids?.length > 0 &&
        !coupon.allowed_product_ids.includes(sanityProductId)
      ) {
        return { valid: false, error: 'Coupon not valid for this product' };
      }

      // Compute discount amounts
      let discount = 0;
      if (coupon.type === 'percent' || coupon.type === 'percentage') {
        discount = Math.round((originalPrice * coupon.value) / 100);
      } else {
        const isUSD = (currency || 'INR').toUpperCase() === 'USD';
        let value = coupon.value;
        if (isUSD) {
          value = Math.max(1, Math.round(value / 83));
        }
        discount = Math.min(value, originalPrice);
      }
      const discountedPrice = Math.max(0, originalPrice - discount);

      return {
        valid: true,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
        discountedPrice,
        originalPrice,
      };
    } else {
      // It's a valid offer campaign coupon code!
      if (
        offerCampaign.products_included &&
        offerCampaign.products_included.length > 0 &&
        !offerCampaign.products_included.includes(sanityProductId)
      ) {
        return { valid: false, error: 'Coupon not valid for this product' };
      }

      let discount = 0;
      let type = 'fixed';
      let value = offerCampaign.discount_value;
      
      if (value < 0) {
        type = 'percent';
        value = Math.abs(value);
        discount = Math.round((originalPrice * value) / 100);
      } else {
        discount = Math.min(value, originalPrice);
      }
      
      const discountedPrice = Math.max(0, originalPrice - discount);

      return {
        valid: true,
        code: offerCampaign.coupon_code.toUpperCase().trim(),
        type,
        value,
        discount,
        discountedPrice,
        originalPrice,
      };
    }
  } catch (err: any) {
    console.error('validateCoupon error:', err);
    return { valid: false, error: 'Invalid coupon code' };
  }
}

export async function incrementCouponUse(code: string) {
  await supabase.rpc('increment_coupon_uses', {
    coupon_code: code.toUpperCase()
  });
}

export async function getAllCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCoupon(coupon: {
  code: string;
  type: string;
  value: number;
  allowed_product_ids?: string[];
  max_uses?: number;
  expires_at?: string;
}) {
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      ...coupon,
      code: coupon.code.toUpperCase().trim(),
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleCoupon(id: string, is_active: boolean) {
  const { data, error } = await supabase
    .from('coupons')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── PRODUCTS ─────────────────────────────────

export async function getProducts(clientId: string) {
  if (!clientId) throw new Error('clientId is required for getProducts');

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price) || 0,
    url: p.url || '',
    image: p.image_url || '',
    image_url: p.image_url || '',
    images: p.images || (p.image_url ? [p.image_url] : []),
    content: p.features || '',
    features: p.features || '',
    demo_url: p.demo_url || '',
    demo_type: p.demo_type || 'Video',
    support_notes: p.support_notes || '',
    not_included: p.not_included || '',
    active: p.active ?? true,
    sort_order: p.sort_order ?? 0,
  }));
}

export async function upsertProduct(clientId: string, product: any) {
  if (!clientId) throw new Error('clientId is required for upsertProduct');

  const isUuid = product.id && UUID_REGEX.test(product.id);
  if (isUuid) {
    // Check ownership to ensure client cannot modify another client's product
    const { data: existing, error: checkError } = await supabase
      .from('products')
      .select('client_id')
      .eq('id', product.id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing && existing.client_id !== clientId) {
      throw new Error('Unauthorized: Product belongs to another client.');
    }
  }

  const payload = {
    id: isUuid ? product.id : randomUUID(),
    client_id: clientId,
    name: product.name,
    description: product.description || '',
    price: Number(product.price) || 0,
    url: product.url || '',
    image_url: product.images?.[0] || product.image_url || product.image || '',
    images: product.images || [],
    features: product.features || product.content || '',
    demo_url: product.demo_url || '',
    demo_type: product.demo_type || 'Video',
    support_notes: product.support_notes || '',
    not_included: product.not_included || '',
    active: product.active ?? true,
    sort_order: product.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  } as any;

  const { data, error } = await supabase
    .from('products')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(clientId: string, productId: string) {
  if (!clientId) throw new Error('clientId is required for deleteProduct');
  if (!productId) throw new Error('productId is required for deleteProduct');
  if (!UUID_REGEX.test(productId)) return; // not in DB

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('client_id', clientId)
    .eq('id', productId);

  if (error) throw error;
}

export async function bulkUpsertProducts(clientId: string, products: any[]) {
  if (!clientId) throw new Error('clientId is required for bulkUpsertProducts');
  if (!products || products.length === 0) return [];

  // Check ownership for any incoming products with valid UUID ids
  const incomingIds = products.map((p: any) => p.id).filter(id => id && UUID_REGEX.test(id));
  if (incomingIds.length > 0) {
    const { data: existingList, error: checkError } = await supabase
      .from('products')
      .select('id, client_id')
      .in('id', incomingIds);

    if (checkError) throw checkError;

    if (existingList && existingList.length > 0) {
      for (const item of existingList) {
        if (item.client_id !== clientId) {
          throw new Error(`Unauthorized: Product ${item.id} belongs to another client.`);
        }
      }
    }
  }

  const payloads = products.map((p: any, index: number) => ({
    id: p.id && UUID_REGEX.test(p.id) ? p.id : randomUUID(),
    client_id: clientId,
    name: p.name,
    description: p.description || '',
    price: Number(p.price) || 0,
    url: p.url || '',
    image_url: p.images?.[0] || p.image_url || p.image || '',
    images: p.images || [],
    features: p.features || p.content || '',
    demo_url: p.demo_url || '',
    demo_type: p.demo_type || 'Video',
    support_notes: p.support_notes || '',
    not_included: p.not_included || '',
    active: p.active ?? true,
    sort_order: p.sort_order ?? index,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('products')
    .upsert(payloads)
    .select();

  if (error) throw error;
  return data || [];
}

