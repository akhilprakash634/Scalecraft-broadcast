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

  console.log('Fetching coupons from Sanity...');
  try {
    const sanityCoupons = await sanity.fetch(`*[_type == "coupon"] {
      _id,
      _createdAt,
      code,
      type,
      value,
      "allowedProductIds": allowedProducts[]._ref,
      maxUses,
      usesCount,
      expiresAt,
      isActive
    }`);

    console.log(`Found ${sanityCoupons.length} coupons in Sanity. Migrating to Supabase...`);

    let successCount = 0;
    let failCount = 0;

    for (const c of sanityCoupons) {
      if (!c.code) {
        console.warn(`Skipping coupon with missing code (id: ${c._id})`);
        failCount++;
        continue;
      }

      const dbCoupon = {
        code: c.code.toUpperCase().trim(),
        type: c.type || 'fixed',
        value: Number(c.value || 0),
        allowed_product_ids: c.allowedProductIds || null,
        max_uses: c.maxUses ? Number(c.maxUses) : null,
        uses_count: Number(c.usesCount || 0),
        expires_at: c.expiresAt || null,
        is_active: c.isActive !== false,
        created_at: c._createdAt || new Date().toISOString()
      };

      const { error } = await supabase
        .from('coupons')
        .upsert(dbCoupon, { onConflict: 'code' });

      if (error) {
        console.error(`Failed to migrate coupon: ${c.code}. Error: ${error.message}`);
        failCount++;
      } else {
        successCount++;
      }
    }

    console.log(`Migration completed: ${successCount} coupons successfully migrated, ${failCount} failures.`);
  } catch (error: any) {
    console.error('Migration crashed:', error.message || error);
    process.exit(1);
  }
}

run();
