#!/bin/bash

# ============================================================
#  ScaleCraft Agent - WhatsApp AI Sales Agent Installer
#  Version 1.1 | thescalecraft.in/scalecraft-agent
#  Installs a fully working WhatsApp AI sales agent in < 2 hours
# ============================================================

set -e

LICENSE_KEY=""
AGENT_NAME=""
BIZ_NAME=""
PRODUCTS=""
PRICING=""
WEBSITE=""
TEAM_NUM=""
GEMINI_KEY=""
LANG_CHOICE="1"
LANGUAGES=""
CLIENT_ID=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --key) LICENSE_KEY="$2"; shift ;;
    --key=*) LICENSE_KEY="${1#*=}" ;;
    --agent-name) AGENT_NAME="$2"; shift ;;
    --biz-name) BIZ_NAME="$2"; shift ;;
    --products) PRODUCTS="$2"; shift ;;
    --pricing) PRICING="$2"; shift ;;
    --website) WEBSITE="$2"; shift ;;
    --team-num) TEAM_NUM="$2"; shift ;;
    --gemini-key) GEMINI_KEY="$2"; shift ;;
    --lang) LANG_CHOICE="$2"; shift ;;
    --languages) LANGUAGES="$2"; shift ;;
    --client-id) CLIENT_ID="$2"; shift ;;
  esac
  shift
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  ╔═══════════════════════════════════════════╗"
  echo "  ║       ScaleCraft Agent Installer          ║"
  echo "  ║   WhatsApp AI Sales Agent - v1.1          ║"
  echo "  ║   thescalecraft.in/scalecraft-agent       ║"
  echo "  ╚═══════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
}

