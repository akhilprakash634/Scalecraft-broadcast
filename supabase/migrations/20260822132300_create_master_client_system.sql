-- ==============================================================================
-- Seeding Script: ScaleCraft Master Client System (Flagship Bundle)
-- Run this query directly in your Supabase SQL Editor to seed/update the products.
-- ==============================================================================

-- 1. Create/Update any missing products in public.saas_products

-- AI Client Acquisition System
INSERT INTO public.saas_products (
  id, name, short_name, slug, description, long_description,
  product_type, product_subtype, category,
  price, original_price,
  international_price, international_actual_price,
  status, currency, is_featured, is_combo,
  tags, features, search_text,
  meta_title, meta_description, canonical,
  is_visible, test_mode, rating, review_count, version,
  published_at, updated_at
)
VALUES (
  'ai-client-acquisition-system',
  'AI Client Acquisition System',
  'Acquisition System',
  'ai-client-acquisition-system',
  'Automatically reaches out to leads and qualified prospects on WhatsApp, LinkedIn, and email using pre-built messaging frameworks.',
  'The AI Client Acquisition System is a standalone workspace that helps you execute your outreach campaigns. It includes customizable messaging scripts, automated follow-up sequences, and templates to convert cold leads into booked meetings and retainer clients.',
  'digital',
  'Notion Template',
  'templates',
  2999,
  2999,
  80,
  80,
  'published',
  'INR',
  false,
  false,
  ARRAY['digital', 'templates', 'leads', 'outreach'],
  ARRAY['50+ outreach scripts (DM, email, LinkedIn)', 'Automated follow-up reminders', 'Client pipeline CRM'],
  'AI Client Acquisition System Automatically reaches out to leads on WhatsApp',
  'AI Client Acquisition System | ScaleCraft',
  'Automatically reaches out to leads on WhatsApp.',
  'https://thescalecraft.in/products/ai-client-acquisition-system',
  true,
  false,
  4.8,
  0,
  '1.0.0',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  international_price = EXCLUDED.international_price,
  description = EXCLUDED.description,
  updated_at = NOW();

-- First Freelance Client System
INSERT INTO public.saas_products (
  id, name, short_name, slug, description, long_description,
  product_type, product_subtype, category,
  price, original_price,
  international_price, international_actual_price,
  status, currency, is_featured, is_combo,
  tags, features, search_text,
  meta_title, meta_description, canonical,
  is_visible, test_mode, rating, review_count, version,
  published_at, updated_at
)
VALUES (
  'first-freelance-client-system',
  'First Freelance Client System',
  'First Client System',
  'first-freelance-client-system',
  'Step-by-step outreach system to sign your first paying client in 7 days.',
  'A structured daily roadmap outlining exactly what to do from Day 1 to Day 7 to find, pitch, and close your first B2B client.',
  'digital',
  'Notion Template',
  'templates',
  0,
  0,
  0,
  0,
  'published',
  'INR',
  false,
  false,
  ARRAY['digital', 'templates', 'bonus'],
  ARRAY['7-Day client challenge checklist', 'Daily outreach target templates', 'Rapport building guides'],
  'First Freelance Client System sign first paying client in 7 days',
  'First Freelance Client System | ScaleCraft',
  'Step-by-step outreach system to sign your first paying client in 7 days.',
  'https://thescalecraft.in/products/first-freelance-client-system',
  true,
  false,
  4.8,
  0,
  '1.0.0',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 100 AI Client Acquisition Prompts
INSERT INTO public.saas_products (
  id, name, short_name, slug, description, long_description,
  product_type, product_subtype, category,
  price, original_price,
  international_price, international_actual_price,
  status, currency, is_featured, is_combo,
  tags, features, search_text,
  meta_title, meta_description, canonical,
  is_visible, test_mode, rating, review_count, version,
  published_at, updated_at
)
VALUES (
  '100-ai-client-acquisition-prompts',
  '100 AI Client Acquisition Prompts',
  'Acquisition Prompts',
  '100-ai-client-acquisition-prompts',
  'Copy-paste AI prompts to automate your sales prospecting and outreach messages.',
  'Tested, copy-paste prompts for ChatGPT/Claude to automate writing outreach messages, proposal scopes, emails, and handle sales objections.',
  'digital',
  'Notion Template',
  'templates',
  0,
  0,
  0,
  0,
  'published',
  'INR',
  false,
  false,
  ARRAY['digital', 'templates', 'bonus'],
  ARRAY['ChatGPT cold outreach prompts', 'Sales objection handler prompts', 'Proposal scope writer prompts'],
  '100 AI Client Acquisition Prompts copy-paste prompts ChatGPT Claude',
  '100 AI Client Acquisition Prompts | ScaleCraft',
  'Copy-paste AI prompts to automate your sales prospecting and outreach messages.',
  'https://thescalecraft.in/products/100-ai-client-acquisition-prompts',
  true,
  false,
  4.8,
  0,
  '1.0.0',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  updated_at = NOW();


-- 2. Insert/Update the main bundle in public.saas_products
INSERT INTO public.saas_products (
  id, name, short_name, slug, description, long_description,
  product_type, product_subtype, category,
  price, original_price,
  international_price, international_actual_price,
  status, currency, is_featured, is_combo, combo_product_ids,
  tags, features, search_text,
  meta_title, meta_description, canonical,
  is_visible, test_mode, rating, review_count, version,
  published_at, updated_at
)
SELECT
  'scalecraft-master-client-system',
  'ScaleCraft Master Client System',
  'Master Client System',
  'scalecraft-master-client-system',
  'ScaleCraft Master Client System is a complete AI-powered client acquisition toolkit built for freelancers, agencies, creators and small businesses. Instead of piecing together separate tools, templates and workflows, you get one organized system covering the entire journey — from finding prospects to outreach, follow-ups, proposals, closing and client onboarding. The system combines practical client acquisition workflows, AI prompts, sales resources, business processes and ready-to-use templates so you can spend less time figuring out what to do and more time executing.',
  'ScaleCraft Master Client System is a complete AI-powered client acquisition toolkit built for freelancers, agencies, creators and small businesses. Instead of piecing together separate tools, templates and workflows, you get one organized system covering the entire journey — from finding prospects to outreach, follow-ups, proposals, closing and client onboarding. The system combines practical client acquisition workflows, AI prompts, sales resources, business processes and ready-to-use templates so you can spend less time figuring out what to do and more time executing.',
  'bundle',
  'Notion Template',
  'combos',
  1499,
  (SELECT SUM(price) FROM public.saas_products WHERE id IN ('e2c434f6-c3eb-44a2-b7fe-aae11bbf2e1a', '107d9692-842f-4580-9d86-a22f730f6770', 'ai-client-acquisition-system', 'proposal-system', 'client-onboarding-system', 'sop-process-library')),
  60,
  (SELECT SUM(international_price) FROM public.saas_products WHERE id IN ('e2c434f6-c3eb-44a2-b7fe-aae11bbf2e1a', '107d9692-842f-4580-9d86-a22f730f6770', 'ai-client-acquisition-system', 'proposal-system', 'client-onboarding-system', 'sop-process-library')),
  'published',
  'INR',
  true,
  true,
  ARRAY['e2c434f6-c3eb-44a2-b7fe-aae11bbf2e1a', '107d9692-842f-4580-9d86-a22f730f6770', 'ai-client-acquisition-system', 'proposal-system', 'client-onboarding-system', 'sop-process-library'],
  ARRAY['digital', 'templates', 'blueprints', 'combos', 'leads', 'client-acquisition'],
  ARRAY[
    'Find qualified prospects faster',
    'Build an organized client pipeline',
    'Send better outreach',
    'Follow up consistently',
    'Create professional proposals',
    'Handle sales objections',
    'Onboard clients professionally',
    'Build repeatable business workflows',
    'Use AI throughout the acquisition process',
    'Reduce time spent creating repetitive business assets'
  ],
  'ScaleCraft Master Client System Complete AI Client Acquisition System client acquisition system freelance client acquisition AI lead generation get freelance clients client acquisition toolkit AI business toolkit freelance business system client outreach system AI outreach templates digital Notion Template templates combos',
  'ScaleCraft Master Client System – Complete AI Client Acquisition Toolkit',
  'Get the ScaleCraft Master Client System — a complete AI-powered toolkit for finding leads, outreach, follow-ups, proposals, sales, client onboarding and business workflows. Get lifetime access for ₹1,499.',
  'https://thescalecraft.in/products/scalecraft-master-client-system',
  true,
  false,
  4.9,
  0,
  '1.0.0',
  NOW(),
  NOW()
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  long_description = EXCLUDED.long_description,
  product_type = EXCLUDED.product_type,
  product_subtype = EXCLUDED.product_subtype,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  international_price = EXCLUDED.international_price,
  international_actual_price = EXCLUDED.international_actual_price,
  status = EXCLUDED.status,
  is_featured = EXCLUDED.is_featured,
  is_combo = EXCLUDED.is_combo,
  combo_product_ids = EXCLUDED.combo_product_ids,
  tags = EXCLUDED.tags,
  features = EXCLUDED.features,
  search_text = EXCLUDED.search_text,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  canonical = EXCLUDED.canonical,
  updated_at = NOW();

-- 3. Seed product content in public.product_content
DELETE FROM public.product_content WHERE product_id = 'scalecraft-master-client-system';
INSERT INTO public.product_content (
  product_id,
  page_sections,
  cta_buttons,
  display_config,
  refund_policy,
  support_details,
  delivery_time,
  download_type,
  access_type,
  lifetime_updates,
  seo_metadata,
  ai_context,
  sections,
  pricing_tiers,
  created_at,
  updated_at,
  workflow_state
)
SELECT
  'scalecraft-master-client-system',
  '[
    {"id": "hero", "type": "hero", "enabled": true, "sort": 1, "data": {}},
    {"id": "quick_facts", "type": "quick_facts", "enabled": true, "sort": 2, "data": {}},
    {"id": "inside", "type": "inside", "enabled": true, "sort": 3, "data": {}},
    {"id": "features", "type": "features", "enabled": true, "sort": 4, "data": {}},
    {"id": "faq", "type": "faq", "enabled": true, "sort": 5, "data": {}},
    {"id": "related", "type": "related", "enabled": true, "sort": 6, "data": {}}
  ]'::jsonb,
  '[
    {"url": "/checkout", "text": "Get Instant Access", "style": "primary"}
  ]'::jsonb,
  '{
    "show_video": false,
    "sticky_cta": true,
    "faq_enabled": true,
    "show_pricing": true,
    "show_testimonials": true,
    "comparison_enabled": false
  }'::jsonb,
  'Satisfaction Guarantee',
  'Direct Founder WhatsApp Support',
  'Instant Delivery',
  'Notion Template & Guides',
  'Lifetime Access',
  true,
  '{
    "no_index": false,
    "meta_title": "ScaleCraft Master Client System – Complete AI Client Acquisition Toolkit",
    "canonical_url": "https://thescalecraft.in/products/scalecraft-master-client-system",
    "focus_keywords": [
      "AI client acquisition system",
      "client acquisition system",
      "freelance client acquisition",
      "AI lead generation",
      "get freelance clients"
    ],
    "meta_description": "Get the ScaleCraft Master Client System — a complete AI-powered toolkit for finding leads, outreach, follow-ups, proposals, sales, client onboarding and business workflows. Get lifetime access for ₹1,499."
  }'::jsonb,
  '{
    "tone": "confident, professional, direct",
    "objections": "No recurring fees. Lifetime access. Zero technical skills needed.",
    "pain_points": "Struggling to find, outreach, follow up and close retainer clients consistently.",
    "ideal_customer": "Freelancers, Agency Owners, Creators, and Small Businesses"
  }'::jsonb,
  '[
    {
      "id": "hero_block",
      "type": "hero",
      "theme": "light",
      "content": {
        "subheadline": "ScaleCraft Master Client System is a complete AI-powered client acquisition toolkit built for freelancers, agencies, creators and small businesses. Instead of piecing together separate tools, templates and workflows, you get one organized system covering the entire journey — from finding prospects to outreach, follow-ups, proposals, closing and client onboarding. The system combines practical client acquisition workflows, AI prompts, sales resources, business processes and ready-to-use templates so you can spend less time figuring out what to do and more time executing.",
        "headline_hook": "Find Clients. Close Deals. Build a Repeatable Business.",
        "product_category_badge": "Master Bundle"
      },
      "enabled": true,
      "priority": 1
    }
  ]'::jsonb,
  json_build_array(
    json_build_object(
      'price_inr', 1499,
      'price_usd', 60,
      'tier_name', 'Master Client System License',
      'is_lifetime', true,
      'discount_pct', round((1.0 - 1499.0 / NULLIF((SELECT SUM(price) FROM public.saas_products WHERE id IN ('e2c434f6-c3eb-44a2-b7fe-aae11bbf2e1a', '107d9692-842f-4580-9d86-a22f730f6770', 'ai-client-acquisition-system', 'proposal-system', 'client-onboarding-system', 'sop-process-library')), 0)) * 100),
      'guarantee_days', 7,
      'original_price_inr', (SELECT SUM(price) FROM public.saas_products WHERE id IN ('e2c434f6-c3eb-44a2-b7fe-aae11bbf2e1a', '107d9692-842f-4580-9d86-a22f730f6770', 'ai-client-acquisition-system', 'proposal-system', 'client-onboarding-system', 'sop-process-library')),
      'original_price_usd', (SELECT SUM(international_price) FROM public.saas_products WHERE id IN ('e2c434f6-c3eb-44a2-b7fe-aae11bbf2e1a', '107d9692-842f-4580-9d86-a22f730f6770', 'ai-client-acquisition-system', 'proposal-system', 'client-onboarding-system', 'sop-process-library'))
    )
  ),
  NOW(),
  NOW(),
  'published'::editorial_workflow_state;

