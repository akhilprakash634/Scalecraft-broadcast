import ProductsManager from '@/components/admin/ProductsManager';

export default function AdminSaasProductsPage() {
  return (
    <ProductsManager
      productType="saas"
      defaultNewType="saas"
      pageTitle="SaaS Products"
      pageDescription="Manage WhatsApp Agent, CRM tools, subscription plans, and setup services."
    />
  );
}
