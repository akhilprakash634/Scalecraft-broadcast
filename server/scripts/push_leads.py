import os
import json
import datetime

# Attempt to load Google API clients.
# We wrap this so the script does not crash on servers missing pip modules.
GSPREAD_AVAILABLE = False
try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    pass

# Paths
SESSIONS_FILE = os.path.expanduser('~/.hermes/sessions/sessions.json')
MEMORY_FILE = os.path.expanduser('~/.hermes/lead_memory.json')
CONFIG_FILE = os.path.expanduser('~/.hermes/config')
CREDS_FILE = '/home/ubuntu/google_creds.json'

def load_sheets_id():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                data = json.load(f)
                return data.get('sheets_id')
        except Exception:
            # Fallback for raw text config
            with open(CONFIG_FILE, 'r') as f:
                for line in f:
                    if 'sheets_id' in line:
                        return line.strip().split('=')[-1].strip().replace('"', '').replace("'", "")
    return None

def classify_lead(messages, memory_status):
    # If manual status is already overridden by user in CRM
    if memory_status in ['No Follow-up', 'Converted', 'Review Manually', 'Follow-up Needed']:
        return memory_status

    user_messages = [m for m in messages if m.get('sender') == 'customer']
    bot_messages = [m for m in messages if m.get('sender') == 'agent']
    user_count = len(user_messages)

    if user_count == 0:
        return 'No Follow-up'

    # Combine all user texts
    user_text = " ".join([m.get('text', '').lower() for m in user_messages])

    # No follow-up keywords
    no_interest_keywords = ['not interested', 'no thanks', 'bye', 'thank you bye', 'stop', 'dont message', 'wrong number']
    if any(kw in user_text for kw in no_interest_keywords):
        return 'No Follow-up'

    # Follow-up keywords
    interest_keywords = ['price', 'how much', 'cost', 'interested', 'buy', 'notion', 'setup', 'server', 'vps', 'later', 'tomorrow', 'planning']
    if any(kw in user_text for kw in interest_keywords) or user_count >= 3:
        return 'Follow-up Needed'

    return 'Review Manually'

