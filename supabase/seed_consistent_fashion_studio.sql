-- ==============================================================================
-- Seeding Script: Consistent Fashion Studio (Digital Product / AI Tool Access)
-- Run this query directly in your Supabase SQL Editor to insert the product.
--
-- BEFORE RUNNING:
--   1. Replace YOUR_PDF_URL_HERE with the publicly accessible URL to:
--      ScaleCraft_Consistent_Fashion_Studio_Usage_Guide.pdf
--   2. Replace YOUR_THUMBNAIL_URL_HERE with the product promotional image URL.
--      Example: https://thescalecraft.in/consistent-fashion-studio-thumbnail.png
--
-- This script is idempotent — safe to run multiple times (ON CONFLICT DO UPDATE).
-- It does NOT modify any existing products, orders, or customer data.
-- ==============================================================================

-- 1. Insert/Update the base product record in public.saas_products
INSERT INTO public.saas_products (
  id,
  name,
  slug,
  description,
  long_description,
  thumbnail_url,
  banner_url,
  category,
  product_type,
  price,
  original_price,
  international_price,
  international_actual_price,
  plan_type,
  status,
  currency,
  is_featured,
  is_combo,
  is_new,
  sort_order,
  features,
  section_visibility,
  meta_title,
  meta_description,
  og_image,
  canonical,
  tags,
  search_text,
  published_at,
  updated_at
) VALUES (
  'consistent-fashion-studio',
  'Consistent Fashion Studio',
  'consistent-fashion-studio',

  -- Short description (shown on product cards and meta)
  'Create professional fashion photos using your model and clothing references — without a photographer, studio, or expensive photoshoot.',

  -- Long description (shown on product detail page "Problem" section)
  'Create professional fashion visuals from your existing model and clothing photos.

Consistent Fashion Studio lets clothing businesses upload a model reference and an outfit reference, then create multiple professional fashion photo variations by choosing different styles, locations, poses, attitudes, camera angles and aspect ratios.

Perfect for boutiques, clothing brands, Instagram sellers, manufacturers and e-commerce businesses that need professional product and fashion content without arranging a photoshoot every time.

CORE WORKFLOW:
1. Upload/select a Model Reference
2. Upload/select an Outfit Reference
3. Optionally add accessories
4. Choose the desired shoot configuration
5. Generate professional fashion photos
6. Create multiple variations for different marketing channels

TARGET CUSTOMERS:
• Boutique owners
• Clothing brands
• Instagram clothing sellers
• Fashion manufacturers
• E-commerce sellers
• Marketplace sellers
• Fashion influencers
• Small fashion businesses

PRODUCT PROMISE: "Professional fashion photos without a photoshoot."
POSITIONING: "Same Model. Same Outfit. Different Stunning Looks."

PLATFORM NOTE:
This tool operates through Google Flow. Availability, features, models, account requirements and platform limits may be subject to changes by Google. ScaleCraft provides access to the tool link; the tool itself is operated by Google.

PRICING:
One-time payment • No monthly subscription',

  -- Thumbnail image URL — REPLACE with your actual URL
  'YOUR_THUMBNAIL_URL_HERE',

  -- Banner URL — REPLACE with your actual URL (can be same as thumbnail)
  'YOUR_THUMBNAIL_URL_HERE',

  -- category (free-text column, no FK constraint)
  'ai-tools',

  -- product_type
  'digital',

  -- Price in INR
  399,

  -- Compare-at (original) price in INR
  499,

  -- International price in USD (~$4.80 at ₹83/USD)
  5,

  -- International compare-at price in USD
  6,

  -- plan_type
  'standard',

  -- status
  'published',

  -- currency
  'INR',

  -- is_featured
  true,

  -- is_combo
  false,

  -- is_new
  true,

  -- sort_order (appears after existing products; adjust as needed)
  50,

  -- features array (benefit bullets on product card/page)
  ARRAY[
    'Create professional fashion photos',
    'Use your own model reference',
    'Use your own clothing reference',
    'Explore different styles and locations',
    'Maintain model and outfit consistency',
    'Multiple poses and camera angles',
    'Multiple aspect ratios',
    'Create catalogue and social-media visuals',
    'Suitable for e-commerce and marketplace imagery',
    'Suitable for advertising creatives',
    'One-time payment',
    'No monthly subscription'
  ],

  -- section_visibility (JSONB): stores tool URL + metadata for delivery
  '{
    "url": "https://labs.google/fx/tools/flow/shared/tool/cb19f3fd-9ff5-400a-b577-395fcb453fc7",
    "tool_url": "https://labs.google/fx/tools/flow/shared/tool/cb19f3fd-9ff5-400a-b577-395fcb453fc7",
    "access_type": "external_tool",
    "tool_type": "google_flow_shared_tool",
    "payment_type": "one_time",
    "quick_facts": {
      "setup_time": "Instant Tool Access",
      "best_for": "Boutiques, Clothing Brands, Instagram Sellers",
      "skill_level": "No technical skills required",
      "delivery": "External AI Tool Link",
      "format": "Google Flow AI Tool",
      "language": "English"
    },
    "page_sections": ["hero", "quick_facts", "problem", "how_it_works", "features", "who_its_for", "downloads", "faq"],
    "how_it_works_steps": [
      {"number": 1, "title": "Upload a Model Reference", "description": "Select or upload a clear photo of the model you want to use for your fashion shoot."},
      {"number": 2, "title": "Upload an Outfit Reference", "description": "Upload the clothing or outfit you want to showcase in the generated photos."},
      {"number": 3, "title": "Configure Your Shoot", "description": "Choose your desired style, location, pose, attitude, camera angle and aspect ratio."},
      {"number": 4, "title": "Generate Fashion Photos", "description": "The tool creates professional fashion photo variations based on your references and selections."},
      {"number": 5, "title": "Create Multiple Variations", "description": "Repeat with different configurations to build a complete content library for all marketing channels."}
    ]
  }'::jsonb,

  -- SEO meta title
  'Consistent Fashion Studio | AI Fashion Photography Tool | ScaleCraft',

  -- SEO meta description
  'Create professional fashion photos from model and clothing references with Consistent Fashion Studio. Perfect for boutiques, clothing brands, Instagram sellers and e-commerce businesses.',

  -- OG image
  'YOUR_THUMBNAIL_URL_HERE',

  -- Canonical URL
  'https://thescalecraft.in/products/consistent-fashion-studio',

  -- Tags
  ARRAY['ai-tools', 'fashion', 'ecommerce', 'photography', 'digital'],

  -- Search text (full-text for search index)
  'Consistent Fashion Studio AI fashion photography tool boutique clothing brand Instagram seller ecommerce fashion photo generator model reference outfit reference professional product photography catalogue photos',

  -- published_at
  NOW(),

  -- updated_at
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name                     = EXCLUDED.name,
  slug                     = EXCLUDED.slug,
  description              = EXCLUDED.description,
  long_description         = EXCLUDED.long_description,
  thumbnail_url            = EXCLUDED.thumbnail_url,
  banner_url               = EXCLUDED.banner_url,
  category                 = EXCLUDED.category,
  product_type             = EXCLUDED.product_type,
  price                    = EXCLUDED.price,
  original_price           = EXCLUDED.original_price,
  international_price      = EXCLUDED.international_price,
  international_actual_price = EXCLUDED.international_actual_price,
  plan_type                = EXCLUDED.plan_type,
  status                   = EXCLUDED.status,
  currency                 = EXCLUDED.currency,
  is_featured              = EXCLUDED.is_featured,
  is_combo                 = EXCLUDED.is_combo,
  is_new                   = EXCLUDED.is_new,
  sort_order               = EXCLUDED.sort_order,
  features                 = EXCLUDED.features,
  section_visibility       = EXCLUDED.section_visibility,
  meta_title               = EXCLUDED.meta_title,
  meta_description         = EXCLUDED.meta_description,
  og_image                 = EXCLUDED.og_image,
  canonical                = EXCLUDED.canonical,
  tags                     = EXCLUDED.tags,
  search_text              = EXCLUDED.search_text,
  updated_at               = NOW();


