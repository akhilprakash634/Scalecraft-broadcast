#!/bin/bash
# =============================================================
# ScaleCraft Backend — New Server Setup Script
# Run this ONCE on the new server as the ubuntu/root user
# =============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ScaleCraft Backend — Server Setup      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── 1. Update System ─────────────────────────────────────────
echo "📦 Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ─── 2. Install Node.js 18 ────────────────────────────────────
echo "🟢 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

node -v && npm -v
echo "✅ Node.js installed"

# ─── 3. Install PM2 ──────────────────────────────────────────
echo "⚙️  Installing PM2..."
sudo npm install -g pm2

# ─── 4. Create app directory ──────────────────────────────────
echo "📁 Creating app directories..."
sudo mkdir -p /var/www/html/paymentgateway
sudo chown -R ubuntu:ubuntu /var/www/html/paymentgateway

# ─── 5. Create secrets directory ──────────────────────────────
echo "🔐 Creating secrets directory..."
mkdir -p /home/ubuntu/secret/paymentgateway

# ─── 6. Write the .env file ───────────────────────────────────
echo "📝 Writing .env file..."
# NOTE: Replace the values below with your LIVE credentials before running
cat > /home/ubuntu/secret/paymentgateway/.env << 'ENVEOF'
# ─── Razorpay (use LIVE keys for production) ───────────────
RAZORPAY_KEY_ID=rzp_live_REPLACE_WITH_YOUR_LIVE_KEY_ID
RAZORPAY_KEY_SECRET=REPLACE_WITH_YOUR_LIVE_KEY_SECRET

# ─── Server ────────────────────────────────────────────────
PORT=5000
NODE_ENV=production

# ─── Zoho Mail SMTP ────────────────────────────────────────
SMTP_HOST=smtp.zoho.in
SMTP_PORT=465
SMTP_EMAIL=sales@growyourbusiness.today
SMTP_PASSWORD=REPLACE_WITH_YOUR_ZOHO_APP_PASSWORD

# ─── Supabase ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=REPLACE_WITH_YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_YOUR_SUPABASE_SERVICE_ROLE_KEY

# ─── Sanity CMS ────────────────────────────────────────────
SANITY_PROJECT_ID=73xk02vb
SANITY_API_TOKEN=REPLACE_WITH_YOUR_SANITY_API_TOKEN

# ─── App URLs (update after new IP confirmed) ──────────────
BACKEND_URL=http://NEW_SERVER_IP:5000
NEXT_PUBLIC_APP_URL=https://thescalecraft.in
ENVEOF

chmod 600 /home/ubuntu/secret/paymentgateway/.env
echo "✅ .env file created at /home/ubuntu/secret/paymentgateway/.env"
echo "⚠️  IMPORTANT: Edit that file now with your real credentials!"

# ─── 7. Setup PM2 to auto-start on reboot ─────────────────────
echo "🔄 Configuring PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash || true

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Server dependencies installed!                        ║"
echo "║                                                           ║"
echo "║  NEXT STEPS:                                              ║"
echo "║  1. Edit: /home/ubuntu/secret/paymentgateway/.env         ║"
echo "║     → Fill in your LIVE Razorpay keys                    ║"
echo "║     → Fill in your Zoho app password                     ║"
echo "║     → Fill in your Supabase URL + service role key       ║"
echo "║     → Fill in your Sanity API token                      ║"
echo "║                                                           ║"
echo "║  2. Then run: deploy-backend.sh  (or trigger GitHub CI)  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
