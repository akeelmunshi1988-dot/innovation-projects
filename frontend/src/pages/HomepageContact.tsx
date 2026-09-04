import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Check, Eye, EyeOff, ImagePlus, Mail, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deleteHomepageEnquiry, getHomepageEnquiries, markHomepageEnquiryRead } from '../services/api';
import type { HomepageEnquiry } from '../types';

const DEFAULT_HEADING = 'Have Questions?\nGet in Touch!';
const DEFAULT_CONSENT = 'I agree that my submitted data is being collected and stored.';
const DEFAULT_SUCCESS = 'Thank you. Your enquiry has been sent successfully.';

export default function HomepageContact() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;
  const [imageUrl, setImageUrl] = useState(tenant.homepage_contact_image_url || '');
  const [imageAlt, setImageAlt] = useState(tenant.homepage_contact_image_alt || 'A rug artisan at work');
  const [heading, setHeading] = useState(tenant.homepage_contact_heading || DEFAULT_HEADING);
  const [consentText, setConsentText] = useState(tenant.homepage_contact_consent_text || DEFAULT_CONSENT);
  const [buttonLabel, setButtonLabel] = useState(tenant.homepage_contact_button_label || 'Send Message');
  const [successMessage, setSuccessMessage] = useState(tenant.homepage_contact_success_message || DEFAULT_SUCCESS);
  const [enabled, setEnabled] = useState(tenant.homepage_contact_enabled ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [enquiries, setEnquiries] = useState<HomepageEnquiry[]>([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  const inputClass = 'w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600/60 focus:outline-none';

  const loadEnquiries = async () => {
    setLoadingEnquiries(true);
    try {
      setEnquiries(await getHomepageEnquiries());
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load enquiries.');
    } finally {
      setLoadingEnquiries(false);
    }
  };

  useEffect(() => { loadEnquiries(); }, []);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError('');
    setSaved(false);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axios.post('/api/tenant/homepage-contact-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateTenant(data);
      setImageUrl(data.homepage_contact_image_url || '');
      setEnabled(data.homepage_contact_enabled ?? true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!heading.trim() || !consentText.trim() || !buttonLabel.trim() || !successMessage.trim()) {
      setError('Heading, consent text, button label and success message are required.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        homepage_contact_image_url: imageUrl,
        homepage_contact_image_alt: imageAlt.trim(),
        homepage_contact_heading: heading.trim(),
        homepage_contact_consent_text: consentText.trim(),
        homepage_contact_button_label: buttonLabel.trim(),
        homepage_contact_success_message: successMessage.trim(),
        homepage_contact_enabled: enabled,
      });
      updateTenant(data);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save the contact section.');
    } finally {
      setSaving(false);
    }
  };

  const markRead = async (id: number) => {
    const updated = await markHomepageEnquiryRead(id);
    setEnquiries(current => current.map(item => item.id === id ? updated : item));
  };

  const removeEnquiry = async (id: number) => {
    if (!window.confirm('Delete this enquiry permanently?')) return;
    await deleteHomepageEnquiry(id);
    setEnquiries(current => current.filter(item => item.id !== id));
  };

  const unreadCount = enquiries.filter(item => !item.is_read).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100">Homepage Contact</h1>
          <p className="mt-1 text-sm text-dark-400">Edit the homepage contact section and review messages submitted by visitors.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50">
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="grid overflow-hidden rounded-xl border border-dark-700 bg-dark-900 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative min-h-[300px] bg-dark-800 lg:min-h-[560px]">
          {imageUrl ? (
            <img src={imageUrl} alt={imageAlt || 'Homepage contact preview'} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-dark-400"><ImagePlus size={34} /><span className="text-sm">Choose the section image</span></div>
          )}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-lg bg-dark-950/85 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:bg-dark-950 disabled:opacity-50"><ImagePlus size={14} /> {uploading ? 'Uploading…' : imageUrl ? 'Replace image' : 'Choose image'}</button>
            {imageUrl && <button type="button" onClick={() => { setImageUrl(''); setSaved(false); }} className="rounded-lg bg-red-950/85 p-2 text-red-300" aria-label="Remove image"><Trash2 size={15} /></button>}
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) uploadImage(file); event.target.value = ''; }} />
        </div>

        <div className="space-y-5 p-5 lg:p-7">
          <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Heading</span><textarea value={heading} onChange={event => { setHeading(event.target.value); setSaved(false); }} maxLength={200} rows={2} className={`${inputClass} resize-none`} /></label>
          <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Image alt text</span><input value={imageAlt} onChange={event => { setImageAlt(event.target.value); setSaved(false); }} maxLength={200} className={inputClass} /></label>
          <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Consent text</span><textarea value={consentText} onChange={event => { setConsentText(event.target.value); setSaved(false); }} maxLength={300} rows={3} className={`${inputClass} resize-none`} /></label>
          <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Button label</span><input value={buttonLabel} onChange={event => { setButtonLabel(event.target.value); setSaved(false); }} maxLength={60} className={inputClass} /></label>
          <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Success message</span><textarea value={successMessage} onChange={event => { setSuccessMessage(event.target.value); setSaved(false); }} maxLength={300} rows={2} className={`${inputClass} resize-none`} /></label>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-dark-700 bg-dark-800 p-4">
            <div><p className="text-sm font-medium text-cream-200">Show on homepage</p><p className="mt-0.5 text-xs text-dark-500">The section remains hidden until an image is selected.</p></div>
            <button type="button" onClick={() => { setEnabled(current => !current); setSaved(false); }} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${enabled ? 'bg-gold-600 text-white' : 'bg-dark-700 text-dark-300'}`}>{enabled ? <Eye size={14} /> : <EyeOff size={14} />} {enabled ? 'Visible' : 'Hidden'}</button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Mail size={20} className="text-gold-400" />
            <div><h2 className="text-lg font-semibold text-cream-100">Visitor enquiries</h2><p className="text-sm text-dark-400">{enquiries.length} total · {unreadCount} unread</p></div>
          </div>
          <button type="button" onClick={loadEnquiries} className="btn-secondary flex items-center gap-2 text-sm"><RefreshCw size={14} /> Refresh</button>
        </div>

        {loadingEnquiries ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" /></div>
        ) : enquiries.length === 0 ? (
          <div className="rounded-xl border border-dark-700 bg-dark-900 py-16 text-center text-sm text-dark-400">No enquiries yet. New homepage messages will appear here.</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {enquiries.map(enquiry => (
              <article key={enquiry.id} className={`rounded-xl border p-5 ${enquiry.is_read ? 'border-dark-700 bg-dark-900' : 'border-gold-700/60 bg-gold-950/10'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="font-semibold text-cream-100">{enquiry.subject}</h3><p className="mt-1 text-sm text-dark-300">{enquiry.name} · <a href={`mailto:${enquiry.email}`} className="text-gold-400 hover:underline">{enquiry.email}</a></p></div>
                  {!enquiry.is_read && <span className="rounded-full bg-gold-600/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-400">New</span>}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-dark-200">{enquiry.message}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-dark-700 pt-4">
                  <time className="text-xs text-dark-500">{enquiry.created_at ? new Date(enquiry.created_at).toLocaleString() : 'Date unavailable'}</time>
                  <div className="flex gap-2">{!enquiry.is_read && <button type="button" onClick={() => markRead(enquiry.id)} className="rounded border border-dark-600 px-3 py-1.5 text-xs text-cream-200 hover:bg-dark-800">Mark read</button>}<button type="button" onClick={() => removeEnquiry(enquiry.id)} className="rounded border border-red-900/70 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30">Delete</button></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
