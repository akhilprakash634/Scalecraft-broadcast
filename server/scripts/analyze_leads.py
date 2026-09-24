# 5 core categories. To add more: add to CATEGORY_MAP, add keywords to analyze_leads.py, add UI badge and filter
import json
import os
import re
import argparse
from datetime import datetime, timezone

# 5 core categories. To add more: add to CATEGORY_MAP, add keywords to analyze_leads.py, add UI badge and filter
CATEGORY_KEYWORDS = {
    'local_services': {
        'buying_signals': [
            "booking", "appointment", "slot", "available",
            "table", "order", "delivery", "visit", "timing",
            "price", "how much", "when", "today", "tomorrow",
            "home service", "home delivery", "cost", "rate",
            "can i book", "want to order", "interested"
        ],
        'negative_signals': [
            "wrong number", "not interested", "no thanks",
            "too expensive", "bye", "ok bye", "stop"
        ],
        'follow_up_signals': [
            "later", "will check", "next week", "will visit",
            "planning to come", "will book", "tomorrow maybe"
        ]
    },
    'ecommerce': {
        'buying_signals': [
            "price", "cost", "available", "stock", "in stock",
            "delivery", "shipping", "cod", "buy", "order",
            "size", "color", "offer", "discount", "rate",
            "how much", "is it available", "can i order",
            "want to buy", "interested in buying"
        ],
        'negative_signals': [
            "too expensive", "found cheaper", "not needed",
            "out of budget", "bye", "not interested"
        ],
        'follow_up_signals': [
            "will think", "check with family", "will decide",
            "might buy", "considering", "let me check"
        ]
    },
    'real_estate': {
        'buying_signals': [
            "bhk", "bedroom", "flat", "apartment", "villa",
            "plot", "land", "price", "budget", "loan", "emi",
            "site visit", "visit", "sqft", "square feet",
            "location", "area", "available", "ready to move",
            "interested in buying", "looking for property"
        ],
        'negative_signals': [
            "too expensive", "already bought", "not looking",
            "changed plans", "bye", "not interested"
        ],
        'follow_up_signals': [
            "will discuss with family", "need time", "will think",
            "check budget", "will visit", "planning next month"
        ]
    },
    'professional': {
        'buying_signals': [
            "quote", "proposal", "price", "cost", "fees",
            "timeline", "when can you start", "package",
            "course", "batch", "admission", "demo", "trial",
            "portfolio", "sample", "how much", "interested",
            "need a website", "need an app", "need help with"
        ],
        'negative_signals': [
            "found someone else", "not needed now", "too expensive",
            "budget constraint", "decided to wait", "bye"
        ],
        'follow_up_signals': [
            "discuss with team", "need approval", "send proposal",
            "will get back", "checking budget", "will decide soon"
        ]
    },
    'scalecraft': {
        'buying_signals': [
            "price", "cost", "setup", "install", "how much",
            "monthly", "whatsapp ai", "chatbot", "demo",
            "buy", "purchase", "payment", "link", "how to pay",
            "saas", "subscription", "agent", "interested",
            "want to try", "how does it work", "show me"
        ],
        'negative_signals': [
            "not interested", "too expensive", "already have",
            "using something else", "bye", "not needed"
        ],
        'follow_up_signals': [
            "will think", "check later", "send more info",
            "will discuss", "maybe next month", "considering"
        ]
    }
}

SCALECRAFT_PRODUCTS = [
    "AI Lead Finder", "Lead Finder",
    "AI Client Acquisition", "Acquisition System",
    "Complete Bundle", "Bundle",
    "ScaleCraft Agent", "Agent",
    "DIY", "DFY", "Done For You",
    "SaaS", "Managed", "6499", "2999", "4999", "1299"
]

