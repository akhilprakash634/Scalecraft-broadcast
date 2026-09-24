-- ==============================================================================
-- Seeding Script: Get Paid, Not Ghosted — Proposal System (Digital Product)
-- Run this query directly in your Supabase SQL Editor to insert the product.
-- Product URL can be updated manually from the admin panel after insert.
-- ==============================================================================

-- 1. Insert/Update base product info in public.saas_products
INSERT INTO public.saas_products (
  id,
  name,
  slug,
  description,
  thumbnail_url,
  category_id,
  product_type,
  price,
  original_price,
  international_price,
  international_actual_price,
  plan_type,
  status,
  features,
  section_visibility,
  meta_title,
  meta_description,
  og_image,
  canonical,
  is_featured,
  is_combo,
  sort_order,
  long_description,
  banner_url
) VALUES (
  'proposal-system',
  'Get Paid, Not Ghosted — The Proposal System',
  'proposal-system',
  'The AI system that turns a messy client chat into a proposal that locks scope, sets payment terms, and closes itself if they go quiet — in under 15 minutes. A Notion workspace with AI prompt libraries and protective clause templates for freelancers and agency owners.',
  null,
  'blueprints',
  'digital',
  749,
  1499,
  9.99,
  19.99,
  'standard',
  'published',
  ARRAY[
    'Notion workspace (not a course)',
    '15 min setup, under 10 min after',
    '4 AI proposal prompts ready to use',
    '5 scope-lock & payment protection clauses',
    'Business Intake template (set once, reuse forever)',
    'Built-in Proposal Tracker database',
    'Full proposal build walkthrough',
    'Before & after comparison included',
    'Instant access, lifetime updates'
  ],
  '{
    "hero": true,
    "benefits": true,
    "preview": true,
    "testimonials": false,
    "faq": true,
    "founder": true,
    "guarantee": true,
    "related": true,
    "page_sections": ["hero", "problem", "what_is_this", "whats_inside", "before_after", "who_its_for", "faq"],
    "quick_facts": {
      "setup_time": "15 minutes first time, under 10 after",
      "best_for": "Freelancers, Agency Owners, Consultants",
      "skill_level": "No technical skills required",
      "delivery": "Instant Notion Workspace Access",
      "format": "Notion Template + AI Prompt Library",
      "language": "English"
    }
  }'::jsonb,
  'Get Paid, Not Ghosted — The AI Proposal System for Freelancers',
  'Turn client chats into airtight proposals in under 15 minutes. Lock scope, set payment terms, and stop chasing clients with this AI-powered Notion system for freelancers and agency owners.',
  null,
  'https://thescalecraft.in/products/proposal-system',
  false,
  false,
  20,
  'Get Paid, Not Ghosted is a repeatable system — not a course, not a video series — for freelancers, agency owners, and consultants who are tired of scope creep and chasing unpaid invoices.

Two things are quietly costing you money:

1. Unclear scope — clients keep adding "one more thing" for free because your proposal never defined the boundaries.
2. Non-payment & ghosting — proposals that never stated when money was due, or what happens if the client disappears.

This Notion workspace fixes both, using AI to do the heavy lifting.

What''s Inside:

• Start Here — The framing and mindset shift
• Step 1: Business Intake — Your reusable terms and non-negotiables, set once
• Step 2: AI Proposal Prompt Library — 4 ready-to-use prompts that handle the writing
• Step 3: Scope-Lock & Payment Clause Library — 5 protective clauses that stop scope creep and late payments before they start
• Step 4: Build Your Proposal — A full walkthrough from blank page to signed proposal
• Proposal Tracker — A built-in Notion database to track every proposal, follow-up, and close

How It Works:

Paste your client conversation into the AI prompt. The system produces a structured proposal with locked scope, clear deliverables, payment milestones, and a clause that closes the loop if the client goes silent. First time: 15 minutes. Every time after: under 10.

Who It''s For:

• Freelancers who keep doing extra work for free
• Agency owners whose proposals lead to scope arguments
• Consultants who send proposals and then wait, and wait, and wait
• Anyone who has ever heard "can you just add one more thing?"

What You''ll Get:

• Instant access to the full Notion workspace
• AI Proposal Prompt Library (4 prompts)
• Scope-Lock & Payment Clause Library (5 clauses)
• Proposal Tracker database
• Before & after comparison showing exactly what changes and why it works
• Lifetime access and future updates',
  null
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  category_id = EXCLUDED.category_id,
  product_type = EXCLUDED.product_type,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  international_price = EXCLUDED.international_price,
  international_actual_price = EXCLUDED.international_actual_price,
  plan_type = EXCLUDED.plan_type,
  status = EXCLUDED.status,
  features = EXCLUDED.features,
  section_visibility = EXCLUDED.section_visibility,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  og_image = EXCLUDED.og_image,
  canonical = EXCLUDED.canonical,
  is_featured = EXCLUDED.is_featured,
  is_combo = EXCLUDED.is_combo,
  sort_order = EXCLUDED.sort_order,
  long_description = EXCLUDED.long_description,
  banner_url = EXCLUDED.banner_url;

-- 2. Seed FAQs
DELETE FROM public.product_faqs WHERE product_id = 'proposal-system';
INSERT INTO public.product_faqs (product_id, question, answer, sort_order)
VALUES
  ('proposal-system', 'Is this a course or video content?', 'No. This is a Notion workspace — a ready-to-use operational system. There are no videos to watch. You open it, follow the steps, and build your first proposal in 15 minutes.', 0),
  ('proposal-system', 'Do I need to know how to use Notion?', 'Basic familiarity helps, but the workspace is designed to be self-explanatory. If you can duplicate a Notion template, you can use this system.', 1),
  ('proposal-system', 'Do I need to use AI tools?', 'The prompts are designed for ChatGPT or any GPT-4-level model. You paste the prompt, paste your client conversation, and the AI does the drafting. No AI experience required.', 2),
  ('proposal-system', 'What if my client still scopes creep after I use this?', 'The Scope-Lock Clause Library gives you exact language to include in every proposal that defines what is and is not included. It also tells clients explicitly what happens if they request additions — so you have a documented agreement to point back to.', 3),
  ('proposal-system', 'Is there a refund policy?', 'Due to the digital nature of this product, all sales are final. If you have any trouble accessing the workspace, contact support and we will resolve it immediately.', 4);

-- 3. Seed fresh zero analytics
DELETE FROM public.product_analytics WHERE product_id = 'proposal-system';
INSERT INTO public.product_analytics (product_id, views_count, checkout_clicks_count, purchases_count)
VALUES ('proposal-system', 0, 0, 0);
