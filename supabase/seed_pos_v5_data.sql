-- =========================================================================
-- ScaleCraft Product Operating System — V5 Schema Data Population
-- Generated for: ScaleCraft Agent, AI Lead Finder System,
--   Freelance Client Pipeline Blueprint, AI Systems Combo,
--   Never Lose a Lead CRM, AI Income Blueprint
-- =========================================================================

-- Safely drop/recreate product_type constraint to support 'course' type
ALTER TABLE saas_products DROP CONSTRAINT IF EXISTS saas_products_product_type_check;
ALTER TABLE saas_products ADD CONSTRAINT saas_products_product_type_check 
  CHECK (product_type IN ('saas', 'digital', 'service', 'bundle', 'course'));

-- 1. saas_products (Match on slug to support both UUID and slug-based IDs)
INSERT INTO saas_products (id, name, slug, product_type, lifecycle_state, version, status) VALUES
('scalecraft-agent', 'ScaleCraft Agent', 'scalecraft-agent', 'saas', 'launching', '1.0.0', 'published'),
('ai-lead-finder-system', 'AI Lead Finder System', 'ai-lead-finder-system', 'digital', 'stable', '1.0.0', 'published'),
('freelance-client-pipeline-blueprint', 'Freelance Client Pipeline Blueprint', 'freelance-client-pipeline-blueprint', 'digital', 'stable', '1.0.0', 'published'),
('ai-systems-combo', 'AI Systems Combo', 'ai-systems-combo', 'bundle', 'best_seller', '1.0.0', 'published'),
('never-lose-a-lead-crm', 'Never Lose a Lead CRM', 'never-lose-a-lead-crm', 'digital', 'stable', '1.0.0', 'published'),
('ai-income-blueprint', 'AI Income Blueprint', 'ai-income-blueprint', 'course', 'launching', '1.0.0', 'published')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  product_type = EXCLUDED.product_type,
  lifecycle_state = EXCLUDED.lifecycle_state,
  version = EXCLUDED.version,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 2. product_marketing
-- ScaleCraft Agent
INSERT INTO product_marketing (
  product_id, localized_name, localized_short_description, localized_long_description,
  localized_solution_statement, personas, competitor_positioning, localized_workflow_steps
) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'scalecraft-agent'),
  '{"en": "ScaleCraft Agent", "hi": "", "ml": "", "ar": ""}',
  '{"en": "AI business assistant that automates customer conversations, lead qualification, and support.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "ScaleCraft Agent handles inbound customer conversations around the clock, automatically qualifying leads and answering support questions so your team only steps in when it matters most.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Save time and never miss a lead by letting AI handle first-response customer communication.", "hi": "", "ml": "", "ar": ""}',
  '[
    {"persona": "Small Business Owner", "pain_points": ["Missed customer messages after hours", "No time to answer every inquiry"], "benefit_focus": "24/7 automated responses that qualify leads before they go cold"},
    {"persona": "Agency Owner", "pain_points": ["Team stretched thin across client accounts", "Inconsistent lead follow-up"], "benefit_focus": "Consistent, branded first-response automation across every client channel"},
    {"persona": "Sales Team Lead", "pain_points": ["Reps waste time on unqualified leads", "Slow response times lose deals"], "benefit_focus": "Instant lead qualification so reps only work warm conversations"}
  ]',
  '[
    {"alternative_name": "Manual live chat / support staff", "drawbacks": "Limited to business hours, inconsistent responses, ongoing staffing cost.", "scalecraft_advantage": "Always-on AI coverage at a fraction of the cost of hiring support staff."},
    {"alternative_name": "Generic chatbot builders", "drawbacks": "Rigid decision trees, no real lead qualification logic.", "scalecraft_advantage": "Purpose-built for lead qualification and support, not just scripted FAQs."}
  ]',
  '[
    {"step_number": 1, "title": "Connect Your Channels", "description": "Link your website chat, WhatsApp, or inbox to ScaleCraft Agent."},
    {"step_number": 2, "title": "Set Your Qualification Rules", "description": "Define what makes a lead qualified for your business."},
    {"step_number": 3, "title": "Let the Agent Respond", "description": "ScaleCraft Agent handles conversations and routes qualified leads to your team."}
  ]'
)
ON CONFLICT (product_id) DO UPDATE SET
  localized_name = EXCLUDED.localized_name,
  localized_short_description = EXCLUDED.localized_short_description,
  localized_long_description = EXCLUDED.localized_long_description,
  localized_solution_statement = EXCLUDED.localized_solution_statement,
  personas = EXCLUDED.personas,
  competitor_positioning = EXCLUDED.competitor_positioning,
  localized_workflow_steps = EXCLUDED.localized_workflow_steps,
  updated_at = NOW();

