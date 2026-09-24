// ONE-TIME MIGRATION SCRIPT - DO NOT RUN AGAIN
// Orders and coupons already migrated to Supabase
// This script is kept for reference only

import fs from 'fs';
import path from 'path';
import { createClient as createSanityClient } from '@sanity/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Load Environment Variables
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env.development.local'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env.production.local'),
    path.resolve(process.cwd(), '.env')
  ];

  let loaded = false;
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.substring(0, firstEqual).trim();
            const val = trimmed.substring(firstEqual + 1).replace(/^['"]|['"]$/g, '').trim();
            process.env[key] = val;
          }
        }
      });
      console.log(`Loaded environment from ${envPath}`);
      loaded = true;
      break;
    }
  }
  if (!loaded) {
    console.warn('No .env file found in default locations. Proceeding with system environment variables.');
  }
}

async function run() {
  loadEnv();

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '73xk02vb';
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  const apiVersion = '2024-05-14';
  const sanityToken = process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_TOKEN;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const sanity = createSanityClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: sanityToken
  });

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

  console.log('Fetching orders from Sanity...');
  try {
    const sanityOrders = await sanity.fetch(`*[_type == "order"] {
      _id,
      _createdAt,
      _updatedAt,
      customerName,
      customerEmail,
      customerPhone,
      productId,
      productName,
      productSlug,
      amount,
      currency,
      originalPrice,
      couponCode,
      discountAmount,
      status,
      notionUrl,
      accessSent,
      accessSentAt,
      licenseKey,
      paymentId,
      orderId,
      razorpayWebhookData
    }`);

    console.log(`Found ${sanityOrders.length} orders in Sanity. Migrating to Supabase...`);

    let successCount = 0;
    let failCount = 0;

    for (const o of sanityOrders) {
      // customer_email and sanity_product_id are NOT NULL in Supabase schema
      const customerEmail = o.customerEmail || 'unknown@example.com';
      const sanityProductId = o.productId || 'unknown';
      // order_id is UNIQUE NOT NULL in Supabase schema
      const orderId = o.orderId || o.paymentId || `sanity_${o._id}`;

      const dbOrder = {
        order_id: orderId,
        payment_id: o.paymentId || null,
        customer_name: o.customerName || null,
        customer_email: customerEmail,
        customer_phone: o.customerPhone || null,
        sanity_product_id: sanityProductId,
        product_name: o.productName || null,
        product_slug: o.productSlug || null,
        amount: Number(o.amount || 0),
        currency: o.currency || 'INR',
        original_price: o.originalPrice ? Number(o.originalPrice) : null,
        coupon_code: o.couponCode || null,
        discount_amount: o.discountAmount ? Number(o.discountAmount) : 0,
        status: o.status || 'completed',
        notion_url: o.notionUrl || null,
        access_sent: o.accessSent || false,
        access_sent_at: o.accessSentAt || null,
        license_key: o.licenseKey || null,
        razorpay_webhook_data: o.razorpayWebhookData || null,
        created_at: o.createdAt || o._createdAt || new Date().toISOString(),
        updated_at: o.updatedAt || o._updatedAt || new Date().toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .upsert(dbOrder, { onConflict: 'order_id' });

      if (error) {
        console.error(`Failed to migrate order: ${orderId}. Error: ${error.message}`);
        failCount++;
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`Migrated ${successCount} orders...`);
        }
      }
    }

    console.log(`Migration completed: ${successCount} orders successfully migrated, ${failCount} failures.`);
  } catch (error: any) {
    console.error('Migration crashed:', error.message || error);
    process.exit(1);
  }
}

run();