-- 4. Seed product FAQs in public.product_faqs
DELETE FROM public.product_faqs WHERE product_id = 'scalecraft-master-client-system';
INSERT INTO public.product_faqs (product_id, question, answer, sort_order)
VALUES
('scalecraft-master-client-system', 'What is the ScaleCraft Master Client System?', 'It is a complete client acquisition toolkit covering lead generation, outreach, follow-ups, proposals, sales, client onboarding and business workflows.', 0),
('scalecraft-master-client-system', 'Who is this for?', 'It is designed for freelancers, agencies, creators, designers, small businesses, side hustlers and AI beginners.', 1),
('scalecraft-master-client-system', 'Do I need advanced AI skills?', 'No. The system is designed to be practical and beginner-friendly. You can use the included prompts, templates and workflows without advanced technical knowledge.', 2),
('scalecraft-master-client-system', 'Is this a monthly subscription?', 'The Master Client System is sold as a one-time digital product purchase with lifetime access.', 3),
('scalecraft-master-client-system', 'How do I receive access?', 'Access is delivered through the existing ScaleCraft email delivery system after successful payment.', 4),
('scalecraft-master-client-system', 'Does it guarantee clients?', 'No. The system provides practical tools, workflows and resources designed to improve your client acquisition process, but results depend on implementation, market, offer and consistency.', 5);