def parse_iso(ts):
    if not ts:
        return None
    ts_clean = ts.replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(ts_clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except:
        try:
            return datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        except:
            return None

def detect_language(text):
    # Malayalam unicode range: 0D00-0D7F
    if re.search(r'[\u0d00-\u0d7f]', text):
        return 'malayalam'
    # Arabic unicode range: 0600-06FF, 0750-077F, 08A0-08FF, FB50-FDFF, FE70-FEFF
    if re.search(r'[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]', text):
        return 'arabic'
    return 'english'

def has_any_phrase(text, phrases):
    for p in phrases:
        if p in text:
            return True
    return False

def extract_name(text):
    patterns = [
        r"(?i)\bmy name is\s+([a-zA-Z\s]{2,30})",
        r"(?i)\bthis is\s+([a-zA-Z\s]{2,30})",
        r"(?i)\bcall me\s+([a-zA-Z\s]{2,30})"
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return m.group(1).strip()
    return None

def extract_address_and_location(text):
    # Address signals (English only)
    address_kws = ["street", "road", "house", "hno", "flat", "apartment", "pincode", "pin po", "near by", "opposite", "landmark", "address"]
    has_address = any(kw in text.lower() for kw in address_kws)
    
    # Common locations
    locations = ["ernakulam", "kochi", "trivandrum", "calicut", "kottayam", "thrissur", "kollam", "kannur", "palakkad", "dubai", "sharjah", "abudhabi", "ajman"]
    location = None
    for loc in locations:
        if loc in text.lower():
            location = loc.capitalize()
            break
            
    return has_address, location

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--category', default='local_services')
    parser.add_argument('--products-file', default='/home/ubuntu/products.json')
    parser.add_argument('--profile', default='')
    parser.add_argument('--output-file', default='/home/ubuntu/lead_analysis.json')
    args = parser.parse_args()
    
    category = args.category
    products_file = args.products_file
    profile = args.profile

    if profile:
        profile_root = os.path.expanduser(f'~/.hermes/profiles/{profile}')
    else:
        profile_root = os.path.expanduser('~/.hermes')

    sessions_file = os.path.join(profile_root, 'sessions/sessions.json')
    sessions_dir = os.path.join(profile_root, 'sessions')
    
    # Load products configuration
    products = []
    if os.path.exists(products_file):
        try:
            with open(products_file) as pf:
                products_data = json.load(pf)
                if isinstance(products_data, list):
                    products = [p.get('name') for p in products_data if p.get('name')]
        except:
            pass

    # Build mapping phone -> session_file
    phone_to_session = {}
    if os.path.exists(sessions_file):
        try:
            with open(sessions_file) as f:
                sessions = json.load(f)
            for key, val in sessions.items():
                if "whatsapp" in key:
                    phone = key.split(':')[-1]
                    sid = val.get('session_id') if isinstance(val, dict) else val
                    if sid:
                        phone_to_session[phone] = f"{sid}.jsonl"
        except:
            pass

    # Fallback to direct *.jsonl files listing if empty
    if not phone_to_session and os.path.exists(sessions_dir):
        try:
            for fn in os.listdir(sessions_dir):
                if fn.endswith('.jsonl'):
                    phone_to_session[fn[:-6]] = fn
        except:
            pass

    analyzed_leads = []
    now = datetime.now(timezone.utc)

    for phone, session_file in phone_to_session.items():
        sid = session_file.replace('.jsonl', '')
        messages = []
        
        # Try SQLite state.db first
        db_path = os.path.join(profile_root, 'state.db')
        if os.path.exists(db_path):
            try:
                import sqlite3
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY id ASC",
                    (sid,)
                )
                for m_role, m_content, m_timestamp in cursor.fetchall():
                    if m_role in ['session_meta', 'tool', 'system']:
                        continue
                    is_bot = m_role in ['assistant', 'agent']
                    
                    ts_str = ""
                    if isinstance(m_timestamp, (int, float)):
                        try:
                            ts_str = datetime.fromtimestamp(m_timestamp, tz=timezone.utc).isoformat().replace('+00:00', 'Z')
                        except:
                            ts_str = str(m_timestamp)
                    else:
                        ts_str = str(m_timestamp or '')
                        
                    messages.append({
                        "role": "assistant" if is_bot else "user",
                        "content": m_content or '',
                        "timestamp": ts_str
                    })
                conn.close()
            except Exception:
                messages = []

        # Fallback to jsonl files if state.db read failed or was empty
        if not messages:
            jsonl_path = os.path.join(sessions_dir, session_file)
            if os.path.exists(jsonl_path):
                try:
                    with open(jsonl_path, 'rb') as jf:
                        for line in jf:
                            try:
                                data = json.loads(line.decode('utf-8'))
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
                                    
                                ts_val = data.get('timestamp', '')
                                ts_str = ""
                                if isinstance(ts_val, (int, float)):
                                    try:
                                        ts_str = datetime.fromtimestamp(ts_val, tz=timezone.utc).isoformat().replace('+00:00', 'Z')
                                    except:
                                        ts_str = str(ts_val)
                                else:
                                    ts_str = str(ts_val or '')

                                messages.append({
                                    "role": "assistant" if is_bot else "user",
                                    "content": text or '',
                                    "timestamp": ts_str
                                })
                            except:
                                pass
                except:
                    pass

        if not messages:
            continue

        total_messages = len(messages)
        user_messages = sum(1 for m in messages if m['role'] == 'user')
        agent_messages = sum(1 for m in messages if m['role'] == 'assistant')

        first_msg_time_str = messages[0]['timestamp']
        last_msg_time_str = messages[-1]['timestamp']
        first_time = parse_iso(first_msg_time_str)
        last_time = parse_iso(last_msg_time_str)

        days_since_last = 999
        if last_time:
            days_since_last = (now - last_time).days
            if days_since_last < 0:
                days_since_last = 0
        
        conversation_duration_mins = 0
        if first_time and last_time:
            conversation_duration_mins = int((last_time - first_time).total_seconds() / 60)

        # Language Detection
        user_combined_text = " ".join([m['content'] for m in messages if m['role'] == 'user'])
        user_combined_text_lower = user_combined_text.lower()
        language = detect_language(user_combined_text)

        # Extraction and matching details
        shared_phone = None
        shared_name = None
        shared_location = None
        has_address = False
        products_mentioned = []

        # Scoring & intent
        buying_signals_detected = []
        negative_signals_detected = []
        follow_up_signals_detected = []

        # Phone regex
        phone_match = re.search(r'\b[6-9]\d{9}\b', user_combined_text)
        if phone_match:
            shared_phone = phone_match.group(0)
            buying_signals_detected.append("phone shared")

        # Address & Location
        has_address, shared_location = extract_address_and_location(user_combined_text)
        if has_address:
            buying_signals_detected.append("address shared")

        # Extract name from session metadata
        session_val = None
        if os.path.exists(sessions_file):
            try:
                for k, v in sessions.items():
                    if k.endswith(f":{phone}"):
                        session_val = v
                        break
            except:
                pass
        
        if isinstance(session_val, dict):
            shared_name = session_val.get('display_name') or (session_val.get('origin', {}).get('chat_name') if isinstance(session_val.get('origin'), dict) else None)

        if not shared_name:
            for m in messages:
                if m['role'] == 'user':
                    name_extracted = extract_name(m['content'])
                    if name_extracted:
                        shared_name = name_extracted
                        break

        # Check products mentioned in the entire conversation history (both user and agent)
        combined_convo_text = " ".join([m['content'] for m in messages]).lower()
        if category == 'scalecraft':
            for prod in SCALECRAFT_PRODUCTS:
                if prod.lower() in combined_convo_text:
                    products_mentioned.append(prod)
        else:
            for prod in products:
                if prod.lower() in combined_convo_text:
                    products_mentioned.append(prod)

        # Deduplicate redundant substring matches (e.g., keep 'Complete Bundle' and remove 'Bundle')
        if products_mentioned:
            unique_prods = []
            for p in products_mentioned:
                is_substring = any(p != other and p.lower() in other.lower() for other in products_mentioned)
                if not is_substring:
                    unique_prods.append(p)
            products_mentioned = unique_prods

        # Universal Signals
        strong_buy_phrases = ["how do i pay", "payment link", "send account", "upi", "gpay", "phonepay", "bank details"]
        mild_buy_phrases = ["interested", "yes", "ok", "sure", "tell me more", "send details", "sounds good"]
        fup_phrases = [
            "later", "tomorrow", "will decide", "need time", "will check", "maybe",
            "nokkatte", "nokeett", "parayam", "naale", "pinne", "chodichitt", "alochichitt",
            "nokkam", "vilikkam", "nokeettu", "alochikam", "next week", "next month",
            "will check later", "let me check", "will let you know"
        ]
        neg_phrases = ["not interested", "no thanks", "bye", "wrong number", "stop messaging", "unsubscribe"]

        for bp in strong_buy_phrases:
            if bp in user_combined_text_lower:
                buying_signals_detected.append(bp)
        for mbp in mild_buy_phrases:
            if mbp in user_combined_text_lower:
                buying_signals_detected.append(mbp)
        for fup in fup_phrases:
            if fup in user_combined_text_lower:
                follow_up_signals_detected.append(fup)
        for np in neg_phrases:
            if np in user_combined_text_lower:
                negative_signals_detected.append(np)

        # Category Specific Signals
        cat_kws = CATEGORY_KEYWORDS.get(category, CATEGORY_KEYWORDS['local_services'])
        for bp in cat_kws['buying_signals']:
            if bp in user_combined_text_lower and bp not in buying_signals_detected:
                buying_signals_detected.append(bp)
        for np in cat_kws['negative_signals']:
            if np in user_combined_text_lower and np not in negative_signals_detected:
                negative_signals_detected.append(np)
        for fup in cat_kws['follow_up_signals']:
            if fup in user_combined_text_lower and fup not in follow_up_signals_detected:
                follow_up_signals_detected.append(fup)

        # Calculate capped/normalized intent score (0-10)
        has_phone = bool(phone_match)
        has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', user_combined_text))
        
        contact_score = 0.0
        if has_phone or has_email:
            contact_score += 1.5
        if has_address:
            contact_score += 1.5

        strong_count = sum(1 for bp in strong_buy_phrases if bp in user_combined_text_lower)
        mild_count = sum(1 for mbp in mild_buy_phrases if mbp in user_combined_text_lower)
        cat_buy_count = sum(1 for bp in cat_kws['buying_signals'] if bp in user_combined_text_lower)
        
        buying_raw = (2.0 * strong_count) + (1.0 * mild_count) + (1.0 * cat_buy_count)
        buying_score = min(5.0, buying_raw)
        
        followup_score = min(2.0, 1.0 * len(follow_up_signals_detected))
        negative_penalty = 3.0 * len(negative_signals_detected)
        
        intent_score = max(0, min(10, int(round(contact_score + buying_score + followup_score - negative_penalty))))

        # Context Extractors & Requirements Builder
        requirements = {}
        if category == 'local_services':
            m_party = re.search(r'\b(\d+)\s*(people|persons|pax|members)\b', user_combined_text_lower)
            if m_party:
                requirements['party_size'] = m_party.group(0)
            times = [w for w in ["today", "tomorrow", "evening", "morning", "weekend"] if w in user_combined_text_lower]
            if times:
                requirements['time_mentioned'] = ", ".join(times)
            services = [p for p in products if p.lower() in user_combined_text_lower]
            if services:
                requirements['service_mentioned'] = ", ".join(services)
                
        elif category == 'ecommerce':
            prods = [p for p in products if p.lower() in user_combined_text_lower]
            if prods:
                requirements['product_mentioned'] = ", ".join(prods)
            m_budget = re.search(r'\b(rs\.?\s*\d+|inr\s*\d+|\d+\s*rupees)\b', user_combined_text_lower)
            if m_budget:
                requirements['budget_mentioned'] = m_budget.group(0)
                
        elif category == 'real_estate':
            m_bhk = re.search(r'\b(\d+\s*bhk|\d+\s*bedroom)\b', user_combined_text_lower)
            if m_bhk:
                requirements['bhk_type'] = m_bhk.group(0)
            m_budget = re.search(r'\b(\d+\s*(lakh|lac|cr|crore|l))\b', user_combined_text_lower)
            if m_budget:
                requirements['budget'] = m_budget.group(0)
            m_loc = re.search(r'\bin\s+([a-zA-Z\s]{3,20})|\bat\s+([a-zA-Z\s]{3,20})|\bnear\s+([a-zA-Z\s]{3,20})', user_combined_text)
            if m_loc:
                requirements['location'] = (m_loc.group(1) or m_loc.group(2) or m_loc.group(3)).strip()
            props = [w for w in ["flat", "villa", "plot", "commercial", "apartment"] if w in user_combined_text_lower]
            if props:
                requirements['property_type'] = ", ".join(props)
                
        elif category == 'professional':
            services = [w for w in ["website", "app", "seo", "gst", "tax", "course", "coaching"] if w in user_combined_text_lower]
            if services:
                requirements['service_type'] = ", ".join(services)
            m_budget = re.search(r'\b(\d+\s*(k|thousand|lakh))\b', user_combined_text_lower)
            if m_budget:
                requirements['budget_mentioned'] = m_budget.group(0)
            timelines = [w for w in ["urgent", "next month", "3 months", "no rush"] if w in user_combined_text_lower]
            if timelines:
                requirements['timeline'] = ", ".join(timelines)
                
        elif category == 'scalecraft':
            matched_sc_prods = [p for p in SCALECRAFT_PRODUCTS if p.lower() in user_combined_text_lower]
            if matched_sc_prods:
                requirements['product_interest'] = ", ".join(matched_sc_prods)
            prof = None
            if "freelancer" in user_combined_text_lower or "agency" in user_combined_text_lower:
                prof = "freelancer/agency"
            elif "business" in user_combined_text_lower or "owner" in user_combined_text_lower:
                prof = "business owner"
            if prof:
                requirements['profession'] = prof
            if any(w in user_combined_text_lower for w in ["expensive", "price", "discount", "cost", "free"]):
                requirements['budget_concern'] = True

        # Determine last message sender
        last_message_from = "unknown"
        if messages:
            last_message_from = "agent" if messages[-1]['role'] == 'assistant' else "customer"

        # Count customer question marks
        customer_questions = sum(m['content'].count('?') for m in messages if m['role'] == 'user')

        # Check user combined text for email
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', user_combined_text)
        shared_email = email_match.group(0) if email_match else None
        shared_contact = bool(shared_phone or shared_email)

        # Detect negative/dead and converted status
        is_dead = has_any_phrase(user_combined_text_lower, [
            "not interested", "no thank you", "no thanks", "wrong number", 
            "stop", "unsubscribe", "please stop", "don't message", 
            "dont message", "not looking", "wrong person", "remove me"
        ])
        
        is_converted = has_any_phrase(user_combined_text_lower, [
            "payment done", "payment completed", "payment successful",
            "completed onboarding", "onboarding completed", "booking confirmed",
            "table booked", "booked table", "already paid", "paid successfully",
            "successfully paid", "amount paid", "done payment"
        ])

        # Follow-up detection logic rules
        follow_up_score = 0
        follow_up_reasons = []

        # Rule 1 - Explicit follow-up signals
        rule1_keywords = [
            "later", "tomorrow", "next week", "will think", "will decide", "let me know", "will check",
            "planning to", "will come", "might", "maybe", "will get back", "send more info", "need time",
            "discuss with family", "will discuss", "considering", "next month", "will try", "will see"
        ]
        has_rule1 = any(kw in user_combined_text_lower for kw in rule1_keywords)
        if has_rule1:
            follow_up_score += 3
            follow_up_reasons.append("Customer said will think about it")

        # Rule 2 - Conversation ended without resolution
        user_msgs = [m for m in messages if m['role'] == 'user']
        last_user_msg = user_msgs[-1]['content'].lower() if user_msgs else ""
        last_customer_msg_not_negative = not has_any_phrase(last_user_msg, [
            "not interested", "no thank you", "no thanks", "wrong number", "stop", "unsubscribe", "bye", "ok bye"
        ])
        has_rule2 = (
            last_message_from == "agent" and 
            total_messages >= 4 and 
            last_customer_msg_not_negative and 
            days_since_last >= 2
        )
        if has_rule2:
            follow_up_score += 3
            follow_up_reasons.append("Conversation ended without response from customer")

        # Rule 3 - Price sensitivity signals
        price_keywords = ["price", "cost", "how much", "rate", "expensive", "discount", "offer", "cheaper", "budget", "affordable", "any offer"]
        mentioned_price = any(pk in user_combined_text_lower for pk in price_keywords)
        has_rule3 = mentioned_price and not is_dead
        if has_rule3:
            follow_up_score += 3
            follow_up_reasons.append("Customer asked about pricing but did not commit")

        # Rule 4 - Partial interest
        has_rule4 = customer_questions >= 2 and not is_converted and not is_dead
        if has_rule4:
            follow_up_score += 2
            follow_up_reasons.append("Customer asked multiple questions without committing")

        # Rule 5 - Long conversation, no conversion
        has_rule5 = total_messages >= 8 and not is_converted and not is_dead
        if has_rule5:
            follow_up_score += 2
            follow_up_reasons.append(f"Long conversation ({total_messages} messages) with no resolution")

        # Rule 6 - Shared contact but no follow through
        has_rule6 = shared_contact and not is_converted
        if has_rule6:
            follow_up_score += 2
            follow_up_reasons.append("Customer shared contact but no booking confirmed")

        follow_up_reason = "; ".join(follow_up_reasons) if follow_up_reasons else "No follow-up reason"

        # Price sensitive detection
        price_signals = [
            "how much", "what is the price", "too expensive",
            "any discount", "cheaper", "offer", "coupon",
            "budget", "affordable", "any deal", "less price",
            "can you reduce", "any offer", "price high",
            "cost too much", "out of budget"
        ]
        price_signals_found = [sig for sig in price_signals if sig in user_combined_text_lower]
        is_price_sensitive = (
            len(price_signals_found) > 0 and 
            total_messages >= 4 and 
            not is_dead and 
            not is_converted
        )

        # Intent Classification
        has_negative = len(negative_signals_detected) > 0 or is_dead
        has_follow_up = len(follow_up_signals_detected) > 0

        if user_messages <= 1 and len(buying_signals_detected) == 0:
            intent = 'spam'
        elif intent_score < 0 or has_negative:
            intent = 'not_interested'
        elif follow_up_score >= 2:
            intent = 'follow_up'
        elif has_follow_up:
            intent = 'follow_up'
        elif intent_score >= 6 and days_since_last <= 7:
            intent = 'hot'
        elif intent_score >= 2 and days_since_last <= 30:
            intent = 'warm'
        elif intent_score >= 0 and days_since_last > 30:
            intent = 'cold'
        else:
            if days_since_last > 30:
                intent = 'cold'
            else:
                intent = 'warm'

        # Conversation Summary
        if len(negative_signals_detected) > 0 or is_dead:
            summary = "Not interested / Declined"
        elif len(buying_signals_detected) > 0 and ("book" in buying_signals_detected or "booking" in buying_signals_detected or "appointment" in buying_signals_detected):
            summary = "Booking/appointment request"
        elif len(buying_signals_detected) > 0 and ("price" in buying_signals_detected or "cost" in buying_signals_detected or "how much" in buying_signals_detected):
            if products_mentioned:
                summary = f"Asked about pricing for {', '.join(products_mentioned)}"
            else:
                summary = "Asked about pricing"
        elif products_mentioned:
            summary = f"Enquired about {', '.join(products_mentioned)}"
        elif total_messages < 3:
            summary = "Brief enquiry"
        elif total_messages > 20:
            topic = products_mentioned[0] if products_mentioned else "general enquiry"
            summary = f"Long conversation - {topic}"
        else:
            summary = "General sales enquiry"

        real_phone = phone
        if profile:
            session_dir_path = os.path.expanduser(f"~/.hermes/profiles/{profile}/platforms/whatsapp/session")
        else:
            session_dir_path = os.path.expanduser("~/.hermes/whatsapp/session")
        for suffix in ("", "_reverse"):
            mapping_path = os.path.join(session_dir_path, f"lid-mapping-{phone}{suffix}.json")
            if os.path.exists(mapping_path):
                try:
                    with open(mapping_path) as mf:
                        raw_val = json.load(mf)
                        if "s.whatsapp.net" in raw_val:
                            real_phone = raw_val.split("@")[0].replace("+", "")
                            break
                except:
                    pass

        analyzed_leads.append({
            "phone": real_phone,
            "session_file": session_file,
            "total_messages": total_messages,
            "user_messages": user_messages,
            "agent_messages": agent_messages,
            "first_message": first_msg_time_str,
            "last_message": last_msg_time_str,
            "days_since_last": days_since_last,
            "conversation_duration_mins": conversation_duration_mins,
            "language": language,
            "intent_score": intent_score,
            "intent": intent,
            "category": category,
            "products_mentioned": products_mentioned,
            "buying_signals": buying_signals_detected,
            "negative_signals": negative_signals_detected,
            "follow_up_signals": follow_up_signals_detected,
            "shared_phone": shared_phone,
            "shared_name": shared_name,
            "shared_location": shared_location,
            "requirements": requirements,
            "summary": summary,
            "follow_up_score": follow_up_score,
            "follow_up_reason": follow_up_reason,
            "is_price_sensitive": is_price_sensitive,
            "price_signals_found": price_signals_found,
            "customer_questions": customer_questions,
            "last_message_from": last_message_from
        })

    # Save outputs
    output_path = args.output_file
    with open(output_path, 'w', encoding='utf-8') as out_f:
        json.dump(analyzed_leads, out_f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    main()