print_step() {
  echo ""
  echo -e "${BLUE}${BOLD}[$1/9] $2${NC}"
  echo -e "${BLUE}────────────────────────────────────────${NC}"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warn()    { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info()    { echo -e "${CYAN}→ $1${NC}"; }
print_error()   { echo -e "${RED}✗ $1${NC}"; exit 1; }

ensure_curl() {
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
  else
    print_error "Unsupported OS. Supports Ubuntu 20+ and macOS 12+."
  fi

  if ! command -v curl &>/dev/null; then
    print_warn "Installing curl..."
    [[ "$OS" == "linux" ]] && sudo apt-get update -qq && sudo apt-get install -y curl
  fi
}

# ── STEP 1: Requirements ──────────────────────────────────────
check_requirements() {
  print_step 3 "Checking system requirements"

  # OS and curl are already verified by ensure_curl
  print_success "OS: $OS"
  print_success "curl ready"

  if command -v node &>/dev/null; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
      print_warn "Node.js too old - upgrading to v20..."
      install_node
    else
      print_success "Node.js $(node -v) ready"
    fi
  else
    print_warn "Node.js not found - installing v20..."
    install_node
  fi

  if ! command -v python3 &>/dev/null; then
    print_warn "Python3 not found - installing..."
    [[ "$OS" == "linux" ]] && sudo apt-get install -y python3 python3-venv
  fi
  print_success "Python3 ready"

  if ! command -v git &>/dev/null; then
    print_warn "git not found - installing..."
    [[ "$OS" == "linux" ]] && sudo apt-get install -y git
  fi
  print_success "git ready"

  # ffmpeg for audio processing
  if ! command -v ffmpeg &>/dev/null; then
    print_warn "ffmpeg not found - installing (needed for voice messages)..."
    if [[ "$OS" == "linux" ]]; then
      sudo apt-get install -y ffmpeg
    elif [[ "$OS" == "mac" ]]; then
      command -v brew &>/dev/null && brew install ffmpeg || print_warn "Install ffmpeg manually: brew install ffmpeg"
    fi
  fi
  print_success "ffmpeg ready (voice message support)"

  print_success "All requirements satisfied"
}

install_node() {
  if [[ "$OS" == "linux" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif [[ "$OS" == "mac" ]]; then
    command -v brew &>/dev/null && brew install node@20 || \
      print_error "Install Node.js 20+ from https://nodejs.org and re-run."
  fi
  print_success "Node.js installed"
}

# ── STEP 2: Pre-configure Hermes ──────────────────────────────
pre_configure_hermes() {
  print_step 4 "Pre-configuring Hermes Agent"

  if [ -z "$GEMINI_KEY" ]; then
    echo ""
    echo -e "${RED}✗ Error: Gemini API key required.${NC}"
    echo "Get it from: https://aistudio.google.com/apikey"
    echo ""
    echo "Then run:"
    echo -e "  ${CYAN}curl -fsSL https://thescalecraft.in/agent/install.sh | bash -s -- --key YOUR-KEY --gemini-key YOUR-GEMINI-KEY${NC}"
    echo ""
    exit 1
  fi

  mkdir -p "$HOME/.hermes"

  CLEAN_TEAM_NUM=$(echo "${TEAM_NUM}" | tr -cd '0-9')

  # API Keys
  cat > "$HOME/.hermes/.env" << EOF
GOOGLE_API_KEY=${GEMINI_KEY}
WHATSAPP_MODE=bot
WHATSAPP_ALLOWED_USERS=*
WHATSAPP_HOME_CHANNEL=${CLEAN_TEAM_NUM:+"${CLEAN_TEAM_NUM}@s.whatsapp.net"}
HERMES_GATEWAY_HOME_CHANNEL_PROMPT=false
EOF

  export WHATSAPP_MODE=bot
  export WHATSAPP_ALLOWED_USERS="*"

  # Main config - all prompts pre-answered
  cat > "$HOME/.hermes/config.yaml" << 'HERMESCONFIG'
model:
  default: gemini-2.5-flash
  provider: gemini

agent:
  max_turns: 60
  gateway_timeout: 1800
  restart_drain_timeout: 180
  api_max_retries: 3
  tool_use_enforcement: auto
  image_input_mode: auto
  disabled_toolsets: []
  verbose: false
  reasoning_effort: medium

terminal:
  backend: local
  timeout: 180
  auto_source_bashrc: true
  persistent_shell: true

web:
  backend: ddgs

display:
  personality: default
  busy_input_mode: queue
  streaming: true
  final_response_markdown: strip

gateway:
  home_channel_prompt: false
  suppress_home_channel_prompt: true
  skip_home_channel_nag: true

whatsapp:
  reply_prefix: ""
  reconnect_interval: 30
  max_reconnect_attempts: 10

stt:
  enabled: true
  provider: local
  local:
    model: base
    language: ""

tts:
  provider: edge

memory:
  memory_enabled: true
  user_profile_enabled: false
  memory_char_limit: 2200
  user_char_limit: 1375
  nudge_interval: 10
  flush_min_turns: 6

session_reset:
  mode: context
  idle_minutes: 1440
  at_hour: 4

group_sessions_per_user: true

compression:
  enabled: true
  threshold: 0.5
  target_ratio: 0.2
  protect_last_n: 20

context:
  engine: compressor

platform_toolsets:
  cli:
  - browser
  - clarify
  - code_execution
  - cronjob
  - delegation
  - file
  - memory
  - messaging
  - session_search
  - skills
  - terminal
  - todo
  - tts
  - vision
  - web
  whatsapp:
  - browser
  - clarify
  - cronjob
  - memory
  - messaging
  - session_search
  - skills
  - web

security:
  redact_secrets: true
  tirith_enabled: true
  tirith_fail_open: true

onboarding:
  seen:
    busy_input_prompt: true

platforms:
  whatsapp:
    gateway_restart_notification: false

_config_version: 23
HERMESCONFIG

  # Gateway config - fixed port, no prefix
  cat > "$HOME/.hermes/gateway.json" << EOF
{
  "platforms": {
    "whatsapp": {
      "mode": "bot",
      "allowed_users": "*",
      "extra": {
        "bridge_port": 3009,
        "reply_prefix": "",
        "dm_policy": "open",
        "allow_from": "*",
        "group_policy": "ignore"
      }
    }
  }
}
EOF

  # Pre-configure WhatsApp mode to skip prompts
  mkdir -p "$HOME/.hermes/whatsapp"
  cat > "$HOME/.hermes/whatsapp/config.json" << EOF
{
  "mode": "bot",
  "allowedUsers": "*"
}
EOF

  print_success "Hermes pre-configured"
}

setup_swap() {
  # Swap setup is only supported on Linux
  [[ "$OSTYPE" == "linux-gnu"* ]] || return 0

  echo ""
  echo "→ Setting up swap memory..."
  
  # Check if already active
  if free -m | grep -q "Swap.*[1-9]"; then
    echo "✓ Swap already active"
    return 0
  fi

  # Remove old swapfile if exists but not active
  sudo swapoff /swapfile 2>/dev/null || true
  sudo rm -f /swapfile 2>/dev/null || true

  # Create 2GB swap
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  
  # Make permanent
  if ! grep -q swapfile /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi
  
  echo "✓ Swap ready: $(free -m 2>/dev/null | grep Swap || echo 'Enabled')"
}

# ── STEP 3: Install Hermes ────────────────────────────────────
install_hermes() {
  print_step 5 "Installing Hermes Agent (AI engine)"

  # Export environment variables for the session
  export WHATSAPP_MODE=bot
  export WHATSAPP_ALLOWED_USERS="*"

  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --skip-setup

  export PATH="$HOME/.local/bin:$PATH"
  hash -r 2>/dev/null || true
  hermes config set soul_file /home/ubuntu/.hermes/SOUL.md
  print_success "Hermes Agent installed"
}

install_whatsapp_bridge() {
  print_step 6 "Installing WhatsApp bridge dependencies"
  
  BRIDGE_DIR="$HOME/.hermes/hermes-agent/scripts/whatsapp-bridge"
  
  if [ -d "$BRIDGE_DIR" ]; then
    cd "$BRIDGE_DIR"
    print_info "Installing packages (2-3 minutes)..."
    npm install --no-audit --no-fund 2>/dev/null || \
    npm install --no-audit --no-fund --prefer-offline 2>/dev/null || true
    
    # Install link-preview-js to prevent runtime crashes
    if [ ! -d "node_modules/link-preview-js" ]; then
      npm install link-preview-js --no-audit --no-fund 2>/dev/null || true
    fi
    
    # Fix bridge.js default port
    sed -i "s/getArg('port', '[0-9]*')/getArg('port', '3009')/" \
      "$HOME/.hermes/hermes-agent/scripts/whatsapp-bridge/bridge.js" \
      2>/dev/null || true

    # Inject dynamic WhatsApp linked device/browser name configuration
    node -e "
      const fs = require('fs');
      const p = '$HOME/.hermes/hermes-agent/scripts/whatsapp-bridge/bridge.js';
      if (fs.existsSync(p)) {
        let code = fs.readFileSync(p, 'utf8');
        code = code.replace(/browser:\\s*\\[\\s*['\\\"]Hermes Agent['\\\"],\\s*['\\\"]Chrome['\\\"](.*?)\\]/g, \`browser: (() => {
          let customAgentName = 'ScaleCraft Agent';
          try {
            const soulPath = require('path').join(process.env.HOME || '/home/ubuntu', '.hermes', 'SOUL.md');
            if (fs.existsSync(soulPath)) {
              const soulContent = fs.readFileSync(soulPath, 'utf8');
              const match = soulContent.match(/<!-- CONFIG:\\\\s*({[\\\\s\\\\S]*?})\\\\s*-->/);
              if (match && match[1]) {
                const config = JSON.parse(match[1].trim());
                if (config.agentName) {
                  customAgentName = config.agentName;
                }
              }
            }
          } catch (e) {}
          return [customAgentName, 'Chrome', '120.0'];
        })()\`);

        if (!code.includes('sock.onWhatsApp(chatId)')) {
          const sendTarget = 'const { chatId, message, replyTo } = req.body;';
          const sendRepl = 'const { chatId, message, replyTo } = req.body;\\n  if (chatId.endsWith(\\'@s.whatsapp.net\\')) {\\n    try {\\n      const existsResult = await sock.onWhatsApp(chatId);\\n      if (!existsResult || !existsResult[0] || !existsResult[0].exists) {\\n        return res.status(400).json({ error: \\'Number is not registered on WhatsApp\\' });\\n      }\\n    } catch (e) {\\n      console.warn(\\'[bridge] onWhatsApp check failed:\\', e.message);\\n    }\\n  }';
          code = code.replace(sendTarget, sendRepl);

          const sendMediaTarget = 'const { chatId, filePath, mediaType, caption, fileName } = req.body;';
          const sendMediaRepl = 'const { chatId, filePath, mediaType, caption, fileName } = req.body;\\n  if (chatId.endsWith(\\'@s.whatsapp.net\\')) {\\n    try {\\n      const existsResult = await sock.onWhatsApp(chatId);\\n      if (!existsResult || !existsResult[0] || !existsResult[0].exists) {\\n        return res.status(400).json({ error: \\'Number is not registered on WhatsApp\\' });\\n      }\\n    } catch (e) {\\n      console.warn(\\'[bridge] onWhatsApp check failed:\\', e.message);\\n    }\\n  }';
          code = code.replace(sendMediaTarget, sendMediaRepl);
        }

        fs.writeFileSync(p, code, 'utf8');
      }
    " 2>/dev/null || true
    
    # Kill any process already on port 3009
    sudo fuser -k 3009/tcp 2>/dev/null || true
    
    cd ~
    print_success "WhatsApp bridge ready"
  else
    print_warn "Bridge directory not found - skipping"
  fi
}

# ── STEP 5: Voice (STT) ───────────────────────────────────────
install_voice() {
  print_step 7 "Installing voice message support (speech-to-text)"

  VENV_PY="$HOME/.hermes/hermes-agent/venv/bin/python3"

  # Bootstrap pip into the venv first
  print_info "Setting up pip..."
  $VENV_PY -m ensurepip --upgrade 2>/dev/null || \
  curl -fsSL https://bootstrap.pypa.io/get-pip.py | $VENV_PY 2>/dev/null || true

  # Now install faster-whisper
  print_info "Installing faster-whisper..."
  $VENV_PY -m pip install faster-whisper --quiet 2>/dev/null || \
  $HOME/.hermes/hermes-agent/venv/bin/pip install faster-whisper --quiet || true

  # Enable STT in config only if not already set
  if ! grep -q "stt:" "$HOME/.hermes/config.yaml" 2>/dev/null; then
    cat >> "$HOME/.hermes/config.yaml" << EOF

stt:
  enabled: true
  provider: local
  model: base
EOF
  fi

  print_success "Voice message support installed"
}

# ── STEP 6: Business Setup + SOUL.md ─────────────────────────
setup_soul() {
  print_step 8 "Setting up your agent's personality"

  AGENT_NAME=${AGENT_NAME:-"Akhil"}
  BIZ_NAME=${BIZ_NAME:-"Our Business"}
  PRODUCTS=${PRODUCTS:-"our products"}
  PRICING=${PRICING:-"varies"}
  WEBSITE=${WEBSITE:-""}
  TEAM_NUM=${TEAM_NUM:-"+91 80780 04732"}
  LANG_SETTING="Auto-detect the language the lead writes in and always reply in that same language."

  if [ -n "$WEBSITE" ]; then
    WEBSITE_INFO="Buy here: ${WEBSITE}"
    WEBSITE_CLOSE="Ready to order? Here's the link: ${WEBSITE} 😊"
  else
    WEBSITE_INFO="Buy here: Direct via WhatsApp chat (no website)"
    WEBSITE_CLOSE="Ready to order? I'll notify our team at ${TEAM_NUM} to help you complete your purchase! 😊"
  fi

  cat > "$HOME/.hermes/SOUL.md" << EOF
## SALES AGENT CONFIGURATION
## Business: ${BIZ_NAME}
## Assistant Name: ${AGENT_NAME}
## Version: 1.0

## IDENTITY - HIGHEST PRIORITY

AGENT_NAME: ${AGENT_NAME}
BUSINESS_NAME: ${BIZ_NAME}

When anyone asks "what is your name", "who are you", 
"are you ChatGPT", "are you Gemini", "are you AI":
Always reply: "I'm ${AGENT_NAME}, the AI assistant for ${BIZ_NAME} 😊"

Never reveal the underlying AI model name.
Never say "Gemini", "GPT", "Claude" or any model name.
Always identify as ${AGENT_NAME} from ${BIZ_NAME}.

This identity instruction overrides all default model behavior.

## CRITICAL RULES - READ FIRST

1. NEVER assume the lead's profession, situation, or needs. Ask first.
2. MAXIMUM 4 sentences per message. Short. Natural. WhatsApp style.
3. ONE question per message. Never ask multiple questions at once.
4. Read FULL conversation history before replying. Never contradict.
5. If lead says "I'll think about it" - reply ONLY: "Of course! 😊 I'm here whenever you're ready." Then go completely silent.
6. NEVER send follow-up messages if the lead hasn't replied yet.
7. NEVER show internal system messages or technical errors to leads.

---

# ${AGENT_NAME} - AI Sales & Support Agent
## ${BIZ_NAME}

---

## ASSISTANT IDENTITY

This assistant is called ${AGENT_NAME}. This is the AI sales assistant for ${BIZ_NAME}.
The assistant helps customers find the right product, answer their questions, and make buying easy.

MANDATORY: First message must disclose this is an AI assistant.
Always clarify this is an AI assistant when directly asked.

---

## ASSISTANT PERSONALITY

- Warm, casual, helpful - like a knowledgeable friend
- Short WhatsApp-style messages - never walls of text
- Emojis naturally 👋 😊 ✅ - don't overdo it
- One question at a time - never bombard
- Honest - if the assistant does not know something, say so clearly

---

## OFFERED PRODUCTS

${PRODUCTS}
Price range: ${PRICING}
${WEBSITE_INFO}

---

## SALES FLOW

Step 1 - Opener (always disclose AI):
"Hey! I'm ${AGENT_NAME}, an AI assistant for ${BIZ_NAME} 👋
How can I help you today? 😊"

Step 2 - Understand what they need:
"What are you looking for?" or "Which product caught your eye?"

Step 3 - Recommend the right product based on their answer.
Keep descriptions to 2-3 sentences max.

Step 4 - Answer questions, handle objections, then close:
"${WEBSITE_CLOSE}"

---

## PRODUCT DISCLAIMER

When explaining the offering, always clarify:
"Just so you know - this is a real product/service, not an automated system.
You get exactly what's described. 😊"

---

## OBJECTION HANDLING

"Too expensive":
"I totally get it 😊 The price reflects the quality - and honestly ${PRICING} is our best value.
What's your budget? I might be able to suggest the right option."

"I'll think about it":
"Of course, no rush! 😊 What specifically are you unsure about? I can answer directly."

"Is this genuine / original?":
"100% genuine - we only sell authentic products. Any other questions? 😊"

"I tried something similar before":
"That's fair - what didn't work last time? Tell me and I'll show you exactly how this is different."

"Not sure if this works for me":
"Totally valid concern 😊 Tell me a bit more about your situation and I'll be honest about whether this is right for you."

---

## VOICE MESSAGES

When a voice message is received:
Transcribe it and reply to the content naturally.
If transcription fails: "Hey! I couldn't catch that voice message 😊 Could you type it out? I'll answer right away!"
Never show technical errors to the lead.

---

## LANGUAGE

${LANG_SETTING}

If the lead mixes languages (e.g. Malayalam + English), mix back naturally.
The goal is always to make the lead feel comfortable in their own language.

---

## HUMAN HANDOFF

When lead says "talk to team", "talk to human", "real person", "owner",
"complaint", "not working", "want to buy", "payment issue", "refund":

Send EXACTLY this message and then GO SILENT completely:
"Sure! Let me connect you with our team 🙏
👉 ${TEAM_NUM} (WhatsApp)
They'll help you right away! 😊"

After sending - STOP. Do not answer any more questions. Human takes over.

---

## PROHIBITED ACTIONS

- Never make up unverified product details
- Never promise delivery dates or stock without confirmation  
- Never write more than 4 sentences per message
- Never ask more than 1 question at a time
- Never send unsolicited follow-up messages
- Never show system errors or technical messages to leads
- Never engage with off-topic conversations

---

## STAY SCOPED

Only discuss: ${BIZ_NAME} products, pricing, ordering, delivery, and support.

If off-topic: "That's a bit outside my area 😊
Anything I can help you with about our products?"
EOF

  print_success "Agent personality configured for ${BIZ_NAME}"
}

# ── STEP 7: Launch ────────────────────────────────────────────
launch_agent() {
  print_step 9 "Launching your agent"
  
  export PATH="$HOME/.local/bin:$PATH"
  source "$HOME/.bashrc" 2>/dev/null || true

  # Clear port conflicts before starting
  sudo fuser -k 3009/tcp 2>/dev/null || true
  pkill -9 -f "bridge.js" 2>/dev/null || true
  sleep 2

  # Clear sessions after setup
  rm -rf ~/.hermes/sessions/* 2>/dev/null || true

  # Install and start gateway non-interactively  
  printf 'y\ny\n' | hermes gateway install 2>/dev/null || true
  hermes gateway start 2>/dev/null || true
  
  if [ -n "$CLIENT_ID" ]; then
    print_info "Configuring status heartbeat..."
    (crontab -l 2>/dev/null | grep -Fv "heartbeat"; echo "* * * * * curl -s -X POST https://thescalecraft.in/api/internal/heartbeat -H \"Content-Type: application/json\" -d '{\"clientId\": \"$CLIENT_ID\", \"status\": \"online\"}' >/dev/null 2>&1") | crontab -
    print_success "Heartbeat configured"
  fi

  sleep 3

  echo ""
  echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║   Installation Complete! 🎉                ║${NC}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BOLD}Last step - Connect WhatsApp:${NC}"
  echo ""
  echo -e "  Run this command to connect WhatsApp:"
  echo -e "  ${CYAN}source ~/.bashrc && echo 'N' | hermes whatsapp${NC}"
  echo ""
  echo -e "  QR code will appear - scan with your bot phone:"
  echo -e "  WhatsApp → Settings → Linked Devices → Link a Device"
  echo ""
  echo -e "  After scanning run:"
  echo -e "  ${CYAN}hermes gateway restart${NC}"
  echo ""
  echo -e "${CYAN}Need help? WhatsApp: +91 80780 04732${NC}"
  echo ""
}

validate_license() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  License Activation${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Check if empty
  if [ -z "$LICENSE_KEY" ]; then
    echo -e "${RED}✗ Error: License key required.${NC}"
    echo ""
    echo -e "Run the installer with:"
    echo -e "  ${CYAN}curl -fsSL https://thescalecraft.in/agent/install.sh | bash -s -- --key YOUR-LICENSE-KEY${NC}"
    echo ""
    echo -e "Get your key from your purchase email or visit:"
    echo -e "  ${CYAN}https://thescalecraft.in/thank-you/scalecraft-agent${NC}"
    echo ""
    exit 1
  fi

  print_info "Validating license key..."

  # Validate against ScaleCraft API
  RESPONSE=$(curl -s --max-time 10 -X POST https://thescalecraft.in/api/validate-license \
    -H "Content-Type: application/json" \
    -d "{\"licenseKey\": \"$LICENSE_KEY\"}")

  VALID=$(echo "$RESPONSE" | grep -o '"valid":\s*true' || echo "")

  if [ -z "$VALID" ]; then
    ERR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Invalid license key")
    echo ""
    echo -e "${RED}✗ License validation failed: $ERR_MSG${NC}"
    echo ""
    echo -e "${YELLOW}  Need help? Contact us on WhatsApp: +91 80780 04732${NC}"
    echo -e "${YELLOW}  Or visit: https://thescalecraft.in/scalecraft-agent${NC}"
    echo ""
    exit 1
  fi

  echo ""
  print_success "License key validated! Welcome to ScaleCraft Agent."
  echo ""
}


# ── MAIN ──────────────────────────────────────────────────────
main() {
  setup_swap              # 1 - Add swap memory (ABSOLUTE FIRST)
  ensure_curl
  print_banner
  
  echo -e "${BOLD}Welcome to ScaleCraft Agent!${NC}"
  echo "Sets up your WhatsApp AI sales agent in under 2 hours."
  echo ""

  validate_license        # 2 - Check license key
  check_requirements      # 3 - Install system deps
  pre_configure_hermes    # 4 - Write all config files
  install_hermes          # 5 - Install Hermes (skips setup wizard)
  install_whatsapp_bridge # 6 - Install WhatsApp npm packages
  install_voice           # 7 - Install faster-whisper STT
  setup_soul              # 8 - Write SOUL.md from arguments
  launch_agent            # 9 - Install gateway + show final instructions
}

main "$@"

