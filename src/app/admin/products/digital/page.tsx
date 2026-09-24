import ProductsManager from '@/components/admin/ProductsManager';

export default function AdminDigitalProductsPage() {
  return (
    <ProductsManager
      productType="digital"
      defaultNewType="digital"
      pageTitle="Digital Products"
      pageDescription="Manage Notion templates, guides, prompt packs, bundles, and ebooks."
    />
  );
}
