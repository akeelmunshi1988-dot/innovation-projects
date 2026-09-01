import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, ChevronLeft as ArrowLeft, X, Star, Layers } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import type { ProjectGalleryItem } from '../types';

/**
 * Single-project detail page — reference: carpet.axiomthemes.com/single-project/.
 * Reached by clicking a tile in the homepage's "Rugs in Their New Homes"
 * mosaic (CustomerHome.tsx) or the full /project-gallery listing
 * (ProjectGallery.tsx, the customer-facing one — not to be confused with
 * the admin CRUD screen at /admin/project-gallery of the same component
 * name). Fetches the full project shape (all images, description, and the
 * owner's own message/rating) from GET /customer/gallery-items/:id, which
 * deliberately returns more than the lightweight homepage-tile list
 * endpoint does — see that route's comment in customer.py.
 */
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectGalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    axios.get(`/api/customer/gallery-items/${id}`)
      .then(({ data }) => setProject(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!expandedImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expandedImage]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  if (notFound || !project) {
    return (
      <CustomerLayout>
        <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <Layers size={36} className="text-stone-300 mx-auto" />
          <h2 className="storefront-heading text-2xl">Project Not Found</h2>
          <Link to="/project-gallery" className="storefront-link-arrow justify-center">Back to Gallery <ChevronRight size={14} /></Link>
        </div>
      </CustomerLayout>
    );
  }

  const galleryImages = [
    { id: 'cover', image_url: project.image_url },
    ...project.images,
  ];

  return (
    <CustomerLayout>
      <SEO
        title={project.caption || 'Rugs in Their New Homes'}
        description={project.description || 'A completed rug project, in the customer’s own home.'}
        image={project.image_url}
      />

      <div className="w-[94vw] max-w-none mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
          <ChevronRight size={11} />
          <Link to="/project-gallery" className="hover:text-stone-900 transition-colors">Project Gallery</Link>
          <ChevronRight size={11} />
          <span className="text-stone-600 truncate">{project.caption || `Project #${project.id}`}</span>
        </div>

        {project.caption && (
          <div className="pb-2">
            <p className="storefront-eyebrow mb-2">Project Gallery</p>
            <h1 className="storefront-heading text-4xl">{project.caption}</h1>
          </div>
        )}

        {/* Image grid — cover + every uploaded gallery photo, uncropped
            (object-contain, matching this codebase's other "whole,
            uncropped images" gallery convention rather than a cropped tile
            grid) with a click-to-expand lightbox. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {galleryImages.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setExpandedImage({ src: img.image_url, alt: project.caption || `Project photo ${i + 1}` })}
              className={`relative bg-stone-100 overflow-hidden aspect-[4/3] ${0 === i ? 'sm:col-span-2 sm:aspect-[21/9]' : ''} cursor-zoom-in group`}
            >
              <img
                src={img.image_url}
                alt={project.caption || `Project photo ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                loading={0 === i ? 'eager' : 'lazy'}
              />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-4">
          {project.description && (
            <div className="lg:col-span-2 space-y-3">
              <h2 className="font-serif text-2xl font-light text-stone-900">About This Project</h2>
              <p className="text-stone-600 leading-relaxed whitespace-pre-line">{project.description}</p>
            </div>
          )}

          {(project.owner_message || project.owner_name || null != project.rating) && (
            <div className={`${project.description ? '' : 'lg:col-span-3'} border border-stone-200 bg-stone-50 p-6 space-y-4 h-fit`}>
              <p className="storefront-eyebrow">From the Homeowner</p>
              {null != project.rating && (
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={15} className={i < project.rating! ? 'text-amber-500 fill-amber-500' : 'text-stone-200'} />
                  ))}
                </div>
              )}
              {project.owner_message && (
                <p className="font-serif text-lg font-light text-stone-800 leading-relaxed">&ldquo;{project.owner_message}&rdquo;</p>
              )}
              {project.owner_name && (
                <p className="text-stone-500 text-sm">&mdash; {project.owner_name}</p>
              )}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-stone-100">
          <Link to="/project-gallery" className="storefront-link-arrow">
            <ArrowLeft size={13} /> Back to Gallery
          </Link>
        </div>
      </div>

      {expandedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded project photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/90 p-4 sm:p-8"
          onClick={() => setExpandedImage(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            aria-label="Close expanded image"
            className="absolute right-4 top-4 sm:right-6 sm:top-6 w-10 h-10 flex items-center justify-center bg-white text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={expandedImage.src}
            alt={expandedImage.alt}
            className="w-full h-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </CustomerLayout>
  );
}
