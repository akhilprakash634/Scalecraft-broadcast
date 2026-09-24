const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
// Force load the .env from the same directory as index.js and override existing env vars
require('dotenv').config({
  path: path.join(__dirname, '.env'),
  override: true
});

const isProd = process.env.NODE_ENV === 'production';

// Load env files in priority order based on the environment
if (isProd) {
  require('dotenv').config({
    path: path.join(__dirname, '..', '.env.production.local'),
    override: false
  });
  require('dotenv').config({
    path: path.join(__dirname, '..', '.env.local'),
    override: false
  });
  require('dotenv').config({
    path: path.join(__dirname, '..', '.env.production'),
    override: false
  });
} else {
  require('dotenv').config({
    path: path.join(__dirname, '..', '.env.development.local'),
    override: false
  });
  require('dotenv').config({
    path: path.join(__dirname, '..', '.env.local'),
    override: false
  });
  require('dotenv').config({
    path: path.join(__dirname, '..', '.env.development'),
    override: false
  });
}

const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role'
);
console.log('\x1b[32m✓ Supabase client initialized\x1b[0m');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const BUYERS_FILE = path.join(DATA_DIR, 'authorized_emails.json');


const getSalesCount = () => {
  try {
    const data = fs.readFileSync(SALES_FILE, 'utf8');
    return JSON.parse(data).count;
  } catch (error) {
    return 6;
  }
};

const incrementSalesCount = () => {
  try {
    const count = getSalesCount();
    fs.writeFileSync(SALES_FILE, JSON.stringify({ count: count + 1 }));
    return count + 1;
  } catch (error) {
    console.error('Error updating sales count:', error);
  }
};

const getBuyers = () => {
  try {
    const data = fs.readFileSync(BUYERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const addBuyer = (email, name, paymentId = null, productId = null) => {
  try {
    const buyers = getBuyers();
    const normalized = email.toLowerCase().trim();
    const already = buyers.find(b => {
      if (paymentId && b.paymentId === paymentId) return true;
      if (!paymentId && b.email === normalized) return true;
      return false;
    });
    if (!already) {
      buyers.push({
        email: normalized,
        name,
        paymentId,
        productId,
        purchasedAt: new Date().toISOString()
      });
      fs.writeFileSync(BUYERS_FILE, JSON.stringify(buyers, null, 2));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving buyer:', error);
    return false;
  }
};

const generateLicenseKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randStr = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SCA-${randStr(5)}-${randStr(5)}`;
};

const fetchAndValidateCoupon = async (code, productId, originalPrice = 0, currency = 'INR') => {
  if (!code) return { valid: false, error: 'Coupon code required' };
  
  const normalizedCode = code.trim().toUpperCase();
  
  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();
      
    if (error) throw error;
    
    if (!coupon) {
      return { valid: false, error: 'Invalid coupon code' };
    }
    
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, error: 'Coupon expired' };
    }
    
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }
    
    // Check minimum amount restriction
    if (coupon.min_amount && originalPrice < Number(coupon.min_amount)) {
      return { valid: false, error: `Minimum order amount of ₹${coupon.min_amount} required to use this coupon` };
    }
    
    // Fetch product details if category restrictions exist
    let productData = null;
    if (
      (coupon.allowed_categories && coupon.allowed_categories.length > 0) || 
      (coupon.allowed_product_ids && coupon.allowed_product_ids.length > 0)
    ) {
      const { data } = await supabase
        .from('saas_products')
        .select('id, category_id, categories:categories(slug)')
        .eq('id', productId)
        .maybeSingle();
      productData = data;
    }

    // Check product restrictions
    if (coupon.allowed_product_ids && coupon.allowed_product_ids.length > 0) {
      const isAllowed = coupon.allowed_product_ids.includes(productId);
      if (!isAllowed) {
        return { valid: false, error: 'This coupon is not valid for this product' };
      }
    }

    // Check category restrictions
    if (coupon.allowed_categories && coupon.allowed_categories.length > 0) {
      const categorySlug = productData?.categories?.slug || productData?.category_id || '';
      const isCategoryAllowed = coupon.allowed_categories.includes(categorySlug);
      if (!isCategoryAllowed) {
        return { valid: false, error: 'This coupon is not valid for this category of products' };
      }
    }
    
    return { valid: true, coupon };
  } catch (error) {
    console.error('Error fetching/validating coupon from Supabase:', error.message);
    return { valid: false, error: 'Internal validation error' };
  }
};

const LOCAL_PRODUCTS_FALLBACK = {
  "freelance-client-pipeline-blueprint": {
    priceINR: 999,
    originalPriceINR: 1999,
    priceUSD: 12,
    originalPriceUSD: 24,
  },
  "ai-lead-finder-system": {
    priceINR: 499,
    originalPriceINR: 999,
    priceUSD: 6,
    originalPriceUSD: 12,
  },
  "ai-systems-combo": {
    priceINR: 1299,
    originalPriceINR: 2999,
    priceUSD: 16,
    originalPriceUSD: 36,
  }
};

const getNormalizedSlug = (slug) => {
  if (!slug) return "ai-systems-combo";
  const s = slug.toLowerCase();
  if (s.includes('blueprint') || s.includes('pipeline')) {
    return 'freelance-client-pipeline-blueprint';
  } else if (s.includes('lead-finder')) {
    return 'ai-lead-finder-system';
  }
  return 'ai-systems-combo';
};

const calculateDiscount = (coupon, originalPrice, currency = 'INR') => {
  const isUSD = (currency || 'INR').toUpperCase() === 'USD';
  if (coupon.type === 'percentage' || coupon.type === 'percent') {
    return Math.round((originalPrice * coupon.value) / 100);
  } else if (coupon.type === 'fixed') {
    let value = coupon.value;
    if (isUSD) {
      value = Math.max(1, Math.round(value / 83));
    }
    return Math.min(value, originalPrice);
  }
  return 0;
};



const requestLogs = [];
const logRequest = (method, path, status, duration) => {
  requestLogs.push({
    timestamp: new Date().toISOString(),
    method,
    path,
    status,
    duration
  });
  if (requestLogs.length > 30) {
    requestLogs.shift();
  }
};

const app = express();
app.use(express.json());
app.use(cors()); // Allow all origins for testing and unblock localhost/production mix

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}[${new Date().toISOString()}] ${req.method} ${req.path} → ${status} (${duration}ms)\x1b[0m`);
    logRequest(req.method, req.path, status, duration);
  });
  next();
});

let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.error('\x1b[31mError: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in .env\x1b[0m');
}

// Configure Nodemailer Transporter for Zoho
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.in',
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  requireTLS: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});