-- AI Lead Finder System
INSERT INTO product_marketing (
  product_id, localized_name, localized_short_description, localized_long_description,
  localized_solution_statement, personas, competitor_positioning, localized_workflow_steps
) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'ai-lead-finder-system'),
  '{"en": "AI Lead Finder System", "hi": "", "ml": "", "ar": ""}',
  '{"en": "System for finding targeted B2B client leads and automated local maps scraping.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "The AI Lead Finder System is a complete prospecting playbook that teaches freelancers and agencies how to scrape, verify, and filter fresh Google Maps and LinkedIn leads using free API scrapers.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Endless verified client lists on a zero database budget.", "hi": "", "ml": "", "ar": ""}',
  '[
    {"persona": "Freelancers & Solopreneurs", "pain_points": ["Inconsistent client pipeline", "Expensive database fees"], "benefit_focus": "Google Maps list scrapers and phone verification guides"},
    {"persona": "Outbound Marketing Agencies", "pain_points": ["Needs high volume lead lists", "Outdated bought database records"], "benefit_focus": "LinkedIn B2B sourcing and email validation playbooks"}
  ]',
  '[
    {"alternative_name": "Apollo or ZoomInfo ($99/mo)", "drawbacks": "High monthly subscription billing and stale data.", "scalecraft_advantage": "Extract fresh Google Maps lists on-demand for $0 using free API tiers."},
    {"alternative_name": "Fiverr List Builders", "drawbacks": "Expensive, slow, and unverified contact info.", "scalecraft_advantage": "Set up automated background scrapers that run in 10 minutes."}
  ]',
  '[
    {"step_number": 1, "title": "Configure Free Scrapers", "description": "Configure Google Maps and LinkedIn Apify scraping pipelines in minutes."},
    {"step_number": 2, "title": "Clean Sourced Lists", "description": "Run AI validation prompts to remove bounced emails and formatting errors."},
    {"step_number": 3, "title": "Sync to Notion CRM", "description": "Import verified contacts straight into your visual CRM board."}
  ]'
)
ON CONFLICT (product_id) DO UPDATE SET
  localized_name = EXCLUDED.localized_name,
  localized_short_description = EXCLUDED.localized_short_description,
  localized_long_description = EXCLUDED.localized_long_description,
  localized_solution_statement = EXCLUDED.localized_solution_statement,
  personas = EXCLUDED.personas,
  competitor_positioning = EXCLUDED.competitor_positioning,
  localized_workflow_steps = EXCLUDED.localized_workflow_steps,
  updated_at = NOW();

