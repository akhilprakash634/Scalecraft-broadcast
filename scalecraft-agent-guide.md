# ScaleCraft Agent - Setup Guide
## WhatsApp AI Sales Agent | thescalecraft.in

---

## What You're Building

A WhatsApp AI agent that:
- Replies to leads instantly - 24/7
- Qualifies them based on their questions
- Explains your products naturally
- Handles objections
- Routes hot leads to you
- Gets smarter over time

Setup time: under 2 hours. No coding needed.

---

## What You Need Before Starting

- A VPS or computer running **Ubuntu 20+** or **macOS 12+**
  - VPS options: AWS Lightsail (Mumbai) ($5/mo), DigitalOcean ($6/mo)
  - Local machine also works (Mac or Linux)
- A **Google account** (for free Gemini API key)
- A **dedicated WhatsApp number** for the bot
  - Any Airtel/Jio prepaid SIM not already on WhatsApp
  - Install WhatsApp on a second phone or use Dual SIM

---

## Step 1 - Run the Installer

Connect to your VPS (or open Terminal on your Mac) and run:

```bash
curl -fsSL https://thescalecraft.in/agent/install.sh | bash
```

The installer will:
1. Check and install all requirements automatically
2. Install Hermes Agent (the AI engine)
3. Connect your Gemini API key
4. Pair your WhatsApp number
5. Install voice message support
6. Ask you questions about your business
7. Launch your agent

**That's it. Follow the prompts.**

---

## Step 2 - Get Your Gemini API Key

When the installer asks for your API key:

1. Open [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with Google
3. Click **Create API Key**
4. Copy it and paste into the terminal

Free tier is fine to start. Billing is pay-per-use - typically ₹50–₹200/month for normal usage.

---

## Step 3 - Pair Your WhatsApp Number

When the installer shows a QR code:

1. Open WhatsApp on your **bot phone**
2. Go to **Settings → Linked Devices → Link a Device**
3. Scan the QR code

Once scanned - your agent is connected.

---

## Step 4 - Answer the Business Questions

The installer will ask:
- Agent name (the name your bot uses)
- Business name
- What you sell
- Price range
- Your product/website link
- Your team WhatsApp number (for hot lead handoff)
- Preferred language

This generates your agent's personality file (SOUL.md) automatically.

---

## Step 5 - You're Live!

Your agent is now running 24/7. Anyone who messages your bot number gets an instant reply.

**Test it:** Send "Hi" from another phone to your bot number.

---

## Customizing Your Agent

Your agent's personality lives in one file:

```bash
nano ~/.hermes/SOUL.md
```

Edit anything - add products, update prices, add FAQs, change the tone.
Save and restart:

```bash
hermes gateway restart
```

---

## Useful Commands

```bash
# Check if running
hermes gateway status

# Restart the agent
hermes gateway restart

# View live conversations
journalctl --user -u hermes-gateway -f

# Edit agent personality
nano ~/.hermes/SOUL.md

# Update to latest version
hermes update
```

---

## How the Hot Lead Handoff Works

When a lead says "talk to team" / "talk to human" / "want to buy":

1. Agent sends your team WhatsApp number to the lead
2. Agent goes silent
3. Lead messages you directly on your personal number
4. You close the deal

---

## Troubleshooting

**Agent not responding?**
```bash
hermes gateway status
hermes gateway restart
```

**WhatsApp disconnected?**
```bash
hermes whatsapp
# Scan QR code again
```

**Port conflict error?**
```bash
# Edit port in gateway config
nano ~/.hermes/gateway.json
# Change bridge_port to 3009 or 3011
hermes gateway restart
```

**Check error logs:**
```bash
journalctl --user -u hermes-gateway -f
```

---

## Pricing & Support

**ScaleCraft Agent** - ₹2,999 one-time

Includes:
- Installer script
- Full setup guide
- SOUL.md generator tool
- Chat support for setup issues

**Get support:** thescalecraft.in
**WhatsApp:** +91 80780 04732

---

*ScaleCraft Agent v1.0 | thescalecraft.in*