def compile_leads_data():
    import re
    if not os.path.exists(SESSIONS_FILE):
        return []

    with open(SESSIONS_FILE, 'r') as f:
        sessions = json.load(f)

    memories = {}
    if os.path.exists(MEMORY_FILE):
        try:
            with open(MEMORY_FILE, 'r') as f:
                memories = json.load(f)
        except Exception:
            pass

    leads_list = []
    for key, val in sessions.items():
        phone = key.split(':')[-1]
        sid = val.get('session_id') if isinstance(val, dict) else val
        jsonl_path = os.path.expanduser(f'~/.hermes/sessions/{sid}.jsonl')

        messages = []
        last_msg = ""
        last_time = ""
        if os.path.exists(jsonl_path):
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
                                
                            messages.append({
                                "role": "assistant" if is_bot else "user",
                                "content": text or '',
                                "timestamp": data.get('timestamp', '')
                            })
                        except Exception:
                            pass
                if messages:
                    last_msg = messages[-1]['content']
                    last_time = messages[-1]['timestamp']
            except Exception:
                pass

        # Smart extraction logic in python sync script
        name = ""
        if isinstance(val, dict):
            name = val.get('display_name') or (val.get('origin', {}).get('chat_name') if isinstance(val.get('origin'), dict) else '')
        contact_phone = ""
        table_booking = False
        party_size = 0
        booking_time = ""
        special_requests = ""
        service_required = ""
        appointment_date = ""
        property_type = ""
        budget = ""
        location = ""
        product_interest = []
        price_discussed = ""
        objection = ""
        next_action = ""
        
        name_patterns = [
            r"(?i)\bmy name is\s+([a-zA-Z\s]{2,30})",
            r"(?i)\bthis is\s+([a-zA-Z\s]{2,30})",
            r"(?i)\bcalls? me\s+([a-zA-Z\s]{2,30})"
        ]
        
        phone_pattern = r"(\+91|91)?[6-9]\d{9}"
        
        party_patterns = [
            r"(?i)(\d+)\s*(?:people|person|pax|guest|seat|member)",
            r"(?i)(?:table for|party of)\s*(\d+)",
            r"(?i)family of\s*(\d+)"
        ]
        
        booking_keywords = ["book", "reserve", "appointment", "schedule", "slot", "table", "booking", "reservation"]
        date_time_patterns = [
            r"(?i)\b(?:today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
            r"\b\d{1,2}(?:am|pm)\b",
            r"\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b"
        ]
        
        realestate_kws = ["bhk", "apartment", "flat", "villa", "plot", "house", "rent", "sale", "buy"]
        salon_kws = ["haircut", "facial", "massage", "pedicure", "manicure", "salon", "spa", "threading", "waxing"]
        restaurant_kws = ["table", "seat", "dine", "lunch", "dinner", "food", "menu", "biriyani", "curry", "pizza", "burger"]
        
        last_agent_was_name_prompt = False
        questions_count = 0
        
        for msg in messages:
            role = msg['role']
            content = msg['content']
            
            if role == 'assistant':
                if any(p in content.lower() for p in ["your name", "good name", "who am i speaking to", "speaking with"]):
                    last_agent_was_name_prompt = True
                else:
                    last_agent_was_name_prompt = False
                if any(ob in content.lower() for ob in ["expensive", "too high", "no budget", "other provider", "cannot afford"]):
                    objection = "Pricing/Objection"
            else:
                if "?" in content:
                    questions_count += 1
                if last_agent_was_name_prompt and not name:
                    words = content.strip().split()
                    if words:
                        filler = ["my", "name", "is", "this", "speaking", "here"]
                        filtered = [w for w in words if w.lower() not in filler]
                        if filtered:
                            name = " ".join(filtered[:3])
                for pat in name_patterns:
                    m = re.search(pat, content)
                    if m and not name:
                        name = m.group(1).strip()
                        break
                m_phone = re.search(phone_pattern, content)
                if m_phone:
                    contact_phone = m_phone.group(0)
                for pat in party_patterns:
                    m = re.search(pat, content)
                    if m:
                        try:
                            party_size = int(m.group(1))
                        except:
                            pass
                        break
                if any(kw in content.lower() for kw in booking_keywords):
                    table_booking = True
                for pat in date_time_patterns:
                    m = re.search(pat, content)
                    if m:
                        booking_time = content
                        appointment_date = content
                        break
                if any(kw in content.lower() for kw in realestate_kws):
                    property_type = "Residential"
                    if any(loc in content.lower() for loc in ["kochi", "ernakulam", "bangalore"]):
                        location = "Kochi"
                for kw in salon_kws:
                    if kw in content.lower():
                        service_required = kw.capitalize()
                price_match = re.search(r"(?:Rs\.?|INR|₹)\s*(\d+(?:\s*(?:Lakh|Cr|k|thousand))?)", content)
                if price_match:
                    price_discussed = price_match.group(0)
                    budget = price_match.group(0)
                for kw in restaurant_kws + realestate_kws + salon_kws:
                    if kw in content.lower() and kw not in product_interest:
                        product_interest.append(kw)

        mem = memories.get(phone, {})
        status = classify_lead(messages, mem.get('status'))
        
        user_text_lower = " ".join([m['content'].lower() for m in messages if m['role'] == 'user'])
        
        def has_any_phrase(text, phrases):
            for p in phrases:
                if p in text:
                    return True
            return False
            
        is_dead = has_any_phrase(user_text_lower, [
            "not interested", "no thank you", "no thanks", "wrong number", 
            "stop", "unsubscribe", "please stop", "don't message", 
            "dont message", "not looking", "wrong person", "remove me"
        ])
        
        is_converted = has_any_phrase(user_text_lower, [
            "payment done", "payment completed", "payment successful",
            "completed onboarding", "onboarding completed", "booking confirmed",
            "table booked", "booked table", "already paid", "paid successfully",
            "successfully paid", "amount paid", "done payment"
        ])
        
        is_hot = has_any_phrase(user_text_lower, [
            "confirm", "book it", "please book", "reserve", "appointment", 
            "interested", "want to buy", "send link", "send the link", 
            "details please", "need details", "yes", "sure"
        ])
        
        asked_pricing = has_any_phrase(user_text_lower, [
            "price", "cost", "how much", "rate", "charge", "fee", "pricing", 
            "discount", "plans", "pricing plans"
        ])
        asked_questions = questions_count >= 2
        
        fallback_intent = "cold"
        if is_dead:
            fallback_intent = "dead"
        elif is_converted:
            fallback_intent = "hot"
        elif is_hot:
            fallback_intent = "hot"
        elif asked_pricing or asked_questions:
            fallback_intent = "warm"
            
        # Merge memories overrides
        name = mem.get('name', '') or name or phone
        intent = mem.get('intent', '') or fallback_intent
        summary = mem.get('summary', '') or "No summary available"
        objection = mem.get('objections', '') or objection or "None"
        analyzed_at = mem.get('analyzedAt', '')

        # Construct flat string fields for sheets compatibility
        req_desc = ""
        if table_booking:
            req_desc = f"Table booking for {party_size} pax"
        elif service_required:
            req_desc = f"Salon service: {service_required}"
        elif property_type:
            req_desc = f"Real Estate: {property_type} in {location or 'any'}"
        else:
            req_desc = "General Inquiry"

        leads_list.append({
            "phone": phone,
            "name": name,
            "intent": intent,
            "status": status,
            "lastContact": last_time,
            "messagesCount": len(messages),
            "requirements": req_desc,
            "productsDiscussed": ", ".join(product_interest) if product_interest else "None",
            "budget": budget or price_discussed or "N/A",
            "bookingDetails": booking_time or appointment_date or "N/A",
            "contactGiven": contact_phone or phone,
            "summary": summary,
            "analyzedAt": analyzed_at or "N/A"
        })
    return leads_list