-- Freelance Client Pipeline Blueprint
INSERT INTO product_marketing (
  product_id, localized_name, localized_short_description, localized_long_description,
  localized_solution_statement, personas, competitor_positioning, localized_workflow_steps
) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'freelance-client-pipeline-blueprint'),
  '{"en": "Freelance Client Pipeline Blueprint", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Ready-to-use client management and sales pipeline system for freelancers and service businesses.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "The Freelance Client Pipeline Blueprint is a ready-to-duplicate Notion system that tracks every lead, deal stage, and follow-up so freelancers and consultants never lose a client to disorganization.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Organize leads, track deals, and close more clients.", "hi": "", "ml": "", "ar": ""}',
  '[
    {"persona": "Agency Owner", "pain_points": ["Disorganized tracking", "Losing client leads"], "benefit_focus": "Automated pipelines and retainer proposal contracts"},
    {"persona": "Freelance Consultant", "pain_points": ["Leads scattered across DMs and spreadsheets", "No visibility into deal stages"], "benefit_focus": "One visual CRM for the entire client pipeline"},
    {"persona": "Solo Founder", "pain_points": ["No time to set up a complex CRM", "Needs something simple that works immediately"], "benefit_focus": "1-click Notion duplication with zero setup time"}
  ]',
  '[
    {"alternative_name": "HubSpot CRM", "drawbacks": "Expensive subscription fees and complex database setup rules.", "scalecraft_advantage": "1-click Notion duplication. Clean, simple, and tailored for freelancers."},
    {"alternative_name": "Spreadsheet trackers", "drawbacks": "No automation, easy to lose track of follow-ups.", "scalecraft_advantage": "Visual pipeline stages with built-in follow-up tracking."}
  ]',
  '[
    {"step_number": 1, "title": "Duplicate CRM", "description": "Copy the sales workspace into your Notion account in one click."},
    {"step_number": 2, "title": "Add Your Leads", "description": "Import or manually add prospects into the pipeline view."},
    {"step_number": 3, "title": "Track to Close", "description": "Move deals through stages and follow up until they close."}
  ]'
)
ON CONFLICT (product_id) DO UPDATE SET
  localized_name = EXCLUDED.localized_name,
  localized_short_description = EXCLUDED.localized_short_description,
  localized_long_description = EXCLUDED.localized_long_description,
  localized_solution_statement = EXCLUDED.localized_solution_statement,
  personas = EXCLUDED.personas,
  competitor_positioning = EXCLUDED.competitor_positioning,
  localized_workflow_steps = EXCLUDED.localized_workflow_steps,
  updated_at = NOW();

-- AI Systems Combo
INSERT INTO product_marketing (
  product_id, localized_name, localized_short_description, localized_long_description,
  localized_solution_statement, personas, competitor_positioning, localized_workflow_steps
) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'ai-systems-combo'),
  '{"en": "AI Systems Combo", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Complete bundle combining multiple ScaleCraft systems into one business operating toolkit.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "The AI Systems Combo bundles ScaleCraft''s core lead generation and CRM systems into a single toolkit, giving growing businesses a complete customer acquisition and management workflow at a bundled price.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Build a complete customer acquisition and management workflow.", "hi": "", "ml": "", "ar": ""}',
  '[
    {"persona": "Entrepreneur", "pain_points": ["Juggling multiple disconnected tools", "Budget-conscious about buying systems separately"], "benefit_focus": "One bundled toolkit covering acquisition to close"},
    {"persona": "Agency", "pain_points": ["Needs a repeatable operating system for client acquisition", "Wants consistent systems across the business"], "benefit_focus": "Combined lead gen and CRM systems that work together out of the box"},
    {"persona": "Growing Business", "pain_points": ["Outgrowing ad-hoc spreadsheets and manual processes", "Needs to scale operations without hiring immediately"], "benefit_focus": "A complete, bundled operating system at a lower combined price"}
  ]',
  '[
    {"alternative_name": "Buying each ScaleCraft system separately", "drawbacks": "Costs more overall and requires separate purchase decisions.", "scalecraft_advantage": "Bundled pricing with discount code PIPELINE300 for the full toolkit."},
    {"alternative_name": "Enterprise all-in-one platforms", "drawbacks": "Expensive, over-engineered for small teams.", "scalecraft_advantage": "Lightweight, Notion-based systems built specifically for freelancers and small businesses."}
  ]',
  '[
    {"step_number": 1, "title": "Get the Combo", "description": "Purchase the bundle and unlock every included ScaleCraft system."},
    {"step_number": 2, "title": "Set Up Each System", "description": "Duplicate the CRM, lead finder, and supporting templates into your workspace."},
    {"step_number": 3, "title": "Run the Full Workflow", "description": "Use the connected systems together to acquire, track, and close clients."}
  ]'
)
ON CONFLICT (product_id) DO UPDATE SET
  localized_name = EXCLUDED.localized_name,
  localized_short_description = EXCLUDED.localized_short_description,
  localized_long_description = EXCLUDED.localized_long_description,
  localized_solution_statement = EXCLUDED.localized_solution_statement,
  personas = EXCLUDED.personas,
  competitor_positioning = EXCLUDED.competitor_positioning,
  localized_workflow_steps = EXCLUDED.localized_workflow_steps,
  updated_at = NOW();

