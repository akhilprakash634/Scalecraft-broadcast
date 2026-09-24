import os
import json
import time
import urllib.request
import urllib.error
import datetime

# Paths
SESSIONS_FILE = os.path.expanduser('~/.hermes/sessions/sessions.json')
MEMORY_FILE = os.path.expanduser('~/.hermes/lead_memory.json')
ENV_FILE = os.path.expanduser('~/.hermes/.env')

def load_api_key():
    # Attempt to load GOOGLE_API_KEY from .env
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                if 'GOOGLE_API_KEY' in line:
                    parts = line.strip().split('=')
                    if len(parts) >= 2:
                        return parts[1].strip().replace('"', '').replace("'", "")
    # Fallback to system environment variable
    return os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')

def get_gemini_memory(conversation_text, api_key):
    if not api_key:
        print("Error: No Gemini API Key found.")
        return None

    url_v1 = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"
    url_beta = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    
    prompt = f"""
You are an expert sales intelligence assistant. Analyze the following WhatsApp conversation between our AI Sales Agent and a customer.
Extract key sales details about the customer and construct a JSON profile.

Rules:
1. Identify the customer name, their profession (if mentioned), any products they expressed interest in, their main objections (if any), and summarize the conversation in one concise line.
2. Rate their buying intent strictly as one of: "hot", "warm", "cold", or "dead".
3. Return ONLY a valid JSON object matching the schema below. Do not wrap in markdown quotes.

JSON Schema:
{{
  "name": "Customer Name or Phone",
  "profession": "Customer profession or 'Unknown'",
  "products_interested": "Products discussed or 'None'",
  "objections": "Main concerns/objections or 'None'",
  "intent": "hot" | "warm" | "cold" | "dead",
  "summary": "One line summary of their query and outcome"
}}

WhatsApp Conversation Logs:
{conversation_text}
"""

    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': api_key
    }

    def make_call(url):
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            answer_text = res_json['candidates'][0]['content']['parts'][0]['text']
            return json.loads(answer_text.strip())

    try:
        try:
            return make_call(url_v1)
        except Exception:
            return make_call(url_beta)
    except Exception as e:
        print(f"Gemini API query error: {str(e)}")
        return None

def main():
    api_key = load_api_key()
    if not api_key:
        print("Google API Key not loaded. Aborting memory extraction.")
        return

    if not os.path.exists(SESSIONS_FILE):
        print("Sessions mapping file not found. Nothing to extract.")
        return

    # Load existing memories
    memories = {}
    if os.path.exists(MEMORY_FILE):
        try:
            with open(MEMORY_FILE, 'r') as f:
                memories = json.load(f)
        except Exception:
            memories = {}

    # Load session mappings
    with open(SESSIONS_FILE, 'r') as f:
        sessions = json.load(f)

    updated = False
    now_ts = time.time()

    for key, val in sessions.items():
        phone = key.split(':')[-1]
        sid = val.get('session_id') if isinstance(val, dict) else val
        jsonl_path = os.path.expanduser(f'~/.hermes/sessions/{sid}.jsonl')

        if not os.path.exists(jsonl_path):
            continue

        # Skip if session file was not modified in the last 7 days
        mtime = os.path.getmtime(jsonl_path)
        if now_ts - mtime > 7 * 24 * 60 * 60:
            continue

        # Check last processed time vs file modification time to avoid duplicate processing
        existing_lead_mem = memories.get(phone, {})
        last_processed = existing_lead_mem.get('lastProcessedAt', 0)
        if last_processed >= mtime:
            continue

        print(f"Extracting memory profile for lead: {phone}...")

        # Parse messages log
        convo_lines = []
        user_msgs_count = 0
        try:
            with open(jsonl_path, 'r', encoding='utf-8') as jf:
                for line in jf:
                    try:
                        data = json.loads(line.strip())
                        role = data.get('role', '')
                        sender = data.get('sender', '')
                        if role in ['session_meta', 'tool', 'system']:
                            continue
                        is_bot = role in ['assistant', 'agent'] or data.get('isBot', False) or 'agent' in sender
                        
                        text = data.get('content') or data.get('message', {}).get('text') or data.get('text')
                        if isinstance(text, list):
                            text_parts = []
                            for part in text:
                                if isinstance(part, dict):
                                    text_parts.append(part.get('text') or part.get('content') or '')
                                elif isinstance(part, str):
                                    text_parts.append(part)
                            text = " ".join(filter(None, text_parts))
                        elif isinstance(text, dict):
                            text = text.get('text') or text.get('content') or ''
                        elif not isinstance(text, str):
                            text = str(text) if text is not None else ''
                            
                        if not text and 'message' in data and isinstance(data['message'], str):
                            text = data['message']
                            
                        speaker = "Agent" if is_bot else "Customer"
                        if not is_bot:
                            user_msgs_count += 1
                        
                        convo_lines.append(f"{speaker}: {text}")
                    except Exception:
                        pass
        except Exception as e:
            print(f"Error parsing log file {jsonl_path}: {e}")
            continue

        # Exclude leads with less than 2 user exchanges
        if user_msgs_count < 2:
            continue

        convo_text = "\n".join(convo_lines[-25:]) # Use last 25 message exchanges for context
        extracted = get_gemini_memory(convo_text, api_key)
        
        if extracted:
            # Merge and preserve custom notes and statuses
            memories[phone] = {
                "name": extracted.get('name', phone),
                "profession": extracted.get('profession', 'Unknown'),
                "intent": extracted.get('intent', 'warm'),
                "objections": extracted.get('objections', 'None'),
                "summary": extracted.get('summary', ''),
                "notes": existing_lead_mem.get('notes', ''),
                "status": existing_lead_mem.get('status', 'Follow-up Needed'),
                "lastProcessedAt": mtime,
            }
            updated = True
            time.sleep(1) # Rate limit delay

    if updated:
        with open(MEMORY_FILE, 'w') as f:
            json.dump(memories, f, indent=2)
        print("Memory extraction run complete. lead_memory.json updated.")
    else:
        print("No new updates found. Memory registry is in sync.")

if __name__ == '__main__':
    main()