def main():
    print("Compiling leads dataset from local Hermes sessions...")
    leads = compile_leads_data()
    if not leads:
        print("No leads found in sessions database.")
        return

    sheets_id = load_sheets_id()
    if not sheets_id:
        print("Google Sheet ID is not configured in ~/.hermes/config.")
        return

    if not GSPREAD_AVAILABLE:
        print("Error: python modules 'gspread' or 'google-auth' not installed on VPS. Cannot sync to Sheets.")
        print("Please install them: pip3 install gspread google-auth")
        return

    if not os.path.exists(CREDS_FILE):
        print(f"Google Service account credentials not found at {CREDS_FILE}")
        return

    try:
        scope = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        creds = Credentials.from_service_account_file(CREDS_FILE, scopes=scope)
        gc = gspread.authorize(creds)
        sh = gc.open_by_key(sheets_id)
        print(f"Connected to Google Sheet: {sh.title}")

        tabs_needed = ['All Leads', 'Follow-up Needed', 'Converted', 'Analytics']
        worksheets = {ws.title: ws for ws in sh.worksheets()}

        for title in tabs_needed:
            if title not in worksheets:
                sh.add_worksheet(title=title, rows=100, cols=12)
                print(f"Created worksheet tab: {title}")

        worksheets = {ws.title: ws for ws in sh.worksheets()}

        # Improved Columns structure
        headers = [
            'Phone', 'Name', 'Intent', 'Last Active', 'Messages',
            'Requirements', 'Products Discussed', 'Budget',
            'Booking Details', 'Contact Given', 'Summary', 'Analyzed At'
        ]

        # 1. Update "All Leads"
        ws_all = worksheets['All Leads']
        ws_all.clear()
        all_rows = [headers]
        for l in leads:
            all_rows.append([
                l['phone'], l['name'], l['intent'], l['lastContact'], l['messagesCount'],
                l['requirements'], l['productsDiscussed'], l['budget'],
                l['bookingDetails'], l['contactGiven'], l['summary'], l['analyzedAt']
            ])
        ws_all.update('A1', all_rows)
        print("Uploaded All Leads tab.")

        # 2. Update "Follow-up Needed"
        ws_follow = worksheets['Follow-up Needed']
        ws_follow.clear()
        follow_rows = [headers]
        for l in leads:
            if l['status'] == 'Follow-up Needed' or l['status'] == 'Review Manually':
                follow_rows.append([
                    l['phone'], l['name'], l['intent'], l['lastContact'], l['messagesCount'],
                    l['requirements'], l['productsDiscussed'], l['budget'],
                    l['bookingDetails'], l['contactGiven'], l['summary'], l['analyzedAt']
                ])
        ws_follow.update('A1', follow_rows)
        print("Uploaded Follow-up Needed tab.")

        # 3. Update "Converted"
        ws_conv = worksheets['Converted']
        ws_conv.clear()
        conv_rows = [headers]
        for l in leads:
            if l['status'] == 'Converted':
                conv_rows.append([
                    l['phone'], l['name'], l['intent'], l['lastContact'], l['messagesCount'],
                    l['requirements'], l['productsDiscussed'], l['budget'],
                    l['bookingDetails'], l['contactGiven'], l['summary'], l['analyzedAt']
                ])
        ws_conv.update('A1', conv_rows)
        print("Uploaded Converted tab.")

        # 4. Update "Analytics"
        ws_anal = worksheets['Analytics']
        ws_anal.clear()
        
        total_leads = len(leads)
        followups_count = len([l for l in leads if l['status'] == 'Follow-up Needed'])
        converted_count = len([l for l in leads if l['status'] == 'Converted'])
        conversion_rate = f"{round((converted_count / total_leads) * 100, 2)}%" if total_leads > 0 else "0%"
        
        anal_rows = [
          ['Analytics Metric', 'Value'],
          ['Total Leads Logged', total_leads],
          ['Active Follow-ups Needed', followups_count],
          ['Converted Customers', converted_count],
          ['Lead Conversion Rate', conversion_rate],
          ['Last Updated', datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
        ]
        ws_anal.update('A1', anal_rows)
        print("Uploaded Analytics metrics.")

        print("Google Sheets Lead synchronization complete! ✅")

    except Exception as e:
        print(f"Error synchronizing with Google Sheets: {e}")

if __name__ == '__main__':
    main()