-- Never Lose a Lead CRM
INSERT INTO product_marketing (
  product_id, localized_name, localized_short_description, localized_long_description,
  localized_solution_statement, personas, competitor_positioning, localized_workflow_steps
) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'never-lose-a-lead-crm'),
  '{"en": "Never Lose a Lead CRM", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Lightweight CRM for tracking every inquiry, follow-up, and customer interaction.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Never Lose a Lead CRM is a lightweight tracking system that logs every inquiry and follow-up so sales teams and freelancers never let a warm lead go cold.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Ensure no lead is forgotten and improve follow-up consistency.", "hi": "", "ml": "", "ar": ""}',
  '[
    {"persona": "Sales Team", "pain_points": ["Leads forgotten between reps", "No shared visibility into follow-up status"], "benefit_focus": "Centralized follow-up tracking the whole team can see"},
    {"persona": "Freelancer", "pain_points": ["Inquiries scattered across email, DMs, and calls", "Forgets to follow up in time"], "benefit_focus": "One simple place to log and track every inquiry"},
    {"persona": "Startup", "pain_points": ["No CRM budget for complex tools", "Needs something simple to start with immediately"], "benefit_focus": "Lightweight system with no learning curve"}
  ]',
  '[
    {"alternative_name": "Sticky notes / memory-based follow-up", "drawbacks": "Leads get forgotten, no accountability.", "scalecraft_advantage": "A structured, simple log that ensures every follow-up is tracked."},
    {"alternative_name": "Heavy enterprise CRMs", "drawbacks": "Overkill and slow to set up for a small team.", "scalecraft_advantage": "Ready to use in minutes with no complex configuration."}
  ]',
  '[
    {"step_number": 1, "title": "Log the Inquiry", "description": "Add each new lead or inquiry as it comes in."},
    {"step_number": 2, "title": "Set Follow-Up Reminders", "description": "Schedule when to reach back out to each lead."},
    {"step_number": 3, "title": "Track Until Closed", "description": "Update status until the lead converts or closes out."}
  ]'
)
ON CONFLICT (product_id) DO UPDATE SET
  localized_name = EXCLUDED.localized_name,
  localized_short_description = EXCLUDED.localized_short_description,
  localized_long_description = EXCLUDED.localized_long_description,
  localized_solution_statement = EXCLUDED.localized_solution_statement,
  personas = EXCLUDED.personas,
  competitor_positioning = EXCLUDED.competitor_positioning,
  localized_workflow_steps = EXCLUDED.localized_workflow_steps,
  updated_at = NOW();

