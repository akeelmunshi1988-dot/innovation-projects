import { useRef, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Check, Film, Image as ImageIcon, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Carrier = { label: string; image_url: string };
type Step = { title: string; description: string };

const DEFAULT_STEPS: Step[] = [
  { title: 'Final inspection', description: 'Your rug is checked, rolled and securely packed.' },
  { title: 'Carrier collection', description: 'The carrier collects the completed shipment.' },
  { title: 'Tracking sent', description: 'We share the tracking number and live tracking link with you.' },
];

const fieldClass = 'w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600/60 focus:outline-none';

export default function OrderTrackingPage() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;
  const [eyebrow, setEyebrow] = useState(tenant.order_tracking_eyebrow || 'Order visibility');
  const [heading, setHeading] = useState(tenant.order_tracking_heading || 'Follow your rug after dispatch.');
  const [body, setBody] = useState(tenant.order_tracking_body || 'Once your finished rug has passed final inspection and is collected for shipment, we send the tracking number and tracking link by email or WhatsApp. You can then follow the order until delivery.');
  const [shippingPolicyUrl, setShippingPolicyUrl] = useState(tenant.order_tracking_shipping_policy_url || '');
  const [carriers, setCarriers] = useState<Carrier[]>(tenant.order_tracking_carriers ?? []);
  const [steps, setSteps] = useState<Step[]>(tenant.order_tracking_steps?.length ? tenant.order_tracking_steps : DEFAULT_STEPS);
  const [mediaUrl, setMediaUrl] = useState(tenant.order_tracking_media_url || '');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(tenant.order_tracking_media_type || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [newCarrierLabel, setNewCarrierLabel] = useState('');
  const [newCarrierImage, setNewCarrierImage] = useState('');
  const [uploadingCarrierImage, setUploadingCarrierImage] = useState(false);
  const carrierImageInputRef = useRef<HTMLInputElement>(null);

  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const dirty = () => setSaved(false);

  const updateStep = (index: number, field: keyof Step, value: string) => {
    setSteps(current => current.map((step, i) => i === index ? { ...step, [field]: value } : step));
    dirty();
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps(current => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    dirty();
  };

  const handleCarrierImageUpload = async (file: File) => {
    setUploadingCarrierImage(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/tenant/order-tracking-carrier-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewCarrierImage(data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Logo upload failed.');
    } finally {
      setUploadingCarrierImage(false);
    }
  };

  const addCarrier = () => {
    if (!newCarrierLabel.trim() || !newCarrierImage) { setError('Add a carrier logo and name first.'); return; }
    setCarriers(prev => [...prev, { label: newCarrierLabel.trim(), image_url: newCarrierImage }]);
    setNewCarrierLabel('');
    setNewCarrierImage('');
    setError('');
    dirty();
  };

  const handleMediaUpload = async (file: File) => {
    setUploadingMedia(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post<{ url: string; media_type: 'image' | 'video' }>('/api/tenant/order-tracking-media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMediaUrl(data.url);
      setMediaType(data.media_type);
      dirty();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Media upload failed.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const save = async () => {
    if (steps.some(step => !step.title.trim())) {
      setError('Every step needs a title.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        order_tracking_eyebrow: eyebrow.trim(),
        order_tracking_heading: heading.trim(),
        order_tracking_body: body.trim(),
        order_tracking_shipping_policy_url: shippingPolicyUrl.trim(),
        order_tracking_carriers: carriers,
        order_tracking_steps: steps,
        order_tracking_media_url: mediaUrl || null,
        order_tracking_media_type: mediaUrl ? mediaType : null,
      });
      updateTenant(data);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save this section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100">Order Tracking Page</h1>
          <p className="mt-1 text-sm text-dark-400">Edit the text, carrier logos, and dispatch steps shown on the public Order Tracking page.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50">
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="grid gap-5 rounded-xl border border-dark-700 bg-dark-900 p-5 md:grid-cols-2">
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Small section label</span><input value={eyebrow} onChange={event => { setEyebrow(event.target.value); dirty(); }} maxLength={100} className={fieldClass} /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Heading</span><input value={heading} onChange={event => { setHeading(event.target.value); dirty(); }} maxLength={200} className={fieldClass} /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Body text</span><textarea value={body} onChange={event => { setBody(event.target.value); dirty(); }} maxLength={2000} rows={4} className={`${fieldClass} resize-none`} /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-cream-300">Shipping policy link (optional)</span><input value={shippingPolicyUrl} onChange={event => { setShippingPolicyUrl(event.target.value); dirty(); }} maxLength={500} placeholder="https://…" className={fieldClass} /><span className="block text-xs text-dark-500">Shown as "Read Our Shipping Policy" below the intro text.</span></label>
      </section>

      {/* Supporting media */}
      <section className="space-y-3 rounded-xl border border-dark-700 bg-dark-900 p-5">
        <div><h2 className="font-semibold text-cream-100">Supporting image or video</h2><p className="mt-1 text-xs text-dark-500">Optional. Shown alongside the intro text.</p></div>
        {mediaUrl ? (
          <div className="flex items-center gap-3">
            {mediaType === 'video' ? (
              <video src={mediaUrl} className="h-24 w-40 rounded-lg border border-dark-700 bg-dark-950 object-cover" muted controls={false} />
            ) : (
              <img src={mediaUrl} alt="Order tracking media preview" className="h-24 w-40 rounded-lg border border-dark-700 bg-dark-950 object-cover" />
            )}
            <div className="flex items-center gap-2 text-xs text-dark-400">
              {mediaType === 'video' ? <Film size={14} /> : <ImageIcon size={14} />} {mediaType === 'video' ? 'Video' : 'Image'}
            </div>
            <button type="button" onClick={() => { setMediaUrl(''); setMediaType(null); dirty(); }} className="rounded border border-red-900/60 p-2 text-red-400"><X size={14} /></button>
          </div>
        ) : (
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0])}
          />
        )}
        {!mediaUrl && (
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            disabled={uploadingMedia}
            className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-cream-200 hover:bg-dark-700 disabled:opacity-50"
          >
            <Upload size={14} /> {uploadingMedia ? 'Uploading…' : 'Upload image or video (max 50MB)'}
          </button>
        )}
      </section>

      {/* Carrier logos */}
      <section className="space-y-3 rounded-xl border border-dark-700 bg-dark-900 p-5">
        <div><h2 className="font-semibold text-cream-100">Carrier logos</h2><p className="mt-1 text-xs text-dark-500">Shown above the dispatch steps (e.g. FedEx, DHL).</p></div>

        <div className="flex flex-wrap gap-3">
          {carriers.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 py-1.5 pl-2 pr-2.5">
              <img src={c.image_url} alt={c.label} className="h-6 w-auto max-w-[72px] rounded bg-dark-900 object-contain" />
              <span className="text-xs text-cream-200">{c.label}</span>
              <button type="button" onClick={() => { setCarriers(prev => prev.filter((_, idx) => idx !== i)); dirty(); }} className="text-dark-500 hover:text-red-400 transition-colors">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {newCarrierImage ? (
            <img src={newCarrierImage} alt="Carrier logo preview" className="h-9 w-auto max-w-[90px] rounded border border-dark-700 bg-dark-800 object-contain" />
          ) : (
            <input
              ref={carrierImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCarrierImageUpload(e.target.files[0])}
            />
          )}
          <button
            type="button"
            onClick={() => carrierImageInputRef.current?.click()}
            disabled={uploadingCarrierImage || !!newCarrierImage}
            className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-xs text-cream-200 hover:bg-dark-700 disabled:opacity-50"
          >
            <Upload size={12} /> {uploadingCarrierImage ? 'Uploading…' : 'Upload logo'}
          </button>
          <input value={newCarrierLabel} onChange={event => setNewCarrierLabel(event.target.value)} placeholder="Carrier name (e.g. FedEx)" maxLength={50} className={`${fieldClass} max-w-[200px]`} />
          <button type="button" onClick={addCarrier} disabled={carriers.length >= 6} className="flex items-center gap-1.5 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-xs text-cream-200 hover:bg-dark-700 disabled:opacity-40"><Plus size={13} /> Add</button>
        </div>
      </section>

      {/* Dispatch steps */}
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="font-semibold text-cream-100">Dispatch steps</h2><p className="mt-1 text-xs text-dark-500">Shown as a numbered list; up to eight steps are supported.</p></div>
        <button type="button" disabled={steps.length >= 8} onClick={() => { setSteps(current => [...current, { title: '', description: '' }]); dirty(); }} className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-cream-200 hover:bg-dark-700 disabled:opacity-40"><Plus size={15} /> Add step</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => (
          <article key={index} className="space-y-4 rounded-xl border border-dark-700 bg-dark-900 p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-dark-400">Step {index + 1}</span><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => moveStep(index, -1)} className="rounded border border-dark-700 p-2 text-dark-300 disabled:opacity-30"><ArrowUp size={14} /></button><button type="button" disabled={index === steps.length - 1} onClick={() => moveStep(index, 1)} className="rounded border border-dark-700 p-2 text-dark-300 disabled:opacity-30"><ArrowDown size={14} /></button><button type="button" onClick={() => { setSteps(current => current.filter((_, i) => i !== index)); dirty(); }} className="rounded border border-red-900/60 p-2 text-red-400"><Trash2 size={14} /></button></div></div>
            <label className="space-y-1.5"><span className="text-xs text-cream-300">Title</span><input value={step.title} onChange={event => updateStep(index, 'title', event.target.value)} maxLength={100} className={fieldClass} /></label>
            <label className="space-y-1.5"><span className="text-xs text-cream-300">Description</span><textarea value={step.description} onChange={event => updateStep(index, 'description', event.target.value)} maxLength={300} rows={2} className={`${fieldClass} resize-none`} /></label>
          </article>
        ))}
      </div>
    </div>
  );
}
