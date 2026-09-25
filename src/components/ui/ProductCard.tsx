import Link from 'next/link';

export default function ProductCard({ product, geoPayment }: { product: any, geoPayment: any }) {
  return (
    <div className="border border-border-primary rounded-lg p-4 bg-bg-secondary flex flex-col justify-between h-full">
      <div>
        <h3 className="font-bold text-lg mb-2">{product.name || product.shortName || 'Product Name'}</h3>
        <p className="text-sm text-text-muted mb-4">{product.description || 'Product description goes here.'}</p>
      </div>
      <Link href={`/products/${product.slug || '#'}`} className="text-accent font-bold text-sm inline-block mt-auto hover:underline">
        View Product &rarr;
      </Link>
    </div>
  );
}
