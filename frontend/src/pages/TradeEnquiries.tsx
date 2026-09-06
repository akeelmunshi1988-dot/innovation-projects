import { useEffect, useState } from 'react';
import { Briefcase, RefreshCw } from 'lucide-react';
import { getTradeEnquiries, markTradeEnquiryRead, deleteTradeEnquiry } from '../services/api';
import type { TradeEnquiry } from '../types';

const PROFESSION_LABELS: Record<string, string> = {
  architect: 'Architect',
  interior_designer: 'Interior Designer',
  retailer: 'Retailer / Rug Showroom',
  wholesaler: 'Wholesaler',
  private_label: 'Private Label Brand',
  hospitality: 'Hospitality Company',
};

export default function TradeEnquiries() {
  const [enquiries, setEnquiries] = useState<TradeEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      setEnquiries(await getTradeEnquiries());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load trade enquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEnquiries(); }, []);

  const markRead = async (id: number) => {
    const updated = await markTradeEnquiryRead(id);
    setEnquiries(current => current.map(item => item.id === id ? updated : item));
  };

  const removeEnquiry = async (id: number) => {
    if (!window.confirm('Delete this enquiry permanently?')) return;
    await deleteTradeEnquiry(id);
    setEnquiries(current => current.filter(item => item.id !== id));
  };

  const unreadCount = enquiries.filter(item => !item.is_read).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Briefcase size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Trade Enquiries</h1>
            <p className="text-dark-400 text-sm">{enquiries.length} total · {unreadCount} unread</p>
          </div>
        </div>
        <button type="button" onClick={loadEnquiries} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : enquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Briefcase size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No trade enquiries yet. New submissions from the Trade Enquiry page will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map(enquiry => (
            <article key={enquiry.id} className={`rounded-xl border p-5 ${enquiry.is_read ? 'border-dark-700 bg-dark-900' : 'border-gold-700/60 bg-gold-950/10'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-semibold text-cream-100">{enquiry.first_name} {enquiry.last_name} · {enquiry.company}</h3>
                  <p className="mt-1 text-sm text-dark-300">
                    <a href={`mailto:${enquiry.email}`} className="text-gold-400 hover:underline">{enquiry.email}</a>
                    {' · '}
                    <a href={`tel:${enquiry.phone}`} className="text-gold-400 hover:underline">{enquiry.phone}</a>
                  </p>
                </div>
                {!enquiry.is_read && <span className="rounded-full bg-gold-600/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-400">New</span>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-dark-300 sm:grid-cols-3">
                <p><span className="text-dark-500">Profession:</span> {PROFESSION_LABELS[enquiry.profession] || enquiry.profession}</p>
                <p><span className="text-dark-500">City:</span> {enquiry.city || '—'}</p>
                <p><span className="text-dark-500">Country:</span> {enquiry.country || '—'}</p>
                <p><span className="text-dark-500">Project type:</span> {enquiry.project_type || '—'}</p>
                {enquiry.website && (
                  <p className="sm:col-span-2">
                    <span className="text-dark-500">Website:</span>{' '}
                    <a href={enquiry.website.startsWith('http') ? enquiry.website : `https://${enquiry.website}`} target="_blank" rel="noreferrer" className="text-gold-400 hover:underline">{enquiry.website}</a>
                  </p>
                )}
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-dark-200">{enquiry.project_brief}</p>

              <div className="mt-4 flex items-center justify-between">
                <time className="text-xs text-dark-500">{enquiry.created_at ? new Date(enquiry.created_at).toLocaleString() : 'Date unavailable'}</time>
                <div className="flex gap-2">
                  {!enquiry.is_read && <button type="button" onClick={() => markRead(enquiry.id)} className="rounded border border-dark-600 px-3 py-1.5 text-xs text-cream-200 hover:bg-dark-800">Mark read</button>}
                  <button type="button" onClick={() => removeEnquiry(enquiry.id)} className="rounded border border-red-900/70 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
