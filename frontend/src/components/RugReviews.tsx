import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BadgeCheck, Star } from 'lucide-react';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { useBotProtection } from '../hooks/useBotProtection';

export interface RugReview {
  id: number;
  name: string;
  rating: number;
  title: string | null;
  body: string;
  is_verified_buyer: boolean;
  created_at: string | null;
}

export interface RugReviewSummary {
  average_rating: number | null;
  review_count: number;
  rating_counts: Record<string, number>;
  reviews: RugReview[];
}

export function useRugReviews(rugId: number | undefined) {
  const [summary, setSummary] = useState<RugReviewSummary | null>(null);
  const reload = useCallback(() => {
    if (!rugId) return;
    axios.get<RugReviewSummary>(`/api/customer/catalog/${rugId}/reviews`)
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null));
  }, [rugId]);
  useEffect(() => { reload(); }, [reload]);
  return { summary, reload };
}

export function StarRating({ value, size = 16, className = '' }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-stone-300" />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="text-[#85501b]" fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star size={26} className={n <= shown ? 'text-[#85501b]' : 'text-stone-300'} fill={n <= shown ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      {shown > 0 && <span className="text-sm text-stone-600">{labels[shown]}</span>}
    </div>
  );
}

const inputCls = 'w-full bg-white border border-stone-300 focus:border-stone-600 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-colors';

export default function RugReviews({ rugId, rugName, summary, onSubmitted }: {
  rugId: number;
  rugName: string;
  summary: RugReviewSummary | null;
  onSubmitted: () => void;
}) {
  const { customer, customerToken, isCustomerAuthenticated } = useCustomerAuth();
  const bot = useBotProtection();
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [thanks, setThanks] = useState('');

  useEffect(() => {
    if (isCustomerAuthenticated && customer) {
      setName((current) => current || customer.name);
      setEmail(customer.email);
    }
  }, [isCustomerAuthenticated, customer]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rating) { setError('Please choose a star rating.'); return; }
    if (body.trim().length < 10) { setError('Please write at least a sentence about the rug.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post(`/api/customer/catalog/${rugId}/reviews`, {
        name: name.trim(), email: email.trim(), rating, title: title.trim() || null, body: body.trim(),
      }, {
        headers: { ...(await bot.headers()), ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}) },
      });
      setThanks(data.message);
      setFormOpen(false);
      setRating(0); setTitle(''); setBody('');
      onSubmitted();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'We could not send your review. Please check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const count = summary?.review_count ?? 0;
  const average = summary?.average_rating ?? 0;

  return (
    <section id="reviews" className="scroll-mt-32 max-w-4xl border-t border-stone-100 pt-10 pb-4">
      <p className="storefront-eyebrow text-stone-400">What customers say</p>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-serif text-3xl font-light text-stone-900">Reviews</h2>
        {!formOpen && (
          <button type="button" onClick={() => { setFormOpen(true); setThanks(''); }} className="storefront-cta-outline px-6 py-3">
            Write a review
          </button>
        )}
      </div>

      {count > 0 && summary && (
        <div className="mb-8 grid gap-6 border-y border-stone-200 py-6 sm:grid-cols-[auto_1fr] sm:gap-12">
          <div>
            <p className="font-serif text-5xl font-light text-stone-900">{average.toFixed(1)}</p>
            <StarRating value={average} size={18} className="mt-2" />
            <p className="mt-1 text-sm text-stone-500">{count} review{count === 1 ? '' : 's'}</p>
          </div>
          <div className="space-y-1.5 self-center">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = summary.rating_counts[String(n)] ?? 0;
              return (
                <div key={n} className="flex items-center gap-3 text-sm text-stone-600">
                  <span className="w-12 flex-shrink-0">{n} star</span>
                  <span className="h-2 flex-1 bg-stone-100">
                    <span className="block h-2 bg-[#85501b]" style={{ width: `${count ? (c / count) * 100 : 0}%` }} />
                  </span>
                  <span className="w-6 text-right tabular-nums text-stone-500">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {thanks && <p className="mb-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{thanks}</p>}

      {formOpen && (
        <form onSubmit={submit} className="mb-10 space-y-4 border border-stone-200 bg-stone-50 p-5 sm:p-6">
          <p className="font-serif text-xl text-stone-900">Review {rugName}</p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-500">Your rating</p>
            <RatingPicker value={rating} onChange={(n) => { setRating(n); setError(''); }} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Name (shown publicly)</span>
              <input required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Email (never shown)</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isCustomerAuthenticated} className={`${inputCls} disabled:bg-stone-100 disabled:text-stone-500`} />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Title (optional)</span>
            <input maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up in a few words" className={inputCls} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Your review</span>
            <textarea required minLength={10} maxLength={3000} rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How does it look, feel and wear in your space?" className={`${inputCls} resize-y`} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitting} className="storefront-cta-solid px-8 py-3">
              {submitting ? 'Sending…' : 'Submit review'}
            </button>
            <button type="button" onClick={() => { setFormOpen(false); setError(''); }} className="px-4 py-3 text-sm text-stone-500 hover:text-stone-900">
              Cancel
            </button>
            <p className="text-xs text-stone-400">Reviews appear after a quick check by our team.</p>
          </div>
          {bot.fields}
        </form>
      )}

      {count === 0 ? (
        !formOpen && <p className="text-sm text-stone-500">No reviews yet — be the first to share how this rug looks in your home.</p>
      ) : (
        <div className="divide-y divide-stone-200">
          {summary!.reviews.map((review) => (
            <article key={review.id} className="py-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StarRating value={review.rating} size={15} />
                {review.title && <h3 className="font-medium text-stone-900">{review.title}</h3>}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">{review.body}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                <span className="font-medium text-stone-700">{review.name}</span>
                {review.is_verified_buyer && (
                  <span className="inline-flex items-center gap-1 text-green-700"><BadgeCheck size={13} /> Verified buyer</span>
                )}
                {review.created_at && <time>{new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time>}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