-- AI Income Blueprint
INSERT INTO product_marketing (
  product_id, localized_name, localized_short_description, localized_long_description,
  localized_solution_statement, personas, competitor_positioning, localized_workflow_steps
) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'ai-income-blueprint'),
  '{"en": "AI Income Blueprint", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Practical guide showing ways to use AI tools to create income opportunities and improve productivity.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "AI Income Blueprint is a step-by-step digital guide that walks beginners and freelancers through practical AI-earning methods, backed by a 30-day action plan and a client acquisition path.", "hi": "", "ml": "", "ar": ""}',
  '{"en": "Learn practical AI workflows that can support new income streams.", "hi": "", "ml": "", "ar": ""}',
  '[
    {"persona": "Beginner", "pain_points": ["Overwhelmed by conflicting AI advice online", "Doesn''t know where to start"], "benefit_focus": "A clear, step-by-step 30-day action plan"},
    {"persona": "Student", "pain_points": ["Limited time and budget", "Wants a low-cost way to start earning"], "benefit_focus": "Affordable, practical guide with immediate action steps"},
    {"persona": "Freelancer", "pain_points": ["Wants to add AI-powered services to their offering", "Unsure which AI workflows are actually profitable"], "benefit_focus": "Concrete, tested AI workflows plus a client acquisition CTA"}
  ]',
  '[
    {"alternative_name": "Free YouTube tutorials", "drawbacks": "Scattered, inconsistent, no structured action plan.", "scalecraft_advantage": "One organized guide with a 30-day plan, templates, and a case study."},
    {"alternative_name": "Expensive AI courses", "drawbacks": "High price for content that overlaps with free resources.", "scalecraft_advantage": "Affordable ₹999 guide focused on practical, immediately usable steps."}
  ]',
  '[
    {"step_number": 1, "title": "Learn the Core Methods", "description": "Understand the practical AI-earning methods covered in the guide."},
    {"step_number": 2, "title": "Follow the 30-Day Plan", "description": "Work through the daily action plan to build momentum."},
    {"step_number": 3, "title": "Acquire Your First Clients", "description": "Use the client acquisition CTA and bonus templates to land initial work."}
  ]'
)
ON CONFLICT (product_id) DO UPDATE SET
  localized_name = EXCLUDED.localized_name,
  localized_short_description = EXCLUDED.localized_short_description,
  localized_long_description = EXCLUDED.localized_long_description,
  localized_solution_statement = EXCLUDED.localized_solution_statement,
  personas = EXCLUDED.personas,
  competitor_positioning = EXCLUDED.competitor_positioning,
  localized_workflow_steps = EXCLUDED.localized_workflow_steps,
  updated_at = NOW();

-- 3. product_content
-- ScaleCraft Agent
INSERT INTO product_content (product_id, workflow_state, sections, pricing_tiers, seo_metadata, ai_context) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'scalecraft-agent'),
  'draft',
  '[
    {
      "id": "hero_block_01", "type": "hero", "enabled": true, "priority": 1,
      "theme": "light", "background": "bg-background",
      "analytics": {"track_impressions": true, "track_clicks": true, "goal": "checkout"},
      "content": {
        "headline_hook": "AI Business Assistant That Never Sleeps",
        "subheadline": "Automate customer conversations, qualify leads, and handle support around the clock.",
        "product_category_badge": "AI SaaS"
      }
    }
  ]',
  '[
    {"tier_name": "Standard", "price_inr": 2999, "original_price_inr": 2999, "price_usd": 36, "original_price_usd": 36, "discount_pct": 0, "is_lifetime": false, "guarantee_days": 7}
  ]',
  '{
    "meta_title": "ScaleCraft Agent – AI Assistant for Leads & Support",
    "meta_description": "Automate customer conversations, qualify leads, and handle support 24/7 with ScaleCraft Agent. Built for small businesses and agencies. Try it today.",
    "focus_keywords": ["AI business assistant", "AI customer service automation", "lead qualification AI tool", "automated customer support software", "AI sales assistant for small business"],
    "canonical_url": "https://thescalecraft.in/products/scalecraft-agent",
    "og_image_url": "/og-images/scalecraft-agent.svg",
    "no_index": false
  }',
  '{}'
)
ON CONFLICT (product_id) DO UPDATE SET
  workflow_state = EXCLUDED.workflow_state,
  sections = EXCLUDED.sections,
  pricing_tiers = EXCLUDED.pricing_tiers,
  seo_metadata = EXCLUDED.seo_metadata,
  updated_at = NOW();