const sendConfirmationEmail = async (email, name, productId, passedLicenseKey, extraData = {}) => {
  if (!process.env.SMTP_PASSWORD) {
    console.log('Skipping email send: SMTP_PASSWORD not configured in .env');
    return;
  }

  try {
    let productData = null;
    try {
      const { data: pData } = await supabase
        .from('saas_products')
        .select('id, name, is_combo, combo_product_ids, section_visibility, product_type')
        .or(`id.eq.${productId},slug.eq.${productId}`)
        .maybeSingle();

      if (pData) {
        const secVis = pData.section_visibility || {};
        let mainLink = secVis.notion_url || secVis.url || '';

        if (!mainLink) {
          const { data: dlData } = await supabase
            .from('product_downloads')
            .select('url')
            .eq('product_id', pData.id)
            .limit(1)
            .maybeSingle();
          if (dlData?.url) mainLink = dlData.url;
        }

        let comboProducts = null;
        if (pData.is_combo && pData.combo_product_ids && pData.combo_product_ids.length > 0) {
          const { data: subProducts } = await supabase
            .from('saas_products')
            .select('id, name, section_visibility')
            .in('id', pData.combo_product_ids);
          
          if (subProducts) {
            comboProducts = subProducts.map(sp => {
              const spSecVis = sp.section_visibility || {};
              return {
                title: sp.name,
                downloadLink: spSecVis.notion_url || spSecVis.url || ''
              };
            });
          }
        }
        
        productData = {
          title: pData.name,
          downloadLink: mainLink,
          isCombo: pData.is_combo,
          comboProducts
        };
      }
    } catch (fetchError) {
      console.error('Error fetching product from Supabase for email, using fallback:', fetchError.message);
    }

    // Fallbacks to guarantee email delivery even if API is down
    const fallbacks = {
      'mOBd3I07NrgTLn79T01oEq': {
        title: 'ScaleCraft Agent',
        downloadLink: 'https://thescalecraft.in/scalecraft-agent/guide'
      },
      '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c': {
        title: 'ScaleCraft Agent Complete Setup',
        downloadLink: 'https://thescalecraft.in/scalecraft-agent/guide'
      },
      'scalecraft-agent-saas': {
        title: 'ScaleCraft Agent — Managed SaaS',
        downloadLink: 'https://thescalecraft.in/dashboard'
      },
      '23fed2de-5b67-44e7-afca-a84709fa5bf0': {
        title: 'AI Systems Combo (Client Pipeline + Lead Finder)',
        isCombo: true,
        comboProducts: [
          { title: 'Freelance Client Pipeline Blueprint', downloadLink: 'https://organized-waxflower-31a.notion.site/AI-Client-Acquisition-System-35cbc5d9cf5c81b6957ff9e7d3680848' },
          { title: 'AI Lead Finder System', downloadLink: 'https://organized-waxflower-31a.notion.site/AI-Lead-Finder-System-365bc5d9cf5c81519499f9c8c95c5df0?source=copy_link' }
        ]
      },
      '107d9692-842f-4580-9d86-a22f730f6770': {
        title: 'Freelance Client Pipeline Blueprint',
        downloadLink: 'https://organized-waxflower-31a.notion.site/AI-Client-Acquisition-System-35cbc5d9cf5c81b6957ff9e7d3680848'
      },
      'e2c434f6-c3eb-44a2-b7fe-aae11bbf2e1a': {
        title: 'AI Lead Finder System',
        downloadLink: 'https://organized-waxflower-31a.notion.site/AI-Lead-Finder-System-365bc5d9cf5c81519499f9c8c95c5df0?source=copy_link'
      },
      'lead-pipeline-crm': {
        title: 'Lead Pipeline CRM',
        downloadLink: 'https://organized-waxflower-31a.notion.site/Lead-Pipeline-CRM-3a2bc5d9cf5c813aa491c1e8c4f8eaef?source=copy_link'
      },
      'ceo-daily-command-center': {
        title: 'CEO Daily Command Center',
        downloadLink: 'https://organized-waxflower-31a.notion.site/CEO-Daily-Command-Center-3a2bc5d9cf5c81869d42eb2d7f401e23?source=copy_link'
      },
      'client-onboarding-system': {
        title: 'Client Onboarding System',
        downloadLink: 'https://organized-waxflower-31a.notion.site/Client-Onboarding-System-3a2bc5d9cf5c816d961cee8bcd70361d?source=copy_link'
      },
      'sop-process-library': {
        title: 'SOP & Process Library',
        downloadLink: 'https://organized-waxflower-31a.notion.site/SOP-Process-Library-3a2bc5d9cf5c818dabace48232e37b43?source=copy_link'
      },
      'never-lose-a-lead-crm': {
        title: 'Never Lose a Lead CRM',
        downloadLink: 'https://organized-waxflower-31a.notion.site/Never-Lose-a-Lead-CRM-3a2bc5d9cf5c81c6b853db16dc0ae260?source=copy_link'
      }
    };

    if (!productData && fallbacks[productId]) {
      productData = fallbacks[productId];
    }

    const passedLink = extraData?.notionUrl || extraData?.notion_url || extraData?.download_url || extraData?.downloadUrl || extraData?.url || extraData?.resource_url || extraData?.resourceUrl;
    if (passedLink) {
      if (!productData) {
        productData = {
          title: extraData.productName || extraData.product_name || 'ScaleCraft Digital Product',
          downloadLink: passedLink
        };
      } else if (!productData.downloadLink) {
        productData.downloadLink = passedLink;
      }
    }

    if (!productData) {
      productData = {
        title: extraData?.productName || 'ScaleCraft Digital Product',
        downloadLink: 'https://thescalecraft.in'
      };
    }

    // Custom email for ScaleCraft Agent
    const isSaaS = productId === 'scalecraft-agent-saas';
    const isScaleCraftAgent = productId === 'mOBd3I07NrgTLn79T01oEq' || productId === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' || isSaaS || (productData && (productData.title === 'ScaleCraft Agent' || productData.title === 'ScaleCraft Agent Complete Setup' || productData.title === 'ScaleCraft Agent — Managed SaaS'));
    if (isScaleCraftAgent) {
      const isInstallation = productId === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' || (productData && productData.title === 'ScaleCraft Agent Complete Setup');
      const firstName = name ? name.split(' ')[0] : 'Grower';
      let licenseKey = passedLicenseKey;
      if (!licenseKey) {
        try {
          const { data: order } = await supabase
            .from('orders')
            .select('license_key')
            .eq('customer_email', email.toLowerCase().trim())
            .eq('sanity_product_id', productId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          licenseKey = (order && order.license_key) ? order.license_key : generateLicenseKey();
        } catch (err) {
          console.error('Error fetching license for email:', err);
          licenseKey = generateLicenseKey();
        }
      }

      const mailOptions = {
        from: `"ScaleCraft" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: isSaaS ? "Your ScaleCraft Agent is being provisioned - Start here" : "Your ScaleCraft Agent is ready - Start here",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSaaS ? 'Your ScaleCraft SaaS Agent is Provisioning' : 'Your ScaleCraft Agent is Ready'} - ScaleCraft</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;800;900&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;800;900&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F7F5;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F7F5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F7F7F5; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #EBEBEB; border-radius: 20px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02); overflow: hidden; padding: 48px 36px; text-align: left;">
          
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding-bottom: 36px; border-bottom: 1px solid #EBEBEB; text-align: center;">
              <h1 style="margin: 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 26px; font-weight: 900; color: #111110; letter-spacing: -0.5px; text-transform: uppercase;">
                ScaleCraft<span style="color: #0055FF;">.</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; color: #6F6E69; text-transform: uppercase; letter-spacing: 0.1em;">
                Premium Systems & Workspaces
              </p>
            </td>
          </tr>

          <!-- Welcome & Greeting -->
          <tr>
            <td style="padding-top: 36px; padding-bottom: 24px;">
              <h2 style="margin: 0 0 16px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 24px; font-weight: 800; color: #111110; letter-spacing: -0.3px;">
                ${isSaaS 
                  ? `Your Managed SaaS Agent is being provisioned, ${firstName}! 🤖`
                  : `Your ScaleCraft Agent is ready, ${firstName}! 🤖`}
              </h2>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #1C1C1A;">
                ${isSaaS
                  ? 'Thank you for choosing the <strong>ScaleCraft Agent - Managed SaaS Plan</strong>. We host, install, and manage everything for you on a dedicated VPS server in Mumbai. For your reference, your license key and login details are below:'
                  : (isInstallation 
                    ? 'Thank you for choosing the <strong>Complete Setup package</strong>. Our team will handle the server setup and installation for you. You will receive a WhatsApp message from us shortly to begin. For your reference, your license key and setup files are below:'
                    : 'Your ScaleCraft Agent is ready! Follow the steps below to generate and run your custom bot:')}
              </p>
            </td>
          </tr>

          ${isSaaS ? `
          <!-- SaaS Provisioning Block -->
          <tr>
            <td style="padding-top: 10px; padding-bottom: 20px;">
              <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 16px; padding: 24px;">
                <h3 style="margin: 0 0 8px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 15px; font-weight: 800; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.05em;">
                  🚀 SaaS Auto-Provisioning Active
                </h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1E3A8A;">
                  Our automated systems are provisioning your dedicated VPS in the Mumbai region, setting up the database, and preparing the ScaleCraft Agent. Your dashboard credentials will be active in 10-15 minutes. We will send you a WhatsApp confirmation as soon as it's live!
                </p>
              </div>
            </td>
          </tr>
          ` : (isInstallation ? `
          <!-- DFY Installation Block -->
          <tr>
            <td style="padding-top: 10px; padding-bottom: 20px;">
              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 16px; padding: 24px;">
                <h3 style="margin: 0 0 8px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 15px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.05em;">
                  🛠️ Done-For-You Installation Active
                </h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #065F46;">
                  Our setup engineers will configure your VPS, pair your WhatsApp number, and fine-tune your agent. We will reach out on WhatsApp within 2-4 hours. You can safely ignore the command line instructions below.
                </p>
              </div>
            </td>
          </tr>
          ` : '')}

          <!-- Setup Instructions Box -->
          <tr>
            <td style="background-color: #F7F7F5; border: 1px solid #EBEBEB; border-radius: 16px; padding: 28px; margin-bottom: 24px;">
              <div style="border-top: 2px solid #EBEBEB; border-bottom: 2px solid #EBEBEB; padding: 20px 0; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 800; color: #111110; letter-spacing: 0.05em; text-transform: uppercase;">
                  🔑 YOUR LICENSE KEY
                </p>
                <div style="font-family: monospace; font-size: 22px; font-weight: 900; color: #0055FF; letter-spacing: 1.5px; margin: 10px 0;">
                  ${licenseKey}
                </div>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6F6E69;">
                  Keep this safe - it's pre-filled in your guide link below.
                </p>
              </div>

              <div style="margin-top: 24px;">
                ${isSaaS ? `
                <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.03em;">
                  STEP 1 - Wait for Provisioning (~10 mins)
                </p>
                <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #6F6E69;">
                  Our deployment engine is configuring your VPS, installing the database, and allocating an IP address. You don't need to touch any command line or code.
                </p>

                <p style="margin: 16px 0 6px 0; font-size: 13px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.03em;">
                  STEP 2 - Pair your WhatsApp Bot Number
                </p>
                <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #6F6E69;">
                  Once provisioning is complete, we will send you a WhatsApp text with a link. Click it to pair your WhatsApp Bot Number (${extraData.botPhone || 'your registered bot number'}) by scanning the QR code with your phone.
                </p>

                <p style="margin: 16px 0 6px 0; font-size: 13px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.03em;">
                  STEP 3 - Login to your ScaleCraft Dashboard
                </p>
                <p style="margin: 0 0 12px 0; font-size: 14px;">
                  <a href="https://thescalecraft.in/dashboard" target="_blank" style="color: #0055FF; font-weight: 700; text-decoration: underline;">
                    https://thescalecraft.in/dashboard
                  </a>
                </p>
                <div style="background-color: #F3F4F6; border: 1px dashed #D1D5DB; border-radius: 12px; padding: 16px; margin: 15px 0;">
                  <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #1F2937;">🔑 YOUR DASHBOARD CREDENTIALS:</p>
                  <p style="margin: 0 0 6px 0; font-size: 13px; color: #4B5563;">
                    <strong>Username (Bot Phone):</strong> ${extraData.botPhone || 'your registered bot number'}
                  </p>
                  <p style="margin: 0 0 6px 0; font-size: 13px; color: #4B5563;">
                    <strong>Password:</strong> <span style="font-family: monospace; font-size: 14px; font-weight: bold; color: #0055FF; background: #E0E7FF; padding: 2px 6px; border-radius: 4px;">${extraData.password || 'Temporary password'}</span>
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #6B7280; font-style: italic;">
                    Please keep this password safe. You can update it under your profile inside the dashboard.
                  </p>
                </div>
                <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #6F6E69;">
                  Log in using your registered bot number to view analytics, manage customer lead CRMs, sync to Google Sheets, change agent prompt system prompts, and check server metrics.
                </p>
                ` : `
                <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.03em;">
                  STEP 1 - Open your setup guide:
                </p>
                <p style="margin: 0 0 12px 0; font-size: 14px;">
                  <a href="https://thescalecraft.in/scalecraft-agent/guide?key=${licenseKey}" target="_blank" style="color: #0055FF; font-weight: 700; text-decoration: underline;">
                    https://thescalecraft.in/scalecraft-agent/guide?key=${licenseKey}
                  </a>
                </p>
                <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #6F6E69;">
                  Your license key is pre-filled. Just fill in your business details and copy the generated command.
                </p>

                <p style="margin: 16px 0 6px 0; font-size: 13px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.03em;">
                  STEP 2 - Run the generated command on your server:
                </p>
                <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #6F6E69;">
                  The guide generates a complete one-line command with all your details pre-filled.
                </p>

                <p style="margin: 16px 0 6px 0; font-size: 13px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.03em;">
                  STEP 3 - Connect WhatsApp:
                </p>
                <p style="margin: 0 0 8px 0; font-size: 13.5px; line-height: 1.5; color: #6F6E69;">
                  After the installer completes, run:
                </p>
                <div style="background-color: #111110; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12.5px; color: #34D399; margin-bottom: 8px; word-break: break-all;">
                  source ~/.bashrc<br/>echo "N" | hermes whatsapp
                </div>
                <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.5; color: #6F6E69;">
                  (Scan the QR code with your bot phone)
                </p>

                <p style="margin: 16px 0 6px 0; font-size: 13px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.03em;">
                  STEP 4 - Start your agent:
                </p>
                <div style="background-color: #111110; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12.5px; color: #34D399; margin-bottom: 20px;">
                  hermes gateway restart
                </div>

                <p style="margin: 16px 0 6px 0; font-size: 13px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.03em;">
                  STEP 5 - Test:
                </p>
                <p style="margin: 0 0 16px 0; font-size: 13.5px; line-height: 1.5; color: #6F6E69;">
                  Send "Hi" to your bot number from any phone!
                </p>
                `}

                <p style="margin: 20px 0 0 0; font-size: 13px; color: #6F6E69;">
                  Need help? WhatsApp: <strong>+91 80780 04732</strong>
                </p>
              </div>
            </td>
          </tr>

          <!-- Support & Help -->
          <tr>
            <td style="padding-top: 24px; padding-bottom: 24px;">
              <div style="background-color: #FFFFFF; border: 1px solid #EBEBEB; border-radius: 16px; padding: 24px;">
                <h3 style="margin: 0 0 10px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 15px; font-weight: 800; color: #0055FF; text-transform: uppercase; letter-spacing: 0.05em;">
                  Founder Support Included
                </h3>
                <p style="margin: 0 0 16px 0; font-size: 13.5px; line-height: 1.6; color: #6F6E69;">
                  Stuck during installation, setting up your Gemini API key, or pairing your device? You have direct chat support on WhatsApp:
                </p>
                <table border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius: 8px; background-color: #25D366; padding: 12px 20px; text-align: center;">
                      <a href="https://wa.me/918078004732" target="_blank" style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; text-transform: uppercase; letter-spacing: 0.03em;">💬 WhatsApp Support</a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Standard Footer -->
          <tr>
            <td align="center" style="padding-top: 32px; border-top: 1px solid #EBEBEB; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12.5px; line-height: 1.6; color: #6F6E69;">
                Need additional help? Simply reply directly to this email or reach us at <a href="mailto:sales@growyourbusiness.today" style="color: #0055FF; text-decoration: none;">sales@growyourbusiness.today</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 11px; font-weight: 700; color: #AEACA5; text-transform: uppercase; letter-spacing: 0.05em;">
                &copy; ${new Date().getFullYear()} ScaleCraft. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      };
      await transporter.sendMail(mailOptions);
      console.log(`Confirmation email sent to ${email} for ScaleCraft Agent 🤖`);
      return;
    }

    const firstName = name ? name.split(' ')[0] : 'Learner';

    let accessBoxesHtml = '';
    let setupInstructionsHtml = '';

    if (productData.isCombo && productData.comboProducts && productData.comboProducts.length > 0) {
      let buttonsHtml = '';
      let hasNotion = false;
      productData.comboProducts.forEach((subProd, idx) => {
        const link = subProd.downloadLink || '';
        const isNotionLink = link.includes('notion');
        if (isNotionLink) hasNotion = true;
        const btnText = isNotionLink ? '⚡ DUPLICATE NOTION SYSTEM' : '📥 DOWNLOAD RESOURCES';

        buttonsHtml += `
          <div style="margin-bottom: ${idx === productData.comboProducts.length - 1 ? '0' : '20px'}; padding-bottom: ${idx === productData.comboProducts.length - 1 ? '0' : '20px'}; border-bottom: ${idx === productData.comboProducts.length - 1 ? 'none' : '1px solid #EBEBEB'};">
            <h4 style="margin: 0 0 6px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 14px; font-weight: 800; color: #111110;">
              ${subProd.title}
            </h4>
            <p style="margin: 0 0 12px 0; font-size: 12.5px; line-height: 1.5; color: #6F6E69;">
              Click below to duplicate this system to your workspace:
            </p>
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 12px; background-color: #0055FF;">
                  <a href="${link}" target="_blank" style="display: inline-block; padding: 10px 20px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${btnText}
                  </a>
                </td>
              </tr>
            </table>
          </div>
        `;
      });

      accessBoxesHtml = `
        <tr>
          <td style="background-color: #F7F7F5; border: 1px solid #EBEBEB; border-radius: 16px; padding: 28px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 15px; font-weight: 800; color: #0055FF; text-transform: uppercase; letter-spacing: 0.05em;">
              1. Instantly Access Your Products
            </h3>
            ${buttonsHtml}
          </td>
        </tr>
      `;

      if (hasNotion) {
        setupInstructionsHtml = `
          <tr>
            <td style="padding-top: 24px;">
              <div style="background-color: #FFFFFF; border: 1px solid #EBEBEB; border-radius: 16px; padding: 24px;">
                <h3 style="margin: 0 0 12px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 15px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.05em;">
                  2. Quick Setup Guide
                </h3>
                <ol style="margin: 0; padding-left: 20px; font-size: 13.5px; line-height: 1.6; color: #1C1C1A;">
                  <li style="margin-bottom: 8px;">Sign in to your account at <a href="https://notion.so" target="_blank" style="color: #0055FF; text-decoration: underline; font-weight: 600;">notion.so</a>.</li>
                  <li style="margin-bottom: 8px;">Click the <strong>Duplicate Notion System</strong> buttons above for each system to open the templates.</li>
                  <li style="margin-bottom: 0;">For each template, click the "Duplicate" option in the top-right menu bar to copy it into your private workspace.</li>
                </ol>
              </div>
            </td>
          </tr>
        `;
      }
    } else {
      const link = productData.downloadLink || '';
      const isNotionLink = link.includes('notion');
      const btnText = isNotionLink ? '⚡ DUPLICATE NOTION SYSTEM' : '📥 DOWNLOAD RESOURCES';

      accessBoxesHtml = `
        <tr>
          <td style="background-color: #F7F7F5; border: 1px solid #EBEBEB; border-radius: 16px; padding: 28px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 10px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 15px; font-weight: 800; color: #0055FF; text-transform: uppercase; letter-spacing: 0.05em;">
              1. Instantly Access Your Product
            </h3>
            <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.6; color: #6F6E69;">
              Your secure link to duplicate or download your workspace resource is active:
            </p>
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 12px; background-color: #0055FF;">
                  <a href="${link}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${btnText}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;

      if (isNotionLink) {
        setupInstructionsHtml = `
          <tr>
            <td style="padding-top: 24px;">
              <div style="background-color: #FFFFFF; border: 1px solid #EBEBEB; border-radius: 16px; padding: 24px;">
                <h3 style="margin: 0 0 12px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 15px; font-weight: 800; color: #111110; text-transform: uppercase; letter-spacing: 0.05em;">
                  2. Quick Setup Guide
                </h3>
                <ol style="margin: 0; padding-left: 20px; font-size: 13.5px; line-height: 1.6; color: #1C1C1A;">
                  <li style="margin-bottom: 8px;">Sign in to your account at <a href="https://notion.so" target="_blank" style="color: #0055FF; text-decoration: underline; font-weight: 600;">notion.so</a>.</li>
                  <li style="margin-bottom: 8px;">Click the <strong>Duplicate Notion System</strong> button above to open the template.</li>
                  <li style="margin-bottom: 0;">Click the "Duplicate" option in the top-right menu bar to copy it straight into your private workspace.</li>
                </ol>
              </div>
            </td>
          </tr>
        `;
      }
    }

    const mailOptions = {
      from: `"ScaleCraft" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `Your access key to ${productData.title} is ready! 🔑`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Access is Ready - ScaleCraft</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;800;900&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;800;900&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F7F5;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F7F5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F7F7F5; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #EBEBEB; border-radius: 20px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02); overflow: hidden; padding: 48px 36px; text-align: left;">
          
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding-bottom: 36px; border-bottom: 1px solid #EBEBEB; text-align: center;">
              <h1 style="margin: 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 26px; font-weight: 900; color: #111110; letter-spacing: -0.5px; text-transform: uppercase;">
                ScaleCraft<span style="color: #0055FF;">.</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; color: #6F6E69; text-transform: uppercase; letter-spacing: 0.1em;">
                Premium Systems & Workspaces
              </p>
            </td>
          </tr>

          <!-- Welcome & Greeting -->
          <tr>
            <td style="padding-top: 36px; padding-bottom: 24px;">
              <h2 style="margin: 0 0 16px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 24px; font-weight: 800; color: #111110; letter-spacing: -0.3px;">
                Welcome aboard, ${firstName}! 👋
              </h2>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #1C1C1A;">
                Thank you for choosing <strong>${productData.title}</strong>. Your payment has been securely verified, and your premium workspace access is active. Let's get you set up and scaling immediately.
              </p>
            </td>
          </tr>

          ${accessBoxesHtml}

          ${setupInstructionsHtml}

          <!-- Community Channels -->
          <tr>
            <td style="padding-top: 24px; padding-bottom: 24px;">
              <div style="background-color: #FFFFFF; border: 1px solid #EBEBEB; border-radius: 16px; padding: 24px;">
                <h3 style="margin: 0 0 10px 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 15px; font-weight: 800; color: #0055FF; text-transform: uppercase; letter-spacing: 0.05em;">
                  Join the ScaleCraft Network
                </h3>
                <p style="margin: 0 0 16px 0; font-size: 13.5px; line-height: 1.6; color: #6F6E69;">
                  Connect with fellow creators, ask questions, and receive instant ecosystem updates:
                </p>
                <table border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius: 8px; background-color: #111110; padding: 10px 18px; text-align: center;">
                      <a href="https://chat.whatsapp.com/Hnv1hJpBYZcA7LvUPnBV6D" target="_blank" style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; color: #FFFFFF; text-decoration: none; text-transform: uppercase; letter-spacing: 0.03em;">WhatsApp Group</a>
                    </td>
                    <td style="width: 12px;"></td>
                    <td style="border-radius: 8px; background-color: #F7F7F5; border: 1px solid #EBEBEB; padding: 10px 18px; text-align: center;">
                      <a href="https://t.me/+nU7ZzIXV_dkyNTJl" target="_blank" style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; color: #111110; text-decoration: none; text-transform: uppercase; letter-spacing: 0.03em;">Telegram Channel</a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- WhatsApp Live Help Footer -->
          <tr>
            <td align="center" style="padding-top: 24px; border-top: 1px solid #EBEBEB; text-align: center;">
              <p style="margin: 0; font-size: 12.5px; line-height: 1.6; color: #6F6E69;">
                Need help duplicating or configuring your system? Message us on <a href="https://wa.me/918078004732" target="_blank" style="color: #0055FF; text-decoration: none; font-weight: 700;">WhatsApp (+91 80780 04732)</a> or reply directly to this email!
              </p>
            </td>
          </tr>

          <!-- Standard Footer -->
          <tr>
            <td align="center" style="padding-top: 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; font-weight: 700; color: #AEACA5; text-transform: uppercase; letter-spacing: 0.05em;">
                &copy; ${new Date().getFullYear()} ScaleCraft. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${email} for product ${productData.title}`);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
};

const syncOrderToSanity = async (orderData, reqOrigin = null) => {
  try {
    const { email, name, product_id, razorpay_payment_id, razorpay_order_id, licenseKey, couponCode, currency = 'INR' } = orderData;

    // Fetch product details to get correct price and name from Supabase
    const { data: dbProduct } = await supabase
      .from('saas_products')
      .select('id, name, price, international_price, slug, section_visibility')
      .or(`id.eq.${product_id},slug.eq.${product_id}`)
      .maybeSingle();

    const secVis = dbProduct?.section_visibility || {};
    const productData = dbProduct ? {
      name: dbProduct.name,
      price: Number(dbProduct.price),
      internationalPrice: Number(dbProduct.international_price),
      slug: dbProduct.slug,
      notionUrl: secVis.notion_url || secVis.url || ''
    } : null;

    const isUSD = (currency || 'INR').toUpperCase() === 'USD';
    const normSlug = getNormalizedSlug(productData?.slug);
    const fallback = LOCAL_PRODUCTS_FALLBACK[normSlug];
    
    let originalBasePrice = 0;
    if (isUSD) {
      if (productData?.internationalPrice && productData.internationalPrice > 0) {
        originalBasePrice = productData.internationalPrice;
      } else if (fallback && fallback.priceUSD) {
        originalBasePrice = fallback.priceUSD;
      } else if (productData?.price) {
        originalBasePrice = Math.round(productData.price / 83);
      }
    } else {
      if (productData?.price && productData.price > 0) {
        originalBasePrice = productData.price;
      } else if (fallback && fallback.priceINR) {
        originalBasePrice = fallback.priceINR;
      }
    }
    if (!originalBasePrice) {
      originalBasePrice = isUSD ? 16 : 1299; // safety fallback
    }

    // Determine correct amount
    let basePrice = originalBasePrice;
    let discountAmount = 0;
    if (couponCode) {
      const validation = await fetchAndValidateCoupon(couponCode, product_id, basePrice, currency);
      if (validation.valid) {
        discountAmount = calculateDiscount(validation.coupon, basePrice, currency);
        basePrice = Math.max(0, basePrice - discountAmount);
      }
    }
    const amount = orderData.amount ? (orderData.amount / 100) : basePrice;

    let finalOrderId = razorpay_order_id;
    if (!finalOrderId || finalOrderId === 'manual_register' || finalOrderId === 'auto_register') {
      const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      finalOrderId = `${finalOrderId || 'register'}_${suffix}`;
    }

    const frontendUrl = process.env.FRONTEND_URL || reqOrigin || process.env.NEXT_PUBLIC_SITE_URL || 'https://thescalecraft.in';
    const syncUrl = `${frontendUrl}/api/admin/sync-order`;
    
    console.log(`[Order Sync] Sending order to Next.js API: ${syncUrl}`);
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET || ''
      },
      body: JSON.stringify({
        order_id: finalOrderId,
        payment_id: razorpay_payment_id,
        customer_name: name || 'Learner',
        customer_email: email.toLowerCase().trim(),
        sanity_product_id: product_id,
        product_name: productData?.name || 'ScaleCraft Product',
        product_slug: productData?.slug || 'scalecraft-product',
        amount: Number(amount),
        currency: (currency || 'INR').toUpperCase(),
        original_price: originalBasePrice,
        coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
        discount_amount: discountAmount,
        status: 'completed',
        notion_url: productData?.notionUrl || null,
        license_key: licenseKey || null
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Next.js order sync returned status ${response.status}: ${errText}`);
    }

    const resData = await response.json();
    const createdOrder = resData.order;

    const symbol = isUSD ? '$' : '₹';
    console.log(`Order synced to Supabase via Next.js API for ${email} (Payment ID: ${razorpay_payment_id}, Amount: ${symbol}${amount})`);

    return createdOrder;
  } catch (error) {
    console.error('Error syncing order to Supabase:', error.message);
    return null;
  }
};

// Health check & Operational Dashboard
app.get('/', async (req, res) => {
  const salesCount = getSalesCount();
  const buyersList = getBuyers();
  const buyersCount = buyersList.length;

  let productMap = {};
  try {
    const { data: dbProducts } = await supabase.from('saas_products').select('id, name');
    const products = (dbProducts || []).map(p => ({ _id: p.id, name: p.name }));
    if (products && Array.isArray(products)) {
      products.forEach(p => {
        if (p._id && p.name) {
          productMap[p._id] = p.name;
        }
      });
    }
  } catch (error) {
    console.error('Error fetching products for dashboard:', error);
  }

  const maskString = (str, visibleStart = 6, visibleEnd = 4) => {
    if (!str) return '<span style="color: #EF4444; font-weight: 700;">NOT LOADED</span>';
    if (str.length <= visibleStart + visibleEnd) return '***';
    return str.substring(0, visibleStart) + '...' + str.substring(str.length - visibleEnd);
  };

  const supabaseUrlStatus = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded (' + maskString(process.env.NEXT_PUBLIC_SUPABASE_URL, 12, 5) + ')' : '<span style="color: #EF4444; font-weight: 700;">MISSING</span>';
  const supabaseKeyStatus = process.env.SUPABASE_SERVICE_ROLE_KEY ? '<span style="color: #10B981; font-weight: 700;">ACTIVE (LOADED)</span>' : '<span style="color: #EF4444; font-weight: 700;">MISSING</span>';
  const rzpKeyIdStatus = process.env.RAZORPAY_KEY_ID ? 'Loaded (' + maskString(process.env.RAZORPAY_KEY_ID, 8, 4) + ')' : '<span style="color: #EF4444; font-weight: 700;">MISSING</span>';
  const rzpSecretStatus = process.env.RAZORPAY_KEY_SECRET ? 'Loaded (' + maskString(process.env.RAZORPAY_KEY_SECRET, 4, 3) + ')' : '<span style="color: #EF4444; font-weight: 700;">MISSING</span>';

  // Render recent buyers html
  let buyersHtml = '';
  if (buyersList.length === 0) {
    buyersHtml = '<div class="empty-state">No buyers registered in current database cache</div>';
  } else {
    // Show last 10 buyers in reverse chronological order
    const recentBuyers = [...buyersList].reverse().slice(0, 10);
    buyersHtml = recentBuyers.map(b => {
      const productName = productMap[b.productId] || b.productId || 'Unknown Product';
      return `
        <div class="buyer-item">
          <div class="buyer-info">
            <span class="buyer-name">${b.name || 'Learner'}</span>
            <span class="buyer-email">${b.email}</span>
            <span class="buyer-product" style="font-size: 11px; font-weight: 600; color: var(--accent); margin-top: 4px; display: inline-block;">🏷️ ${productName}</span>
          </div>
          <span class="buyer-date">${new Date(b.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `;
    }).join('');
  }

  // Render log lines html
  let logsHtml = '';
  if (requestLogs.length === 0) {
    logsHtml = '<div style="color: #555; font-style: italic; padding: 12px 0;">Console listening for incoming requests...</div>';
  } else {
    logsHtml = [...requestLogs].reverse().map(l => {
      const statusClass = l.status >= 500 ? 'error' : l.status >= 400 ? 'warn' : 'success';
      const timeStr = new Date(l.timestamp).toLocaleTimeString('en-US', { hour12: false });
      return `
        <div class="log-line">
          <span class="log-time">[${timeStr}]</span>
          <span class="log-method ${l.method}">${l.method}</span>
          <span class="log-path">${l.path}</span>
          <span class="log-status ${statusClass}">${l.status}</span>
          <span class="log-duration">${l.duration}ms</span>
        </div>
      `;
    }).join('');
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ScaleCraft · Operations Center</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #FFFFFF;
      --bg2: #F7F7F5;
      --bg3: #F0EFEB;
      --dark: #111110;
      --dark2: #1C1C1A;
      --mid: #6F6E69;
      --light: #AEACA5;
      --accent: #0055FF;
      --green: #059669;
      --green-bg: #ECFDF5;
      --border: #EBEBEB;
      --border2: #D9D9D9;
      --font-h: 'Outfit', sans-serif;
      --font-b: 'Inter', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg2); color: var(--dark); font-family: var(--font-b); -webkit-font-smoothing: antialiased; padding: 40px 20px; }
    .container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    
    /* HEADER */
    .header {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-mark {
      width: 36px;
      height: 36px;
      background: var(--dark);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-mark svg { width: 18px; height: 18px; fill: white; }
    .brand-text h1 { font-family: var(--font-h); font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .brand-text p { font-size: 11px; color: var(--mid); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--green-bg);
      color: var(--green);
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      background: var(--green);
      border-radius: 50%;
      animation: blink 2s infinite;
    }
    @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.3} }
    
    /* STATS GRID */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .stat-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label { font-size: 11px; color: var(--mid); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .stat-val { font-family: var(--font-h); font-size: 32px; font-weight: 900; letter-spacing: -0.5px; color: var(--dark); margin-top: 4px; }
    .stat-sub { font-size: 11px; color: var(--light); display: flex; align-items: center; gap: 4px; }
    
    /* DASHBOARD CONTENT */
    .dashboard-layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; }
    @media (max-width: 900px) {
      .dashboard-layout { grid-template-columns: 1fr; }
    }
    
    .panel {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .panel-title { font-family: var(--font-h); font-size: 16px; font-weight: 800; letter-spacing: -0.3px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    
    /* ENV TABLE */
    .env-table { width: 100%; border-collapse: collapse; }
    .env-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 13px; align-items: center; }
    .env-row:last-child { border-bottom: none; }
    .env-key { font-weight: 500; color: var(--mid); }
    .env-val { font-family: monospace; font-weight: 600; color: var(--dark2); background: var(--bg2); padding: 3px 8px; border-radius: 6px; font-size: 12px; border: 1px solid var(--border); }
    
    /* BUYERS LIST */
    .buyers-list { display: flex; flex-direction: column; gap: 10px; max-height: 380px; overflow-y: auto; }
    .buyer-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 13px;
    }
    .buyer-info { display: flex; flex-direction: column; gap: 2px; }
    .buyer-name { font-weight: 700; color: var(--dark); }
    .buyer-email { color: var(--mid); font-size: 12px; }
    .buyer-date { font-size: 11px; color: var(--light); }
    
    /* CONSOLE */
    .console-panel { background: #0A0A0A !important; border-color: #1F1F1F !important; color: #E5E5E5; }
    .console-title { color: #FFFFFF; border-bottom-color: #1F1F1F; }
    .console-logs {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 12px;
      line-height: 1.6;
      background: #020202;
      border: 1px solid #1A1A1A;
      border-radius: 10px;
      padding: 16px;
      min-height: 220px;
      max-height: 320px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .log-line { display: flex; gap: 8px; font-weight: 400; align-items: center; }
    .log-time { color: #555; font-size: 11px; flex-shrink: 0; }
    .log-method { font-weight: 700; flex-shrink: 0; padding: 1px 5px; border-radius: 4px; font-size: 10px; text-transform: uppercase; }
    .log-method.GET { color: #2563EB; background: rgba(37,99,235,0.1); }
    .log-method.POST { color: #059669; background: rgba(5,150,105,0.1); }
    .log-path { color: #A3A3A3; word-break: break-all; }
    .log-status { font-weight: 700; flex-shrink: 0; margin-left: auto; font-size: 11px; }
    .log-status.success { color: #10B981; }
    .log-status.warn { color: #F59E0B; }
    .log-status.error { color: #EF4444; }
    .log-duration { color: #666; font-size: 11px; flex-shrink: 0; width: 55px; text-align: right; }
    
    .empty-state { text-align: center; color: var(--light); padding: 32px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="brand">
        <div class="logo-mark">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
        <div class="brand-text">
          <h1>ScaleCraft Operations</h1>
          <p>Live Payment Gateway System</p>
        </div>
      </div>
      <div class="status-badge">
        <div class="live-dot"></div>
        ACTIVE & OPERATIONAL
      </div>
    </div>

    <!-- STATS GRID -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Platform Gateway Status</span>
        <span class="stat-val" style="color: var(--green);">OPERATIONAL</span>
        <span class="stat-sub">HTTP Port ${PORT} · SSL Secured</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Dynamic Sales Count</span>
        <span class="stat-val">${salesCount}</span>
        <span class="stat-sub">Incrementing Dynamically</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Authorized Buyers Tally</span>
        <span class="stat-val">${buyersCount}</span>
        <span class="stat-sub">Unique Registered Emails</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Zoho SMTP Mail Status</span>
        <span class="stat-val" style="font-size: 16px; color: ${process.env.SMTP_PASSWORD ? 'var(--green)' : 'var(--mid)'}; margin-top: 14px; font-weight: 800;">
          ${process.env.SMTP_PASSWORD ? 'ACTIVE & CONNECTED' : 'SIMULATION MODE'}
        </span>
        <span class="stat-sub">Port ${process.env.SMTP_PORT || '465'} · Auto-Delivery ready</span>
      </div>
    </div>

    <!-- MAIN PANELS -->
    <div class="dashboard-layout">
      <!-- SYSTEM & BUYERS -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div class="panel">
          <div class="panel-title">System Environment Parameters</div>
          <table class="env-table">
            <tr class="env-row">
              <td class="env-key">Supabase Project URL</td>
              <td class="env-val">${supabaseUrlStatus}</td>
            </tr>
            <tr class="env-row">
              <td class="env-key">Supabase Auth Key Status</td>
              <td class="env-val">${supabaseKeyStatus}</td>
            </tr>
            <tr class="env-row">
              <td class="env-key">Razorpay Key ID</td>
              <td class="env-val">${rzpKeyIdStatus}</td>
            </tr>
            <tr class="env-row">
              <td class="env-key">Razorpay Secret Status</td>
              <td class="env-val">${rzpSecretStatus}</td>
            </tr>
            <tr class="env-row">
              <td class="env-key">SMTP Transporter Host</td>
              <td class="env-val">${process.env.SMTP_HOST || 'smtp.zoho.in'}</td>
            </tr>
            <tr class="env-row">
              <td class="env-key">Outgoing Server Email</td>
              <td class="env-val">${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}</td>
            </tr>
          </table>
        </div>

        <div class="panel">
          <div class="panel-title">Recent Registered Purchases (Last 10)</div>
          <div class="buyers-list">
            ${buyersHtml}
          </div>
        </div>
      </div>

      <!-- LIVE TERMINAL CONSOLE -->
      <div class="panel console-panel">
        <div class="panel-title console-title">
          Live Diagnostic API Traces
          <span style="font-family: monospace; font-size: 11px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: 500;">
            IN-MEMORY LOGGER
          </span>
        </div>
        <div class="console-logs">
          ${logsHtml}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// Get sales count
app.get('/api/sales-count', (req, res) => {
  res.json({ count: getSalesCount() });
});

// Validate coupon code
app.post('/api/validate-coupon', async (req, res) => {
  try {
    const { code, productId, currency = 'INR' } = req.body;

    if (!code || !productId) {
      return res.status(400).json({ valid: false, error: 'Coupon code and Product ID are required' });
    }

    // Fetch product details from Supabase to get current price
    const { data: dbProduct } = await supabase
      .from('saas_products')
      .select('name, price, international_price, slug')
      .eq('id', productId)
      .maybeSingle();

    const productData = dbProduct ? {
      name: dbProduct.name,
      price: Number(dbProduct.price),
      internationalPrice: Number(dbProduct.international_price),
      slug: dbProduct.slug
    } : null;

    if (!productData || (!productData.price && !productData.internationalPrice)) {
      return res.status(400).json({ valid: false, error: 'Product not found or has no price defined' });
    }

    const isUSD = (currency || 'INR').toUpperCase() === 'USD';
    const normSlug = getNormalizedSlug(productData.slug);
    const fallback = LOCAL_PRODUCTS_FALLBACK[normSlug];
    let originalPrice = 0;
    if (isUSD) {
      originalPrice = productData.internationalPrice || (fallback ? fallback.priceUSD : 0) || Math.round(productData.price / 83);
    } else {
      originalPrice = productData.price || (fallback ? fallback.priceINR : 0);
    }
    
    // Call dynamic coupon validation helper
    const validation = await fetchAndValidateCoupon(code, productId, originalPrice, currency);
    if (!validation.valid) {
      return res.status(400).json({ valid: false, error: validation.error });
    }

    const discount = calculateDiscount(validation.coupon, originalPrice, currency);
    const discountedPrice = Math.max(0, originalPrice - discount);

    res.json({
      valid: true,
      code: validation.coupon.code,
      discount,
      discountedPrice,
      originalPrice,
      type: validation.coupon.type,
      value: validation.coupon.value
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ valid: false, error: 'Internal Server Error' });
  }
});

// Create order - accepts name + email for prefill and later storage
app.post('/api/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ error: 'Payment gateway not initialized. Check server logs.' });
    }
    const { amount, currency = 'INR', receipt = 'receipt_' + Date.now(), name, email, productId, couponCode } = req.body;

    let finalAmount = amount;
    let originalPrice = 0;
    let discountAmount = 0;
    let productName = '';
    let productSlug = '';
    let notionUrl = '';

    // Securely calculate amount if productId is provided (prevent client tampering)
    if (productId) {
      const { data: dbProduct } = await supabase
        .from('saas_products')
        .select('id, name, price, international_price, slug, notion_url')
        .eq('id', productId)
        .maybeSingle();

      const productData = dbProduct ? {
        _id: dbProduct.id,
        name: dbProduct.name,
        price: Number(dbProduct.price),
        internationalPrice: Number(dbProduct.international_price),
        slug: dbProduct.slug,
        notionUrl: dbProduct.notion_url
      } : null;

      if (productData) {
        productName = productData.name || '';
        productSlug = productData.slug || '';
        notionUrl = productData.notionUrl || '';

        const isUSD = (currency || 'INR').toUpperCase() === 'USD';
        const normSlug = getNormalizedSlug(productSlug);
        const fallback = LOCAL_PRODUCTS_FALLBACK[normSlug];

        let basePrice = 0;
        if (isUSD) {
          if (productData.internationalPrice && productData.internationalPrice > 0) {
            basePrice = productData.internationalPrice;
          } else if (fallback && fallback.priceUSD) {
            basePrice = fallback.priceUSD;
          } else if (productData.price) {
            basePrice = Math.round(productData.price / 83);
          }
        } else {
          if (productData.price && productData.price > 0) {
            basePrice = productData.price;
          } else if (fallback && fallback.priceINR) {
            basePrice = fallback.priceINR;
          }
        }

        if (basePrice > 0) {
          originalPrice = basePrice;
          let price = basePrice;
          if (productId === 'scalecraft-agent-saas' && (req.body.plan_type === 'trial' || req.body.planType === 'trial')) {
            price = 2;
            originalPrice = 2;
          } else if (couponCode) {
            const validation = await fetchAndValidateCoupon(couponCode, productId, price, currency);
            if (validation.valid) {
              discountAmount = calculateDiscount(validation.coupon, price, currency);
              price = Math.max(0, price - discountAmount);
            }
          }
          finalAmount = Math.round(price * 100); // convert to cents (USD) or paise (INR)
        }
      }
    }

    if (!finalAmount || finalAmount < 100) {
      return res.status(400).json({ error: 'Amount must be at least 100 paise/cents ($1/₹1)' });
    }

    let bizName = req.body.businessName || req.body.business_name || '';
    let bPhone = req.body.botPhone || req.body.bot_phone || '';
    let oPhone = req.body.ownerPhone || req.body.owner_phone || '';
    let gemKey = req.body.geminiApiKey || req.body.gemini_api_key || '';
    let cId = req.body.clientId || req.body.client_id || '';
    let pType = req.body.plan_type || req.body.planType || '';

    // If it is the SaaS product, resolve configuration from the database by email
    if (productId === 'scalecraft-agent-saas' && email) {
      try {
        const { data: dbClient } = await supabase
          .from('agent_clients')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (dbClient) {
          bizName = bizName || dbClient.business_name || '';
          bPhone = bPhone || dbClient.whatsapp_bot_number || '';
          oPhone = oPhone || dbClient.owner_phone || '';
          gemKey = gemKey || dbClient.gemini_api_key || '';
          cId = cId || dbClient.id || '';
          pType = pType || dbClient.plan_type || '';
        }
      } catch (dbErr) {
        console.error('Error resolving client details in create-order:', dbErr.message);
      }
    }

    const options = {
      amount: parseInt(finalAmount),
      currency,
      receipt,
      notes: {
        buyer_name: name || '',
        buyer_email: email || '',
        coupon_code: couponCode ? couponCode.trim().toUpperCase() : '',
        business_name: bizName,
        bot_phone: bPhone,
        owner_phone: oPhone,
        gemini_api_key: gemKey,
        productId: productId || '',
        productName: productName,
        productSlug: productSlug,
        originalPrice: originalPrice ? String(originalPrice) : '0',
        discountAmount: discountAmount ? String(discountAmount) : '0',
        notionUrl: notionUrl,
        clientId: cId,
        plan_type: pType
      },
    };

    console.log('Creating Razorpay order with options:', JSON.stringify(options, null, 2));
    const order = await razorpay.orders.create(options);
    res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Helper to generate a random 8-character password with letters and numbers
function generatePassword() {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = letters + numbers;
  
  let pass = '';
  // Ensure we have at least one letter and one number
  pass += letters[Math.floor(Math.random() * letters.length)];
  pass += numbers[Math.floor(Math.random() * numbers.length)];
  
  for (let i = 2; i < 8; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle characters
  return pass.split('').sort(() => 0.5 - Math.random()).join('');
}

// Helper for automated SaaS provisioning + notifications
const handleSaaSOnboarding = async (body, licenseKey, origin) => {
  try {
    const email = (body.buyer_email || body.email || '').toLowerCase().trim();
    
    // Look up existing client in Supabase by email to resolve missing details (e.g. when called from register-purchase)
    const { data: existingClient } = await supabase
      .from('agent_clients')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const name = body.buyer_name || body.buyerName || body.name || existingClient?.owner_name || 'SaaS Owner';
    const businessName = body.businessName || body.buyer_business_name || body.business_name || existingClient?.business_name || 'SaaS Client';
    const botPhone = (body.botPhone || body.buyer_bot_phone || body.bot_phone || existingClient?.whatsapp_bot_number || '').replace(/\D/g, '');
    const ownerPhone = (body.ownerPhone || body.buyer_owner_phone || body.owner_phone || existingClient?.owner_phone || '').replace(/\D/g, '');
    const geminiApiKey = body.geminiApiKey || body.buyer_gemini_key || body.gemini_api_key || existingClient?.gemini_api_key || '';
    const paymentId = body.razorpay_payment_id || body.payment_id || 'manual';

    console.log(`[SaaS Onboarding] Processing success for ${email} / Bot Phone: ${botPhone}`);

    // Generate credentials
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 1. Search for existing client or create new in Supabase agent_clients
    const cleanBotPhone = botPhone.replace(/\D/g, '');
    let createdRecord;
    if (existingClient) {
      console.log(`[SaaS Onboarding] Client account already exists: ${existingClient.id}. Updating credentials and status.`);
      const { data: updatedClient, error } = await supabase
        .from('agent_clients')
        .update({
          status: 'paid',
          portal_password: hashedPassword,
          portal_created_at: new Date().toISOString(),
          business_name: existingClient.business_name || businessName,
          owner_name: existingClient.owner_name || name,
          owner_phone: existingClient.owner_phone || ownerPhone,
          gemini_api_key: existingClient.gemini_api_key || geminiApiKey,
          license_key: existingClient.license_key || licenseKey,
        })
        .eq('id', existingClient.id)
        .select()
        .single();

      if (error) throw error;
      createdRecord = updatedClient;
    } else {
      const clientId = `client_${Date.now()}`;
      const newClientDoc = {
        id: clientId,
        email: email,
        whatsapp_bot_number: cleanBotPhone,
        owner_phone: ownerPhone,
        owner_name: name,
        business_name: businessName,
        gemini_api_key: geminiApiKey,
        plan: 'saas',
        status: 'paid',
        server_user: 'ubuntu',
        license_key: licenseKey,
        portal_password: hashedPassword,
        portal_created_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stage: 'pending'
      };

      const { data: insertedClient, error } = await supabase
        .from('agent_clients')
        .insert(newClientDoc)
        .select()
        .single();

      if (error) throw error;
      createdRecord = insertedClient;
      console.log(`[SaaS Onboarding] Created new agent_clients record in Supabase: ${createdRecord.id}`);
    }

    // 2. Automatically call /api/admin/provision with the client details
    const frontendUrl = origin || 'https://thescalecraft.in';
    const provisionUrl = `${frontendUrl}/api/admin/provision`;
    console.log(`[SaaS Onboarding] Automatically calling provision API: ${provisionUrl}`);

    // Fire-and-forget provision API call in the background
    // Pass sanityDocumentId so the provision API doesn't create a duplicate record
    fetch(provisionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET
      },
      body: JSON.stringify({
        businessName,
        ownerName: name,
        botPhone,
        ownerPhone,
        email,
        geminiApiKey,
        plan: 'saas',
        paymentId: paymentId,
        sanityDocumentId: createdRecord.id
      })
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.error(`[SaaS Onboarding] Provision API responded with error status ${res.status}: ${text}`);
      } else {
        const json = await res.json();
        console.log(`[SaaS Onboarding] Provision API successfully triggered:`, json);
      }
    }).catch((err) => {
      console.error(`[SaaS Onboarding] Fetch error while triggering Provision API:`, err.message);
    });

    // 3. Send WhatsApp to ownerPhone:
    const welcomeMessage = `Payment received! 🎉 We are setting up your ScaleCraft Agent. You will receive your dashboard login link in 10-15 minutes.`;
    
    // Find an active client in Supabase to send the message through their bridge
    const { data: activeClient } = await supabase
      .from('agent_clients')
      .select('server_ip')
      .eq('status', 'active')
      .not('server_ip', 'is', null)
      .limit(1)
      .maybeSingle();
    
    const bridgeIp = activeClient?.server_ip || '13.233.46.104';
    const bridgeUrl = `http://${bridgeIp}:3009/send`;
    console.log(`[SaaS Onboarding] Dispatching setup alert via bridge: ${bridgeUrl} to ${ownerPhone}`);

    try {
      const waRes = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${ownerPhone}@s.whatsapp.net`,
          message: welcomeMessage
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (!waRes.ok) {
        const text = await waRes.text();
        console.error(`[SaaS Onboarding] WhatsApp welcome bridge error: ${waRes.status} - ${text}`);
      } else {
        console.log(`[SaaS Onboarding] WhatsApp welcome notification sent successfully to ${ownerPhone}`);
      }
    } catch (waErr) {
      console.error(`[SaaS Onboarding] Failed to dispatch WhatsApp welcome:`, waErr.message);
    }

    // 4. Send Confirmation Email:
    try {
      await sendConfirmationEmail(email, name, 'scalecraft-agent-saas', licenseKey, {
        botPhone,
        ownerPhone,
        businessName,
        password: plainPassword
      });
    } catch (emailErr) {
      console.error(`[SaaS Onboarding] Failed to send SaaS email confirmation:`, emailErr.message);
    }
  } catch (error) {
    console.error(`[SaaS Onboarding] Error during SaaS onboarding process:`, error);
  }
};

const handleTrialSaaSOnboarding = async (body, origin) => {
  try {
    const email = (body.buyer_email || body.email || '').toLowerCase().trim();
    
    // Look up existing client in Supabase by email to resolve missing details (e.g. when called from register-purchase)
    const { data: existingClient } = await supabase
      .from('agent_clients')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const name = body.buyer_name || body.buyerName || body.name || existingClient?.owner_name || 'SaaS Owner';
    const businessName = body.businessName || body.buyer_business_name || body.business_name || existingClient?.business_name || 'SaaS Client';
    const botPhone = (body.botPhone || body.buyer_bot_phone || body.bot_phone || existingClient?.whatsapp_bot_number || '').replace(/\D/g, '');
    const ownerPhone = (body.ownerPhone || body.buyer_owner_phone || body.owner_phone || existingClient?.owner_phone || '').replace(/\D/g, '');
    const geminiApiKey = body.geminiApiKey || body.buyer_gemini_key || body.gemini_api_key || existingClient?.gemini_api_key || '';
    const paymentId = body.razorpay_payment_id || body.payment_id || 'manual';
    const clientId = body.clientId || body.client_id || existingClient?.id || '';

    console.log(`[Trial SaaS Onboarding] Triggering Next.js provision for client: ${clientId} (${email})`);

    const frontendUrl = origin || 'https://thescalecraft.in';
    const provisionUrl = `${frontendUrl}/api/admin/provision`;

    fetch(provisionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET || ''
      },
      body: JSON.stringify({
        businessName,
        ownerName: name,
        botPhone,
        ownerPhone,
        email,
        geminiApiKey,
        plan: 'saas',
        paymentId,
        sanityDocumentId: clientId
      })
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.error(`[Trial SaaS Onboarding] Provision API responded with error status ${res.status}: ${text}`);
      } else {
        const json = await res.json();
        console.log(`[Trial SaaS Onboarding] Provision API successfully triggered:`, json);
      }
    }).catch((err) => {
      console.error(`[Trial SaaS Onboarding] Fetch error while triggering Provision API:`, err.message);
    });

  } catch (error) {
    console.error(`[Trial SaaS Onboarding] Error:`, error);
  }
};

// Verify payment + store buyer email
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, buyer_email, buyer_name, product_id, couponCode } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      incrementSalesCount();
      let licenseKey = '';
      if (buyer_email) {
        // Generate license key BEFORE checking duplicate so we have it ready
        if (product_id === 'mOBd3I07NrgTLn79T01oEq' || product_id === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' || product_id === 'scalecraft-agent-saas') {
          licenseKey = generateLicenseKey();
        }

        let currency = req.body.currency || 'INR';
        let amount = req.body.amount;
        try {
          const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
          if (paymentDetails) {
            currency = paymentDetails.currency || currency;
            amount = paymentDetails.amount || amount;
          }
        } catch (err) {
          console.error(`Error fetching payment details from Razorpay for verification (${razorpay_payment_id}):`, err.message);
        }

        const added = addBuyer(buyer_email, buyer_name, razorpay_payment_id, product_id);
        if (added) {
          // Pass licenseKey into syncOrderToSanity so it's written atomically
          await syncOrderToSanity({
            email: buyer_email,
            name: buyer_name,
            product_id: product_id,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            amount: amount,
            currency: currency,
            licenseKey: licenseKey || undefined,
            couponCode: couponCode
          }, req.headers.origin || req.headers.referer);
          const isTrial = req.body.plan_type === 'trial' || req.body.planType === 'trial' || req.body.amount === 200 || req.body.amount === '200';
          if (product_id === 'scalecraft-agent-saas' && !isTrial) {
            await handleSaaSOnboarding(req.body, licenseKey, req.headers.origin);
          } else if (product_id === 'scalecraft-agent-saas' && isTrial) {
            await handleTrialSaaSOnboarding(req.body, req.headers.origin);
          } else {
            await sendConfirmationEmail(buyer_email, buyer_name, product_id, licenseKey);
          }
        } else {
          console.log(`Duplicate verify-payment received for email ${buyer_email} and paymentId ${razorpay_payment_id}. Fetching existing licenseKey.`);
          if (product_id === 'mOBd3I07NrgTLn79T01oEq' || product_id === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' || product_id === 'scalecraft-agent-saas') {
            const { data: existingOrder } = await supabase
              .from('orders')
              .select('license_key')
              .eq('customer_email', buyer_email.toLowerCase().trim())
              .eq('sanity_product_id', product_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (existingOrder && existingOrder.license_key) {
              licenseKey = existingOrder.license_key;
            }
          }
        }
      }
      res.json({ status: 'success', message: 'Payment verified successfully', licenseKey });
    } else {
      res.status(400).json({ status: 'failure', message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Check if email has purchased access
app.post('/api/check-access', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ authorized: false, error: 'Email required' });
    const buyers = getBuyers();
    const normalized = email.toLowerCase().trim();
    const buyer = buyers.find(b => b.email === normalized);
    res.json({ authorized: !!buyer, buyer: buyer || null });
  } catch (error) {
    console.error('Error checking access:', error);
    res.status(500).json({ authorized: false, error: 'Server error' });
  }
});

// Register buyer after payment (for post-payment collection)
app.post('/api/register-purchase', async (req, res) => {
  try {
    const { payment_id, email, buyerName, name, productId, couponCode } = req.body;
    if (!payment_id || !email || !productId) {
      return res.status(400).json({ error: 'Payment ID, email, and Product ID are required' });
    }

    const displayName = name || buyerName || 'Learner';
    let licenseKey = '';

    // Generate license key BEFORE addBuyer so we always have it ready
    if (productId === 'mOBd3I07NrgTLn79T01oEq' || productId === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' || productId === 'scalecraft-agent-saas') {
      licenseKey = generateLicenseKey();
    }

    let currency = 'INR';
    let amount = undefined;
    if (payment_id && payment_id !== 'manual_entry') {
      try {
        const paymentDetails = await razorpay.payments.fetch(payment_id);
        if (paymentDetails) {
          currency = paymentDetails.currency || 'INR';
          amount = paymentDetails.amount; // in paise/cents
        }
      } catch (err) {
        console.error(`Error fetching payment details from Razorpay for registration (${payment_id}):`, err.message);
      }
    }

    const added = addBuyer(email, displayName, payment_id, productId);

    if (added) {
      // Pass licenseKey into syncOrderToSanity so it's written atomically
      await syncOrderToSanity({
        email: email,
        name: displayName,
        product_id: productId,
        razorpay_payment_id: payment_id,
        razorpay_order_id: 'auto_register',
        amount: amount,
        currency: currency,
        licenseKey: licenseKey || undefined,
        couponCode: couponCode
      }, req.headers.origin || req.headers.referer);
      const isTrial = req.body.plan_type === 'trial' || req.body.planType === 'trial' || req.body.amount === 200 || req.body.amount === '200';
      if (productId === 'scalecraft-agent-saas' && !isTrial) {
        await handleSaaSOnboarding(req.body, licenseKey, req.headers.origin);
      } else if (productId === 'scalecraft-agent-saas' && isTrial) {
        await handleTrialSaaSOnboarding(req.body, req.headers.origin);
      } else {
        await sendConfirmationEmail(email, displayName, productId, licenseKey);
      }
      console.log(`New purchase auto-registered: ${email} (${payment_id})`);
    } else {
      console.log(`Duplicate register-purchase for payment ID ${payment_id}. Fetching existing licenseKey.`);
      if (productId === 'mOBd3I07NrgTLn79T01oEq' || productId === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' || productId === 'scalecraft-agent-saas') {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('license_key')
          .eq('customer_email', email.toLowerCase().trim())
          .eq('sanity_product_id', productId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingOrder && existingOrder.license_key) {
          licenseKey = existingOrder.license_key;
        }
      }
    }

    res.json({ status: 'success', message: 'Purchase processed successfully', licenseKey });
  } catch (error) {
    console.error('Error registering purchase:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin: Resend Confirmation Email
app.post('/api/admin/resend-email', async (req, res) => {
  try {
    const token = req.headers['x-admin-secret'] || req.headers['x-sanity-token'];
    if (token !== process.env.ADMIN_SECRET && token !== process.env.SANITY_API_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { email, name, productId, licenseKey } = req.body;
    if (!email || !productId) {
      return res.status(400).json({ error: 'Email and Product ID are required' });
    }
    
    await sendConfirmationEmail(email, name, productId, licenseKey);
    res.json({ success: true, message: 'Email resent successfully' });
  } catch (error) {
    console.error('Error resending email:', error);
    res.status(500).json({ error: 'Failed to resend email' });
  }
});

// Admin: Manually Register Purchase
app.post('/api/admin/manual-register', async (req, res) => {
  try {
    const token = req.headers['x-admin-secret'] || req.headers['x-sanity-token'];
    if (token !== process.env.ADMIN_SECRET && token !== process.env.SANITY_API_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { email, name, productId, amount, couponCode, paymentId, businessName, botPhone, ownerPhone, geminiApiKey } = req.body;
    if (!email || !productId) {
      return res.status(400).json({ error: 'Email and Product ID are required' });
    }

    const displayName = name || 'Learner';
    const finalPaymentId = paymentId || `manual_${Date.now().toString().slice(-8)}`;
    
    let licenseKey = '';
    if (productId === 'mOBd3I07NrgTLn79T01oEq' || productId === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' || productId === 'scalecraft-agent-saas') {
      licenseKey = generateLicenseKey();
    }

    // Register locally
    addBuyer(email, displayName, finalPaymentId, productId);

    // Sync to Supabase orders
    await syncOrderToSanity({
      email,
      name: displayName,
      product_id: productId,
      razorpay_payment_id: finalPaymentId,
      razorpay_order_id: 'manual_register',
      amount: amount ? amount * 100 : undefined, // Sync expects paise
      licenseKey: licenseKey || undefined,
      couponCode: couponCode
    }, req.headers.origin || req.headers.referer);

    // Send email or setup SaaS
    if (productId === 'scalecraft-agent-saas') {
      await handleSaaSOnboarding({
        email,
        name: displayName,
        businessName: businessName || 'SaaS Client',
        botPhone: botPhone || '',
        ownerPhone: ownerPhone || '',
        geminiApiKey: geminiApiKey || '',
        payment_id: finalPaymentId
      }, licenseKey, req.headers.origin);
    } else {
      await sendConfirmationEmail(email, displayName, productId, licenseKey);
    }

    res.json({ success: true, message: 'Order manually registered and email sent successfully', licenseKey, paymentId: finalPaymentId });
  } catch (error) {
    console.error('Error manually registering purchase:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const SUPPORT_FILE = path.join(DATA_DIR, 'support_requests.json');

const addSupportRequest = (email, mobile) => {
  try {
    let requests = [];
    if (fs.existsSync(SUPPORT_FILE)) {
      requests = JSON.parse(fs.readFileSync(SUPPORT_FILE, 'utf8'));
    }
    requests.push({
      email: email.toLowerCase().trim(),
      mobile,
      requestedAt: new Date().toISOString()
    });
    fs.writeFileSync(SUPPORT_FILE, JSON.stringify(requests, null, 2));
  } catch (error) {
    console.error('Error saving support request:', error);
  }
};

// Verify purchase and log support request
app.post('/api/request-support', (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email || !mobile) {
      return res.status(400).json({ authorized: false, error: 'Email and mobile are required' });
    }

    const buyers = getBuyers();
    const normalized = email.toLowerCase().trim();
    const buyer = buyers.find(b => b.email === normalized);

    if (buyer) {
      addSupportRequest(email, mobile);
      res.json({ authorized: true, message: 'Support request verified' });
    } else {
      res.status(403).json({ authorized: false, error: 'No purchase found for this email. Please ensure you use the same email used during purchase.' });
    }
  } catch (error) {
    console.error('Error processing support request:', error);
    res.status(500).json({ authorized: false, error: 'Server error' });
  }
});

app.post('/api/submit-review', async (req, res) => {
  try {
    const { name, rating, comment, productId, profession } = req.body;

    if (!name || !rating || !comment || !productId) {
      return res.status(400).json({ error: 'Missing required fields: name, rating, comment, and productId are all required.' });
    }

    const { data: result, error } = await supabase
      .from('testimonials')
      .insert({
        name,
        rating: parseInt(rating),
        comment,
        profession: profession || 'ScaleCraft User',
        product_id: productId,
        approved: false // Default to false, pending admin approval
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ status: 'success', message: 'Review submitted for approval! It will be visible once approved.' });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review', details: error.message });
  }
});


// Admin: Get all reviews
app.get('/api/admin/reviews', async (req, res) => {
  try {
    const { data: dbReviews, error } = await supabase
      .from('testimonials')
      .select('id, name, rating, comment, profession, approved, created_at, saas_products(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedReviews = (dbReviews || []).map((r) => ({
      _id: r.id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      profession: r.profession,
      approved: r.approved,
      createdAt: r.created_at,
      productTitle: r.saas_products?.name || null
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Admin: Approve review
app.post('/api/admin/approve-review', async (req, res) => {
  try {
    const { reviewId } = req.body;
    const { error } = await supabase
      .from('testimonials')
      .update({ approved: true })
      .eq('id', reviewId);

    if (error) throw error;
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ error: 'Failed to approve review' });
  }
});

// Admin: Delete review
app.post('/api/admin/delete-review', async (req, res) => {
  try {
    const { reviewId } = req.body;
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});


const PORT = process.env.PORT || 5000;

// Keep-alive ping for Render
const pingBackend = () => {
  const url = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  const client = url.startsWith('https') ? require('https') : require('http');
  client.get(`${url}/api/sales-count`, (res) => {
    console.log(`Keep-alive ping: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`Keep-alive ping failed: ${err.message}`);
  });
};

// Run every 5 minutes (300,000 milliseconds)
setInterval(pingBackend, 5 * 60 * 1000);

const triggerAutoFollowup = () => {
  const cronSecret = process.env.CRON_SECRET || 'scalecraft-cron-secret-key-123';
  const nextAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${nextAppUrl}/api/cron/auto-followup`;
  
  const client = url.startsWith('https') ? require('https') : require('http');
  const req = client.request(
    url,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      }
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[Cron] Auto-Followup trigger status: ${res.statusCode}. Response: ${data.substring(0, 100)}`);
      });
    }
  );
  req.on('error', (err) => {
    console.error(`[Cron] Auto-Followup trigger request failed: ${err.message}`);
  });
  req.end();
};

// Run auto-followups every 6 hours
setInterval(triggerAutoFollowup, 6 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`\x1b[36m✓ Server running on port ${PORT}\x1b[0m`);
});
