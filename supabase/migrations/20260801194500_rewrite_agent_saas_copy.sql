-- ==============================================================================
-- Seeding Script: ScaleCraft Agent — Managed SaaS Copy Rewrite
-- Run this query directly in your Supabase SQL Editor to update the landing page content.
-- ==============================================================================

-- 1. Update product details in public.saas_products
UPDATE public.saas_products
SET
  description = 'Wasting time on customer questions? Deploy a 24/7 WhatsApp AI agent to answer queries and capture leads.',
  long_description = 'Are you losing leads because you take too long to reply? Local businesses and e-commerce brands miss up to 62% of customer inquiries because they happen outside of business hours.

ScaleCraft Agent solves this by running a dedicated, hosted WhatsApp assistant trained on your business data. It replies instantly, answers repetitive product questions, collects lead contact details, and logs them directly to your CRM—so you never lose a sale to slow response times.',
  features = ARRAY[
    'Dedicated high-speed private server (Mumbai VPS)',
    'Full setup and custom training by our team',
    'Real-time conversation logs dashboard',
    'Auto-synced lead database in Google Sheets',
    'Smart user memory (remembers previous chats)',
    'Usage, message logs, and billing dashboard',
    'Priority founder-level WhatsApp support'
  ],
  meta_title = 'Managed WhatsApp AI Agent for Modern Businesses | ScaleCraft',
  meta_description = 'Deploy a 24/7 fully managed WhatsApp AI assistant. We host, configure, and connect your business data. Auto-capture leads and reply instantly.',
  canonical = 'https://thescalecraft.in/products/scalecraft-agent-saas',
  related_product_ids = ARRAY['ai-systems-combo'],
  section_visibility = section_visibility || '{
    "hero": true,
    "faq": true,
    "benefits": true,
    "preview": true,
    "testimonials": true,
    "related": true,
    "quick_facts": {
      "setup_time": "24-48 Hours",
      "best_for": "E-commerce, Agencies, Local Brands",
      "skill_level": "No Tech Skills Required",
      "delivery": "Fully Managed Installation",
      "platform": "WhatsApp Web / Cloud API",
      "language": "Multi-language Support"
    },
    "preview_sections": [
      {
        "title": "AI Agent Capabilities",
        "icon": "sparkles",
        "items": [
          {
            "title": "Instant WhatsApp Replies",
            "description": "Answers customer queries about pricing, features, and delivery in under 5 seconds."
          },
          {
            "title": "Lead Capture CRM Sync",
            "description": "Extracts phone numbers, names, and intent, then automatically logs them to your Google Sheet."
          }
        ]
      },
      {
        "title": "Dashboard Control",
        "icon": "dashboard",
        "items": [
          {
            "title": "Conversation Log",
            "description": "View active chat history, message count, and system health in real-time."
          },
          {
            "title": "Knowledge Management",
            "description": "Upload a PDF or paste text to instantly retrain the AI agent on new products."
          }
        ]
      }
    ]
  }'::jsonb
WHERE slug = 'scalecraft-agent-saas';

-- 2. Seed FAQs for scalecraft-agent-saas
DELETE FROM public.product_faqs WHERE product_id = 'scalecraft-agent-saas';
INSERT INTO public.product_faqs (product_id, question, answer, sort_order)
VALUES 
('scalecraft-agent-saas', 'Do I need technical skills to set up the agent?', 'None at all. Our team handles the entire server provisioning, installation, configuration, and testing. You only need to provide your business data (like a FAQ document or text file) and link your WhatsApp number.', 0),
('scalecraft-agent-saas', 'Where is the AI agent hosted?', 'Each client receives a private, high-speed VPS server located in Mumbai. This guarantees maximum privacy, uptime, and speed for your messages.', 1),
('scalecraft-agent-saas', 'Will my WhatsApp number get banned?', 'We build the agent using safe, standard API workflows and include custom throttling configurations to mimic natural response patterns, keeping your account compliant with standard business usage.', 2),
('scalecraft-agent-saas', 'Can the agent handle languages other than English?', 'Yes. The AI agent automatically detects the incoming customer''s language and replies fluently in the same language, supporting Hindi, Spanish, Arabic, and 40+ other languages.', 3),
('scalecraft-agent-saas', 'How do I update the agent''s knowledge?', 'You receive a secure admin dashboard where you can paste text updates or upload documents. The agent updates its knowledge base instantly.', 4),
('scalecraft-agent-saas', 'What is the refund policy?', 'We offer a 7-day results guarantee. If the agent does not successfully connect or answer your business queries within the first 7 days, contact us for a full refund.', 5);