-- AI Lead Finder System
INSERT INTO product_content (product_id, workflow_state, sections, pricing_tiers, seo_metadata, ai_context) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'ai-lead-finder-system'),
  'published',
  '[
    {
      "id": "hero_block_01", "type": "hero", "enabled": true, "priority": 1,
      "theme": "light", "background": "bg-background",
      "analytics": {"track_impressions": true, "track_clicks": true, "goal": "checkout"},
      "content": {
        "headline_hook": "Find Your Next Client Without the Manual Search",
        "subheadline": "An AI-powered system for finding and organizing targeted business leads.",
        "product_category_badge": "Lead Generation Tool"
      }
    }
  ]',
  '[
    {"tier_name": "Standard License", "price_inr": 699, "original_price_inr": 1399, "price_usd": 9, "original_price_usd": 18, "discount_pct": 50, "is_lifetime": true, "guarantee_days": 7},
    {"tier_name": "Premium License", "price_inr": 1199, "original_price_inr": 2399, "price_usd": 15, "original_price_usd": 30, "discount_pct": 50, "is_lifetime": true, "guarantee_days": 7}
  ]',
  '{
    "meta_title": "AI Lead Finder System – Find Qualified B2B Leads Fast",
    "meta_description": "Stop manual prospecting. AI Lead Finder System helps freelancers and agencies find and organize targeted business leads in minutes, not hours.",
    "focus_keywords": ["AI lead generation tool", "B2B lead finder", "targeted lead generation system", "lead prospecting tool for freelancers", "automated lead research tool"],
    "canonical_url": "https://thescalecraft.in/products/ai-lead-finder-system",
    "og_image_url": "/og-images/ai-lead-finder-system.svg",
    "no_index": false
  }',
  '{}'
)
ON CONFLICT (product_id) DO UPDATE SET
  workflow_state = EXCLUDED.workflow_state,
  sections = EXCLUDED.sections,
  pricing_tiers = EXCLUDED.pricing_tiers,
  seo_metadata = EXCLUDED.seo_metadata,
  updated_at = NOW();

-- Freelance Client Pipeline Blueprint
INSERT INTO product_content (product_id, workflow_state, sections, pricing_tiers, seo_metadata, ai_context) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'freelance-client-pipeline-blueprint'),
  'published',
  '[
    {
      "id": "hero_block_01", "type": "hero", "enabled": true, "priority": 1,
      "theme": "light", "background": "bg-background",
      "analytics": {"track_impressions": true, "track_clicks": true, "goal": "checkout"},
      "content": {
        "headline_hook": "Close More Retainers With the Notion CRM Built for Freelancers",
        "subheadline": "Stop losing client leads in DMs. Track contacts in a visual sales CRM.",
        "product_category_badge": "CRM Template"
      }
    }
  ]',
  '[
    {"tier_name": "Standard License", "price_inr": 999, "original_price_inr": 1999, "price_usd": 12, "original_price_usd": 24, "discount_pct": 50, "is_lifetime": true, "guarantee_days": 7},
    {"tier_name": "Premium License", "price_inr": 2499, "original_price_inr": 4999, "price_usd": 30, "original_price_usd": 60, "discount_pct": 50, "is_lifetime": true, "guarantee_days": 7}
  ]',
  '{
    "meta_title": "Notion CRM Template & Client Pipeline Blueprint | ScaleCraft",
    "meta_description": "Organize client leads, write pitches in seconds, and close retainer deals with the ultimate Notion CRM sales template.",
    "focus_keywords": ["notion crm template", "client pipeline tracker", "freelance crm"],
    "canonical_url": "https://thescalecraft.in/products/freelance-client-pipeline-blueprint",
    "og_image_url": "/og-images/client-pipeline.svg",
    "no_index": false
  }',
  '{}'
)
ON CONFLICT (product_id) DO UPDATE SET
  workflow_state = EXCLUDED.workflow_state,
  sections = EXCLUDED.sections,
  pricing_tiers = EXCLUDED.pricing_tiers,
  seo_metadata = EXCLUDED.seo_metadata,
  updated_at = NOW();

