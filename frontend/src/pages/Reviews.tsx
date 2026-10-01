import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, RefreshCw, Star } from 'lucide-react';
import { deleteReview, getReviews, updateReviewStatus } from '../services/api';
import type { AdminRugReview, ReviewStatus } from '../types';

const TABS: { id: ReviewStatus | 'all'; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const STATUS_BADGE: Record<ReviewStatus, string> = {
  pending: 'bg-gold-600/20 text-gold-400',
  approved: 'bg-green-600/20 text-green-400',
  rejected: 'bg-red-600/20 text-red-400',
};

export default function Reviews() {
  const [tab, setTab] = useState<ReviewStatus | 'all'>('pending');
  const [reviews, setReviews] = useState<AdminRugReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    try {
      setReviews(await getReviews());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, []);

  const setStatus = async (id: number, status: ReviewStatus) => {
    try {
      const updated = await updateReviewStatus(id, status);
      setReviews(current => current.map(item => item.id === id ? updated : item));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not update the review.');
    }
  };

  const removeReview = async (id: number) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await deleteReview(id);
      setReviews(current => current.filter(item => item.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not delete the review.');
    }
  };

  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const shown = tab === 'all' ? reviews : reviews.filter(r => r.status === tab);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Star size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Rug Reviews</h1>
            <p className="text-dark-400 text-sm">{reviews.length} total · {pendingCount} awaiting approval</p>
          </div>
        </div>
        <button type="button" onClick={loadReviews} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 border-b border-dark-700">
        {TABS.map(t => {
          const n = t.id === 'all' ? reviews.length : reviews.filter(r => r.status === t.id).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${tab === t.id ? 'border-gold-500 text-cream-100' : 'border-transparent text-dark-400 hover:text-cream-200'}`}
            >
              {t.label} <span className="text-dark-500">({n})</span>
            </button>
          );
        })}
      </div>

      {error && <div className="rounded-xl border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Star size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">
            {tab === 'pending' ? 'No reviews waiting for approval.' : 'No reviews here yet.'} Reviews customers write on rug pages appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map(review => (
            <article key={review.id} className={`rounded-xl border p-5 ${review.status === 'pending' ? 'border-gold-700/60 bg-gold-950/10' : 'border-dark-700 bg-dark-900'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm text-dark-400">
                    {review.rug_slug
                      ? <Link to={`/catalog/${review.rug_slug}`} target="_blank" className="text-gold-400 hover:underline">{review.rug_name}</Link>
                      : review.rug_name || `Rug #${review.rug_id}`}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex">
                      {[1, 2, 3, 4, 5].map(n => <Star key={n} size={15} className={n <= review.rating ? 'text-gold-400' : 'text-dark-600'} fill={n <= review.rating ? 'currentColor' : 'none'} />)}
                    </span>
                    {review.title && <h3 className="font-semibold text-cream-100">{review.title}</h3>}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${STATUS_BADGE[review.status]}`}>{review.status}</span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-dark-200">{review.body}</p>

              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dark-300">
                <span>{review.name}</span>
                <a href={`mailto:${review.email}`} className="text-gold-400 hover:underline">{review.email}</a>
                {review.is_verified_buyer && <span className="inline-flex items-center gap-1 text-green-400"><BadgeCheck size={14} /> Verified buyer</span>}
              </p>

              <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                <time className="text-xs text-dark-500">{review.created_at ? new Date(review.created_at).toLocaleString() : 'Date unavailable'}</time>
                <div className="flex gap-2">
                  {review.status !== 'approved' && <button type="button" onClick={() => setStatus(review.id, 'approved')} className="rounded border border-green-900/70 px-3 py-1.5 text-xs text-green-400 hover:bg-green-950/30">Approve</button>}
                  {review.status !== 'rejected' && <button type="button" onClick={() => setStatus(review.id, 'rejected')} className="rounded border border-dark-600 px-3 py-1.5 text-xs text-cream-200 hover:bg-dark-800">{review.status === 'approved' ? 'Hide' : 'Reject'}</button>}
                  <button type="button" onClick={() => removeReview(review.id)} className="rounded border border-red-900/70 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
