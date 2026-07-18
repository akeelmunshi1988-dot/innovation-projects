import React, { useEffect, useState } from 'react';
import { Users, Search, ChevronDown, Mail, Phone, Building2, RefreshCw } from 'lucide-react';
import { getCustomers, getCustomerQuotes } from '../services/api';
import type { Customer, Quote } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fmtTenant } from '../utils/currency';

const statusClass: Record<string, string> = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  accepted: 'badge-accepted',
  rejected: 'badge-rejected',
};

const Customers: React.FC = () => {
  const { user } = useAuth();
  const fmt = (n: number) => fmtTenant(n, user!.tenant);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [customerQuotes, setCustomerQuotes] = useState<Record<number, Quote[]>>({});
  const [loadingQuotes, setLoadingQuotes] = useState<number | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const toggleExpand = async (customerId: number) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);
    if (!customerQuotes[customerId]) {
      setLoadingQuotes(customerId);
      try {
        const quotes = await getCustomerQuotes(customerId);
        setCustomerQuotes((prev) => ({ ...prev, [customerId]: quotes }));
      } finally {
        setLoadingQuotes(null);
      }
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">Customers</h1>
            <p className="text-dark-400 text-sm">{customers.length} customers</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="input-field pl-9 text-sm w-52"
            />
          </div>
          <button onClick={fetchCustomers} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={36} className="text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">
            {search ? `No customers matching "${search}"` : 'No customers yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer) => {
            const isExpanded = expandedId === customer.id;
            const quotes = customerQuotes[customer.id] ?? [];
            const totalRevenue = quotes
              .filter((q) => q.status === 'accepted')
              .reduce((sum, q) => sum + (q.final_price ?? 0), 0);

            return (
              <div key={customer.id} className="card">
                {/* Customer row */}
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => toggleExpand(customer.id)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-rug-800/50 border border-rug-700/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-rug-300 font-bold text-sm">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-cream-100 font-semibold text-sm">{customer.name}</p>
                      {customer.company && (
                        <span className="text-dark-500 text-xs">· {customer.company}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-dark-400 text-xs">
                        <Mail size={11} /> {customer.email}
                      </span>
                      {customer.phone && (
                        <span className="flex items-center gap-1 text-dark-400 text-xs">
                          <Phone size={11} /> {customer.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="text-dark-400 text-xs">
                      Since {new Date(customer.created_at).toLocaleDateString()}
                    </p>
                    {totalRevenue > 0 && (
                      <p className="text-gold-400 text-xs font-medium">{fmt(totalRevenue)} revenue</p>
                    )}
                  </div>

                  <ChevronDown
                    size={16}
                    className={`text-dark-500 transition-transform flex-shrink-0 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Expanded quote history */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-cream-300 text-xs uppercase tracking-wider font-medium">
                        Quote History
                      </h4>
                      {loadingQuotes === customer.id && (
                        <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {quotes.length === 0 ? (
                      <p className="text-dark-500 text-sm">No quotes on file</p>
                    ) : (
                      <div className="space-y-2">
                        {quotes.map((q) => (
                          <div
                            key={q.id}
                            className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-cream-200 text-sm font-medium truncate">
                                {q.rug_catalog?.name ?? 'Custom Rug'} × {q.qty}
                              </p>
                              <p className="text-dark-500 text-xs mt-0.5">
                                {new Date(q.created_at).toLocaleDateString()} · Quote #{q.id}
                                {q.rush_order && ' · RUSH'}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={statusClass[q.status]}>{q.status}</span>
                              {q.final_price && (
                                <p className="text-gold-400 text-xs mt-1">{fmt(q.final_price)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {customer.company && (
                      <div className="flex items-center gap-2 mt-3 text-dark-400 text-xs">
                        <Building2 size={12} />
                        {customer.company}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Customers;