-- AI Systems Combo
INSERT INTO product_content (product_id, workflow_state, sections, pricing_tiers, seo_metadata, ai_context) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'ai-systems-combo'),
  'published',
  '[
    {
      "id": "hero_block_01", "type": "hero", "enabled": true, "priority": 1,
      "theme": "light", "background": "bg-background",
      "analytics": {"track_impressions": true, "track_clicks": true, "goal": "checkout"},
      "content": {
        "headline_hook": "The Complete AI + CRM Toolkit for Growing Businesses",
        "subheadline": "One bundle combining ScaleCraft''s systems into a complete customer acquisition workflow.",
        "product_category_badge": "Bundle"
      }
    }
  ]',
  '[
    {"tier_name": "Standard Bundle", "price_inr": 1299, "original_price_inr": 2599, "price_usd": 16, "original_price_usd": 32, "discount_pct": 50, "is_lifetime": true, "guarantee_days": 7},
    {"tier_name": "Premium Bundle", "price_inr": 3299, "original_price_inr": 6599, "price_usd": 40, "original_price_usd": 80, "discount_pct": 50, "is_lifetime": true, "guarantee_days": 7}
  ]',
  '{
    "meta_title": "AI Systems Combo – Complete Business Toolkit Bundle",
    "meta_description": "Get every ScaleCraft system in one bundle. Lead generation, CRM, and AI automation combined into a complete customer acquisition toolkit.",
    "focus_keywords": ["AI business systems bundle", "complete business toolkit for entrepreneurs", "CRM and AI automation bundle", "all-in-one business system Notion", "customer acquisition toolkit"],
    "canonical_url": "https://thescalecraft.in/products/ai-systems-combo",
    "og_image_url": "/og-images/ai-systems-combo.svg",
    "no_index": false
  }',
  '{}'
)
ON CONFLICT (product_id) DO UPDATE SET
  workflow_state = EXCLUDED.workflow_state,
  sections = EXCLUDED.sections,
  pricing_tiers = EXCLUDED.pricing_tiers,
  seo_metadata = EXCLUDED.seo_metadata,
  updated_at = NOW();

-- Never Lose a Lead CRM
INSERT INTO product_content (product_id, workflow_state, sections, pricing_tiers, seo_metadata, ai_context) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'never-lose-a-lead-crm'),
  'draft',
  '[
    {
      "id": "hero_block_01", "type": "hero", "enabled": true, "priority": 1,
      "theme": "light", "background": "bg-background",
      "analytics": {"track_impressions": true, "track_clicks": true, "goal": "checkout"},
      "content": {
        "headline_hook": "Never Miss a Follow-Up Again",
        "subheadline": "A lightweight CRM that makes sure no inquiry slips through the cracks.",
        "product_category_badge": "CRM Template"
      }
    }
  ]',
  '[
    {"tier_name": "Standard License", "price_inr": 499, "original_price_inr": 999, "price_usd": 6, "original_price_usd": 12, "discount_pct": 50, "is_lifetime": true, "guarantee_days": 7}
  ]',
  '{
    "meta_title": "Never Lose a Lead CRM – Simple Follow-Up Tracker",
    "meta_description": "A lightweight CRM that makes sure no inquiry slips through the cracks. Track every lead and follow-up in one simple system built for sales teams.",
    "focus_keywords": ["lightweight CRM template", "lead follow-up tracker", "simple CRM for small teams", "CRM to track inquiries", "follow-up management system"],
    "canonical_url": "https://thescalecraft.in/products/never-lose-a-lead-crm",
    "og_image_url": "/og-images/never-lose-a-lead-crm.svg",
    "no_index": false
  }',
  '{}'
)
ON CONFLICT (product_id) DO UPDATE SET
  workflow_state = EXCLUDED.workflow_state,
  sections = EXCLUDED.sections,
  pricing_tiers = EXCLUDED.pricing_tiers,
  seo_metadata = EXCLUDED.seo_metadata,
  updated_at = NOW();

