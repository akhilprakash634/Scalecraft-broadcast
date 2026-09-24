-- Update product descriptions in public.saas_products to match Phase 1.1 / Phase 2 conversion copywriting
UPDATE public.saas_products
SET description = 'Struggling to find new clients? Get step-by-step lead sourcing guides to build a consistent list of buyers.'
WHERE id = 'ai-lead-finder-system' OR slug = 'ai-lead-finder-system';

UPDATE public.saas_products
SET description = 'Losing track of client leads? Organize contacts in a visual sales CRM with proposal templates to close deals.'
WHERE id = 'freelance-client-pipeline-blueprint' OR slug = 'freelance-client-pipeline-blueprint';

UPDATE public.saas_products
SET description = 'Need a complete sales process? Get both sourcing and CRM systems to find prospects and sign new clients.'
WHERE id = 'ai-systems-combo' OR slug = 'ai-systems-combo';

UPDATE public.saas_products
SET description = 'Wasting time on customer questions? Deploy a 24/7 WhatsApp AI agent to answer queries and capture leads.'
WHERE id = 'scalecraft-agent-saas' OR slug = 'scalecraft-agent-saas';