-- 5. Seed product relationships in public.product_relationships
-- Drop check constraint and recreate it to support 'bonus' relationship type
ALTER TABLE public.product_relationships DROP CONSTRAINT IF EXISTS product_relationships_relationship_type_check;
ALTER TABLE public.product_relationships ADD CONSTRAINT product_relationships_relationship_type_check
  CHECK (relationship_type IN ('bundle', 'bonus', 'upsell', 'cross_sell', 'alternative'));

DELETE FROM public.product_relationships WHERE product_id = 'scalecraft-master-client-system';
INSERT INTO public.product_relationships (product_id, related_product_id, relationship_type)
VALUES
('scalecraft-master-client-system', 'e2c434f6-c3eb-44a2-b7fe-aae11bbf2e1a', 'bundle'),
('scalecraft-master-client-system', '107d9692-842f-4580-9d86-a22f730f6770', 'bundle'),
('scalecraft-master-client-system', 'ai-client-acquisition-system', 'bundle'),
('scalecraft-master-client-system', 'proposal-system', 'bundle'),
('scalecraft-master-client-system', 'client-onboarding-system', 'bundle'),
('scalecraft-master-client-system', 'sop-process-library', 'bundle'),
('scalecraft-master-client-system', 'first-freelance-client-system', 'bonus'),
('scalecraft-master-client-system', 'ai-income-blueprint', 'bonus'),
('scalecraft-master-client-system', '100-ai-client-acquisition-prompts', 'bonus'),
('scalecraft-master-client-system', 'scalecraft-agent-saas', 'cross_sell');