-- 2. Seed product downloads (Usage Guide PDF + Tool Access Link)
-- Replace YOUR_PDF_URL_HERE with the actual publicly accessible PDF URL before running.
DELETE FROM public.product_downloads WHERE product_id = 'consistent-fashion-studio';

INSERT INTO public.product_downloads (product_id, title, url, type)
VALUES
  (
    'consistent-fashion-studio',
    'Consistent Fashion Studio Usage & Quick Start Guide (PDF)',
    'YOUR_PDF_URL_HERE',
    'pdf'
  ),
  (
    'consistent-fashion-studio',
    'Open Consistent Fashion Studio (Google Flow Tool)',
    'https://labs.google/fx/tools/flow/shared/tool/cb19f3fd-9ff5-400a-b577-395fcb453fc7',
    'external_tool'
  );


-- 3. Seed FAQs
DELETE FROM public.product_faqs WHERE product_id = 'consistent-fashion-studio';

INSERT INTO public.product_faqs (product_id, question, answer, sort_order)
VALUES
  (
    'consistent-fashion-studio',
    'What do I need to use Consistent Fashion Studio?',
    'A model reference image and an outfit or clothing reference image. Clear, high-quality references generally produce better results.',
    0
  ),
  (
    'consistent-fashion-studio',
    'Can I use my own model?',
    'Yes. Upload or select a suitable model reference image through the tool.',
    1
  ),
  (
    'consistent-fashion-studio',
    'Can I use my own clothing?',
    'Yes. Upload or select the clothing or outfit reference you want to showcase.',
    2
  ),
  (
    'consistent-fashion-studio',
    'What can I create with this tool?',
    'Fashion catalogue photos, Instagram content, website product visuals, marketplace imagery and advertising creatives — all using your chosen model and outfit references.',
    3
  ),
  (
    'consistent-fashion-studio',
    'Is this a monthly subscription?',
    'No. The ScaleCraft product is sold as a one-time purchase. You receive access to the tool link with no recurring fees from ScaleCraft.',
    4
  ),
  (
    'consistent-fashion-studio',
    'Where do I access the tool?',
    'Through the provided Google Flow tool link, which is delivered immediately after your purchase is confirmed.',
    5
  ),
  (
    'consistent-fashion-studio',
    'Do I receive a usage guide?',
    'Yes. Customers receive the Consistent Fashion Studio Usage & Quick Start Guide (PDF) along with the tool access link.',
    6
  ),
  (
    'consistent-fashion-studio',
    'Can Google Flow change?',
    'The tool operates through Google Flow, so Google''s platform features, availability, account requirements and generation limits may change independently of ScaleCraft. ScaleCraft provides access to the tool link; the tool is operated by Google.',
    7
  );


