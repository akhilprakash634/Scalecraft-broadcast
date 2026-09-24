import { redirect, RedirectType } from 'next/navigation';
import { resolveProduct } from '@/lib/productResolver';

export const revalidate = 0;

export default async function ScaleCraftAgentPage() {
  const resolution = await resolveProduct('scalecraft-agent');
  const targetSlug = resolution.canonicalSlug || 'scalecraft-agent-saas';
  redirect(`/products/${targetSlug}`, RedirectType.replace);
}
