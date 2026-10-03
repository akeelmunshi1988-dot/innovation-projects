import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ScrollText } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import SEO from '../components/SEO';
import type { RugStorySummary } from '../types';

/**
 * Public /stories listing — one card per published design story, each
 * linking to its own StoryDetail.tsx page. Admin-managed at /admin/stories.
 */
export default function CustomerStories() {
  const [stories, setStories] = useState<RugStorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/customer/stories')
      .then(({ data }) => setStories(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerLayout>
      <SEO
        title="Design Stories"
        description="The stories behind our unique handmade rug designs — what inspired each one, and how our artisans brought it to life on the loom."
      />

      <section className="bg-[#f3f1e8] py-16 md:py-24">
        <div className="mx-auto w-[90vw]">
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Design Stories</p>
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <h1 className="font-condensed text-[clamp(3rem,5.1vw,6.2rem)] font-medium uppercase leading-[0.98] tracking-[-0.035em] text-[#191d27] md:col-span-10">
              Every design has a story.{' '}
              <span className="text-[#9b9a93]">Here is where ours begin.</span>
            </h1>
            <p className="text-base leading-relaxed text-stone-500 md:col-span-6 md:col-start-7 md:text-lg">
              From a faded atlas to a monsoon sky — the ideas behind our one-of-a-kind rugs, and the hands that wove them.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-[90vw] py-16 md:py-20">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <ScrollText size={32} className="mx-auto text-stone-300" />
            <p className="text-stone-400 text-sm">No stories published yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {stories.map((s, index) => (
              <Link
                key={s.id}
                to={`/stories/${s.slug}`}
                className={`group block ${index % 3 === 1 ? 'lg:mt-14' : ''}`}
              >
                <div className="relative overflow-hidden bg-stone-100 aspect-[4/5]">
                  {s.cover_image_url ? (
                    <img
                      src={s.cover_image_url}
                      alt={s.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ScrollText size={32} className="text-stone-300" />
                    </div>
                  )}
                </div>
                <div className="pt-5 space-y-2">
                  <h2 className="font-condensed text-2xl font-medium uppercase leading-tight text-[#191d27] transition-colors group-hover:text-rug-700">{s.title}</h2>
                  {s.inspiration && <p className="text-sm leading-relaxed text-stone-500">{s.inspiration}</p>}
                  <span className="inline-block pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-900 border-b border-stone-300 group-hover:border-stone-900 transition-colors">
                    Read the story
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