-- 4. Seed analytics (zero-initialized)
DELETE FROM public.product_analytics WHERE product_id = 'consistent-fashion-studio';

INSERT INTO public.product_analytics (product_id, views_count, checkout_clicks_count, purchases_count)
VALUES ('consistent-fashion-studio', 0, 0, 0);


-- 5. (Optional) Add to search_index for AI/text search
INSERT INTO search_index (product_id, keywords, synonyms, categories, buyer_intent)
VALUES (
  'consistent-fashion-studio',
  ARRAY[
    'ai fashion photography',
    'fashion photo generator',
    'clothing photography',
    'ai product photography',
    'fashion catalogue photos',
    'ai fashion studio',
    'boutique photography',
    'ecommerce fashion photos',
    'model reference fashion',
    'outfit reference photography'
  ],
  ARRAY[
    'fashion photo ai',
    'clothing photo tool',
    'ai model photography',
    'fashion image generator'
  ],
  ARRAY['ai-tools', 'fashion', 'ecommerce', 'photography'],
  'transactional'
)
ON CONFLICT DO NOTHING;


-- ==============================================================================
-- POST-RUN VERIFICATION QUERIES (run these after the seed to confirm success)
-- ==============================================================================
-- SELECT id, name, slug, price, original_price, status, is_featured FROM public.saas_products WHERE id = 'consistent-fashion-studio';
-- SELECT * FROM public.product_downloads WHERE product_id = 'consistent-fashion-studio';
-- SELECT * FROM public.product_faqs WHERE product_id = 'consistent-fashion-studio' ORDER BY sort_order;
-- SELECT * FROM public.product_analytics WHERE product_id = 'consistent-fashion-studio';
-- ==============================================================================
