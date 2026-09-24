-- Seed product content metadata for AI Client Acquisition System in public.product_content
DELETE FROM public.product_content WHERE product_id = 'ai-client-acquisition-system';

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
VALUES (
  'ai-client-acquisition-system',
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
    "show_video": true,
    "sticky_cta": true,
    "faq_enabled": true,
    "show_pricing": true,
    "show_testimonials": true,
    "comparison_enabled": true
  }'::jsonb,
  '7-Day No-Questions Refund Policy',
  'Direct WhatsApp/Email support',
  'Instant Delivery',
  'ZIP / Codebase / Guide',
  'Lifetime Access',
  true,
  '{
    "no_index": false,
    "meta_title": "AI Client Acquisition System | ScaleCraft",
    "canonical_url": "https://thescalecraft.in/products/ai-client-acquisition-system",
    "focus_keywords": [
      "AI client acquisition system",
      "automated outreach",
      "WhatsApp outreach bot",
      "LinkedIn outreach templates",
      "email automation templates"
    ],
    "meta_description": "Automatically reach out to leads and qualified prospects on WhatsApp, LinkedIn, and email using pre-built messaging frameworks."
  }'::jsonb,
  'AI Outreach and prospecting automation codebase.',
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW(),
  'published'
);
