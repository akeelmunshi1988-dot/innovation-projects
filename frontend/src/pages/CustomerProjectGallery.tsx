import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Star, Layers } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import type { ProjectGalleryItem } from '../types';

/**
 * Public /project-gallery listing — every published project, each linking
 * to its own ProjectDetail.tsx page. Not to be confused with the admin CRUD
 * screen at /admin/project-gallery, which reuses the ProjectGallery.tsx
 * component name for an entirely different (staff-only, editing) purpose.
 *
 * Uses GET /customer/gallery-items — the same lightweight endpoint
 * CustomerHome.tsx's homepage mosaic reads — since a listing page only
 * needs the cover image/caption per project, not the full detail shape.
 */
export default function CustomerProjectGallery() {
  const [items, setItems] = useState<ProjectGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/customer/gallery-items')
      .then(({ data }) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerLayout>
      <SEO
        title="Rugs in Their New Homes"
        description="A gallery of real DreamRugsCreation rugs, installed in customers' own homes — from living rooms to bedrooms, every project in its finished setting."
      />

      <div className="w-[94vw] max-w-none mx-auto px-4 py-10 space-y-10">
        <div>
          <p className="storefront-eyebrow mb-2">Project Gallery</p>
          <h1 className="storefront-heading text-4xl">Rugs in Their New Homes</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          </div>
        ) : 0 === items.length ? (
          <div className="text-center py-24 space-y-3">
            <Layers size={32} className="mx-auto text-stone-300" />
            <p className="text-stone-400 text-sm">No projects published yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {items.map((g) => (
              <Link key={g.id} to={`/project-gallery/${g.id}`} className="group block">
                <div className="relative overflow-hidden bg-stone-100 aspect-[4/5]">
                  <img
                    src={g.image_url}
                    alt={g.caption ?? ''}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                  />
                </div>
                <div className="pt-4 space-y-1">
                  {g.caption && <h3 className="font-serif text-base font-light text-stone-900 leading-snug">{g.caption}</h3>}
                  {null != g.rating && (
                    <div className="flex items-center gap-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} size={11} className={i < g.rating! ? 'text-amber-500 fill-amber-500' : 'text-stone-200'} />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