-- AI Income Blueprint
INSERT INTO product_content (product_id, workflow_state, sections, pricing_tiers, seo_metadata, ai_context) VALUES (
  (SELECT id FROM saas_products WHERE slug = 'ai-income-blueprint'),
  'draft',
  '[
    {
      "id": "hero_block_01", "type": "hero", "enabled": true, "priority": 1,
      "theme": "light", "background": "bg-background",
      "analytics": {"track_impressions": true, "track_clicks": true, "goal": "checkout"},
      "content": {
        "headline_hook": "Turn AI Tools Into Real Income — Step by Step",
        "subheadline": "A practical guide with a 30-day action plan for beginners and freelancers.",
        "product_category_badge": "Digital Guide"
      }
    }
  ]',
  '[
    {"tier_name": "Standard", "price_inr": 999, "original_price_inr": 1999, "price_usd": 12, "original_price_usd": 24, "discount_pct": 50, "is_lifetime": true, "guarantee_days": 7}
  ]',
  '{
    "meta_title": "AI Income Blueprint – Practical Guide to Earning With AI",
    "meta_description": "Learn real, practical ways to use AI tools to build income streams. A step-by-step guide with a 30-day action plan for beginners and freelancers.",
    "focus_keywords": ["AI income guide", "make money with AI tools", "AI side hustle for beginners", "practical AI workflows guide", "AI productivity ebook"],
    "canonical_url": "https://thescalecraft.in/products/ai-income-blueprint",
    "og_image_url": "/og-images/ai-income-blueprint.svg",
    "no_index": false
  }',
  '{}'
)
ON CONFLICT (product_id) DO UPDATE SET
  workflow_state = EXCLUDED.workflow_state,
  sections = EXCLUDED.sections,
  pricing_tiers = EXCLUDED.pricing_tiers,
  seo_metadata = EXCLUDED.seo_metadata,
  updated_at = NOW();

-- 4. search_index
INSERT INTO search_index (product_id, keywords, synonyms, categories, buyer_intent) VALUES
((SELECT id FROM saas_products WHERE slug = 'scalecraft-agent'),
  ARRAY['ai business assistant', 'ai customer service automation', 'lead qualification ai tool', 'automated customer support software', 'ai sales assistant'],
  ARRAY['ai chatbot', 'customer support bot', 'lead qualifier'],
  ARRAY['ai saas', 'customer support', 'lead qualification'],
  'transactional'),
((SELECT id FROM saas_products WHERE slug = 'ai-lead-finder-system'),
  ARRAY['ai lead generation tool', 'b2b lead finder', 'targeted lead generation system', 'lead prospecting tool', 'automated lead research'],
  ARRAY['lead scraper', 'prospect finder', 'b2b prospecting tool'],
  ARRAY['lead generation', 'prospecting', 'b2b sales'],
  'transactional'),
((SELECT id FROM saas_products WHERE slug = 'freelance-client-pipeline-blueprint'),
  ARRAY['notion crm template', 'client pipeline tracker', 'freelance crm', 'sales pipeline template notion'],
  ARRAY['sales tracker', 'deal pipeline', 'client tracker'],
  ARRAY['crm', 'notion template', 'freelance tools'],
  'transactional'),
((SELECT id FROM saas_products WHERE slug = 'ai-systems-combo'),
  ARRAY['ai business systems bundle', 'complete business toolkit', 'crm and ai automation bundle', 'customer acquisition toolkit'],
  ARRAY['business toolkit', 'systems bundle', 'all-in-one business tools'],
  ARRAY['bundle', 'business systems', 'ai automation'],
  'transactional'),
((SELECT id FROM saas_products WHERE slug = 'never-lose-a-lead-crm'),
  ARRAY['lightweight crm template', 'lead follow-up tracker', 'simple crm for small teams', 'crm to track inquiries'],
  ARRAY['follow-up tracker', 'inquiry log', 'lead tracker'],
  ARRAY['crm', 'follow-up management', 'sales tools'],
  'transactional'),
((SELECT id FROM saas_products WHERE slug = 'ai-income-blueprint'),
  ARRAY['ai income guide', 'make money with ai tools', 'ai side hustle for beginners', 'practical ai workflows guide'],
  ARRAY['ai earning guide', 'ai side income', 'ai productivity ebook'],
  ARRAY['digital guide', 'ai education', 'income guide'],
  'informational')
ON CONFLICT DO NOTHING;
