-- ==============================================================================
-- Seeding Script: AI Income Blueprint eBook (Digital Product)
-- Run this query directly in your Supabase SQL Editor to insert the product.
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
  'ai-income-blueprint',
  'AI Income Blueprint',
  'ai-income-blueprint',
  'Learn how ordinary people are using Artificial Intelligence to build income streams through freelancing, digital products, automation, consulting, and AI-powered businesses. This beginner-friendly guide includes practical strategies, real-world examples, and a 30-day action plan.',
  '/ai-income-blueprint-thumbnail.png',
  'blueprints',
  'digital',
  199,
  999,
  9,
  49,
  'standard',
  'published',
  '["18-page premium PDF", "10 AI income methods", "Real-world examples", "Beginner friendly", "30-day action plan", "AI tools recommendations", "Lifetime access", "Instant download"]'::jsonb,
  '{
    "hero": true,
    "benefits": true,
    "preview": true,
    "testimonials": true,
    "faq": true,
    "founder": true,
    "guarantee": true,
    "related": true,
    "page_sections": ["hero", "quick_facts", "problem", "features", "downloads", "faq"],
    "quick_facts": {
      "setup_time": "Instant Access",
      "best_for": "Students, Freelancers, Hustlers",
      "skill_level": "Beginner Friendly",
      "delivery": "Digital Download",
      "format": "Premium PDF (18 pages)",
      "language": "English"
    }
  }'::jsonb,
  'AI Income Blueprint | Learn 10 AI Income Methods for Beginners',
  'Discover 10 practical ways to earn with AI. Learn freelancing, automation, digital products, AI tools, and follow a 30-day action plan with the AI Income Blueprint eBook.',
  '/ai-income-blueprint-thumbnail.png',
  'https://thescalecraft.in/products/ai-income-blueprint',
  false,
  false,
  10,
  'AI Income Blueprint is a practical guide designed for beginners who want to understand how Artificial Intelligence can become a powerful income-generating tool.

Instead of focusing on theory, this eBook explains 10 real-world AI business models that people are already using to earn online. You''ll learn how businesses use AI, why they pay for AI-powered services, which tools to use, and how to start even if you have no coding experience.

Whether you''re a student, freelancer, employee, entrepreneur, or someone looking for a side income, this guide provides a structured roadmap to begin your AI journey.

Inside this eBook you''ll discover:
• AI Content Writing
• AI Social Media Management
• AI Chatbot & Automation Services
• AI Graphic Design
• AI Video Creation
• AI Prompt Engineering
• AI Lead Generation
• AI Digital Products
• AI Freelancing Agency
• AI Consulting

Also Included:
• 30-Day AI Income Action Plan
• Beginner Roadmaps
• Recommended AI Tools
• Real-World Examples
• Common Mistakes to Avoid
• Actionable Key Takeaways

Who is this for?
• Students
• Freelancers
• Business Owners
• Employees
• Job Seekers
• Side Hustlers
• Beginners Interested in AI

Requirements:
• No Coding Required
• No Prior AI Experience Needed

What You''ll Receive:
• AI Income Blueprint (PDF)
• Lifetime Access
• Instant Digital Download
• Mobile, Tablet & Desktop Compatible',
  '/ai-income-blueprint-thumbnail.png'
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

-- 2. Seed download links
DELETE FROM public.product_downloads WHERE product_id = 'ai-income-blueprint';
INSERT INTO public.product_downloads (product_id, title, url, type)
VALUES ('ai-income-blueprint', 'AI Income Blueprint eBook (PDF)', 'https://thescalecraft.in/downloads/ai-income-blueprint.pdf', 'pdf');

-- 3. Seed FAQs
DELETE FROM public.product_faqs WHERE product_id = 'ai-income-blueprint';
INSERT INTO public.product_faqs (product_id, question, answer, sort_order)
VALUES 
('ai-income-blueprint', 'Do I need coding knowledge or prior AI experience?', 'No coding or prior AI experience is required. This guide is written in plain, simple language for absolute beginners.', 0),
('ai-income-blueprint', 'What format is the eBook delivered in?', 'You will receive a high-quality PDF that is fully compatible with mobile devices, tablets, and desktop computers.', 1),
('ai-income-blueprint', 'Is there a refund policy?', 'Due to the digital nature of this product, all sales are final. If you have any issues accessing your download, please contact support.', 2);

-- 4. Seed fresh zero analytics
DELETE FROM public.product_analytics WHERE product_id = 'ai-income-blueprint';
INSERT INTO public.product_analytics (product_id, views_count, checkout_clicks_count, purchases_count)
VALUES ('ai-income-blueprint', 0, 0, 0);
