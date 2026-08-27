import React, { useEffect, useState } from 'react';
import { Key, Plus, Trash2, X, AlertTriangle, RefreshCw, Copy, Check, ShieldAlert } from 'lucide-react';
import { getApiClients, createApiClient, revokeApiClient } from '../services/api';
import type { ApiClient, ApiClientCreated } from '../types';

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString();
}

export default function ApiAccess() {
  const [items, setItems] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ApiClientCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiClient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      setItems(await getApiClients());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await createApiClient(newName.trim());
      setCreated(result);
      setShowCreate(false);
      setNewName('');
      await fetchItems();
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await revokeApiClient(deleteTarget.id);
      setDeleteTarget(null);
      await fetchItems();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Key size={22} className="text-gold-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream-100">API Access</h1>
            <p className="text-dark-400 text-sm">
              Keys for external systems (ERP, partner storefronts) to create catalog items, materials, quotes, and orders via the public API.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchItems} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Generate Key
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Key size={40} className="text-dark-600" />
          <p className="text-dark-400 text-sm">No API keys yet.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Generate Key
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-cream-100 text-sm">{c.name}</p>
                <button
                  onClick={() => setDeleteTarget(c)}
                  className="text-dark-400 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Revoke key"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <code className="block text-xs text-dark-400 bg-dark-800 border border-dark-700 rounded px-2 py-1.5 truncate">
                {c.key_prefix}…
              </code>
              <div className="text-xs text-dark-500 space-y-0.5">
                <p>Created {formatDate(c.created_at)}</p>
                <p>Last used {formatDate(c.last_used_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate key modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/70 backdrop-blur-sm">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-cream-100 font-bold">Generate API Key</h3>
              <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-cream-200">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-dark-300 text-xs uppercase tracking-wider mb-1.5">Label</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Partner ERP sync"
                className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex-1 btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-time key reveal */}
      {created && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/70 backdrop-blur-sm">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={18} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-cream-100 font-bold">Copy this key now</h3>
                <p className="text-dark-400 text-sm mt-0.5">It won't be shown again — store it somewhere safe.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-dark-800 border border-dark-600 rounded-xl px-3 py-3">
              <code className="flex-1 text-xs text-cream-200 break-all">{created.api_key}</code>
              <button onClick={handleCopy} className="flex-shrink-0 btn-secondary flex items-center gap-1.5 text-xs px-2.5 py-1.5">
                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-dark-500 text-xs">
              Send this as the <code className="text-dark-300">X-Api-Key</code> header on requests to <code className="text-dark-300">/api/v1/*</code> endpoints.
            </p>
            <button onClick={() => setCreated(null)} className="w-full btn-primary text-sm">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Revoke confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/70 backdrop-blur-sm">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-cream-100 font-bold">Revoke Key?</h3>
                <p className="text-dark-400 text-sm mt-0.5">"{deleteTarget.name}" will stop working immediately. This can't be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-dark-600 text-dark-300 text-sm hover:bg-dark-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
