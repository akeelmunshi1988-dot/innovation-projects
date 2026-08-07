import { useEffect, useState } from 'react';
import { Mail, Download, RefreshCw } from 'lucide-react';
import { getNewsletterSubscribers, exportNewsletterSubscribers } from '../services/api';
import type { NewsletterSubscriber } from '../types';

export default function NewsletterSubscribers() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const data = await getNewsletterSubscribers();
      setSubscribers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportNewsletterSubscribers();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Mail size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Newsletter Subscribers</h1>
            <p className="text-dark-400 text-sm">
              Emails captured from the storefront footer signup form. {subscribers.length} total.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchSubscribers} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || subscribers.length === 0}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subscribers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Mail size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No subscribers yet. They'll appear here as visitors sign up in the homepage footer.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 text-left">
                <th className="px-5 py-3 text-dark-400 font-semibold uppercase text-xs tracking-wider">Email</th>
                <th className="px-5 py-3 text-dark-400 font-semibold uppercase text-xs tracking-wider">Source</th>
                <th className="px-5 py-3 text-dark-400 font-semibold uppercase text-xs tracking-wider">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-dark-800 last:border-0">
                  <td className="px-5 py-3 text-cream-100">{s.email}</td>
                  <td className="px-5 py-3 text-dark-400">{s.source || '—'}</td>
                  <td className="px-5 py-3 text-dark-400">
                    {s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
