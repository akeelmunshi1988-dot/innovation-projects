import { Link } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <CustomerLayout>
      <SEO
        title="Page Not Found"
        description="The page you're looking for doesn't exist or may have been moved."
        noindex
      />
      <section className="max-w-2xl mx-auto px-4 py-32 text-center">
        <p className="storefront-eyebrow mb-3">404</p>
        <h1 className="storefront-heading text-5xl leading-[1.1] mb-6">
          Page not found
        </h1>
        <p className="text-stone-500 text-lg leading-relaxed mb-10">
          The page you're looking for doesn't exist, may have been moved, or the rug
          you were viewing is no longer in our catalog.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/" className="storefront-cta-solid px-6 py-3">
            Back to Home
          </Link>
          <Link to="/catalog" className="storefront-cta-outline px-6 py-3">
            Browse Catalog
          </Link>
        </div>
      </section>
    </CustomerLayout>
  );
}
