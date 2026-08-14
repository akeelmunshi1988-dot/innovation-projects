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
      <section className="max-w-2xl mx-auto px-6 py-32 text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-3">404</p>
        <h1 className="font-serif text-5xl font-light text-stone-900 leading-[1.1] mb-6">
          Page not found
        </h1>
        <p className="text-stone-500 text-lg leading-relaxed mb-10">
          The page you're looking for doesn't exist, may have been moved, or the rug
          you were viewing is no longer in our catalog.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/"
            className="px-6 py-3 bg-stone-900 text-white text-sm tracking-wide hover:bg-stone-800 transition-colors"
          >
            Back to Home
          </Link>
          <Link
            to="/catalog"
            className="px-6 py-3 border border-stone-300 text-stone-700 text-sm tracking-wide hover:border-stone-400 transition-colors"
          >
            Browse Catalog
          </Link>
        </div>
      </section>
    </CustomerLayout>
  );
}
