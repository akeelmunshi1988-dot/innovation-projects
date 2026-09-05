import { useRef, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import {
  ABOUT_PRINCIPLE_ICONS,
  mergeAboutPage,
  type AboutCredentialItem,
  type AboutPageContent,
  type AboutPrincipleItem,
  type AboutProcessStep,
} from '../data/aboutPageContent';

const fieldClass =
  'w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-cream-100 placeholder-dark-500 focus:border-gold-600/60 focus:outline-none';
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-cream-300';

// Defined at module scope (not inside AboutPage) so their identity stays stable across
// re-renders — nesting these inside the component made React remount the entire subtree
// (losing focus/input state) on every keystroke, since a new function reference means a
// new component type to React on each render.
const SectionToggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      enabled ? 'bg-gold-600 text-white' : 'bg-dark-700 text-dark-300'
    }`}
  >
    {enabled ? <Eye size={13} /> : <EyeOff size={13} />} {enabled ? 'Visible' : 'Hidden'}
  </button>
);

const Card = ({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <section className="space-y-4 rounded-xl border border-dark-700 bg-dark-900 p-5">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-cream-100">{title}</h2>
      <SectionToggle enabled={enabled} onToggle={onToggle} />
    </div>
    {children}
  </section>
);

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block space-y-1.5">
    <span className={labelClass}>{label}</span>
    {children}
    {hint && <span className="block text-xs text-dark-500">{hint}</span>}
  </label>
);

export default function AboutPage() {
  const { user, updateTenant } = useAuth();
  const tenant = user!.tenant;

  const [content, setContent] = useState<AboutPageContent>(() => mergeAboutPage(tenant.about_page));
  const [storyBody, setStoryBody] = useState(tenant.about_us_content_html ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const heroFileRef = useRef<HTMLInputElement>(null);
  const founderFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const touched = () => setSaved(false);

  function patchSection<K extends keyof AboutPageContent>(key: K, patch: Partial<AboutPageContent[K]>) {
    setContent((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
    touched();
  }

  function setList<K extends 'credentials' | 'process' | 'principles', F extends keyof AboutPageContent[K]>(
    section: K,
    field: F,
    next: AboutPageContent[K][F],
  ) {
    setContent((current) => ({ ...current, [section]: { ...current[section], [field]: next } }));
    touched();
  }

  const moveInList = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const uploadImage = async (slot: string, file: File, onUploaded?: (url: string) => void) => {
    setUploading(slot);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axios.post<{ url: string }>('/api/tenant/about-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (onUploaded) onUploaded(data.url);
      else patchSection(slot as 'hero' | 'founder', { image_url: data.url });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Image upload failed.');
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { data } = await axios.patch('/api/tenant/settings', {
        about_page: content,
        about_us_content_html: storyBody,
      });
      updateTenant(data);
      setContent(mergeAboutPage(data.about_page));
      setStoryBody(data.about_us_content_html ?? '');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save the About page.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-[94vw] max-w-none space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100">About Page</h1>
          <p className="mt-1 text-sm text-dark-400">
            Every section of the public <span className="text-cream-300">/about</span> page. Use <code className="text-cream-300">{'{business}'}</code> anywhere to insert your business name.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
        >
          {saved ? <Check size={16} /> : <Save size={16} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Hero */}
      <Card title="Hero" enabled={content.hero.enabled} onToggle={() => patchSection('hero', { enabled: !content.hero.enabled })}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow">
            <input value={content.hero.eyebrow} onChange={(e) => patchSection('hero', { eyebrow: e.target.value })} maxLength={160} className={fieldClass} />
          </Field>
          <Field label="Call-to-action label" hint="Links to the custom rug request page.">
            <input value={content.hero.cta_label} onChange={(e) => patchSection('hero', { cta_label: e.target.value })} maxLength={80} className={fieldClass} />
          </Field>
        </div>
        <Field label="Heading" hint="Line breaks are preserved.">
          <textarea value={content.hero.heading} onChange={(e) => patchSection('hero', { heading: e.target.value })} maxLength={400} rows={2} className={`${fieldClass} resize-y`} />
        </Field>
        <Field label="Intro paragraph">
          <textarea value={content.hero.body} onChange={(e) => patchSection('hero', { body: e.target.value })} maxLength={2000} rows={3} className={`${fieldClass} resize-y`} />
        </Field>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Background image">
            <div className="flex items-center gap-3">
              {content.hero.image_url && <img src={content.hero.image_url} alt="" className="h-14 w-24 rounded object-cover" />}
              <button type="button" disabled={uploading === 'hero'} onClick={() => heroFileRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-xs text-cream-200 hover:bg-dark-700 disabled:opacity-50">
                <ImagePlus size={14} /> {uploading === 'hero' ? 'Uploading…' : content.hero.image_url ? 'Replace' : 'Upload'}
              </button>
              {content.hero.image_url && (
                <button type="button" onClick={() => patchSection('hero', { image_url: '' })} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              )}
            </div>
          </Field>
          <input ref={heroFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage('hero', f); e.target.value = ''; }} />
        </div>
        <Field label="Background image alt text">
          <input value={content.hero.image_alt} onChange={(e) => patchSection('hero', { image_alt: e.target.value })} maxLength={200} className={fieldClass} />
        </Field>
      </Card>

      {/* Credentials strip */}
      <Card title="Credentials strip" enabled={content.credentials.enabled} onToggle={() => patchSection('credentials', { enabled: !content.credentials.enabled })}>
        <div className="space-y-3">
          {content.credentials.items.map((item: AboutCredentialItem, index) => (
            <div key={index} className="rounded-lg border border-dark-700 bg-dark-800 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-dark-400">Item {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setList('credentials', 'items', moveInList(content.credentials.items, index, -1))} className="rounded p-1 text-dark-400 hover:text-cream-200"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => setList('credentials', 'items', moveInList(content.credentials.items, index, 1))} className="rounded p-1 text-dark-400 hover:text-cream-200"><ArrowDown size={13} /></button>
                  <button type="button" onClick={() => setList('credentials', 'items', content.credentials.items.filter((_, i) => i !== index))} className="rounded p-1 text-red-400 hover:text-red-300"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={item.title} placeholder="Title" onChange={(e) => setList('credentials', 'items', content.credentials.items.map((it, i) => i === index ? { ...it, title: e.target.value } : it))} maxLength={160} className={fieldClass} />
                <input value={item.subtitle} placeholder="Subtitle" onChange={(e) => setList('credentials', 'items', content.credentials.items.map((it, i) => i === index ? { ...it, subtitle: e.target.value } : it))} maxLength={300} className={fieldClass} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setList('credentials', 'items', [...content.credentials.items, { title: '', subtitle: '' }])} className="flex items-center gap-2 rounded-lg border border-dashed border-dark-600 px-3 py-2 text-xs text-dark-300 hover:text-cream-200"><Plus size={13} /> Add item</button>
        </div>
      </Card>

      {/* Story */}
      <Card title="Story" enabled={content.story.enabled} onToggle={() => patchSection('story', { enabled: !content.story.enabled })}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow"><input value={content.story.eyebrow} onChange={(e) => patchSection('story', { eyebrow: e.target.value })} maxLength={160} className={fieldClass} /></Field>
          <Field label="Heading" hint="Line breaks preserved."><textarea value={content.story.heading} onChange={(e) => patchSection('story', { heading: e.target.value })} maxLength={400} rows={2} className={`${fieldClass} resize-y`} /></Field>
        </div>
        <Field label="Body" hint="The main editorial paragraphs.">
          <RichTextEditor value={storyBody} onChange={(html) => { setStoryBody(html); touched(); }} placeholder="Tell customers about your workshop, heritage, materials, craftspeople, and approach to rug making." />
        </Field>
        <Field label="Pull quote">
          <textarea value={content.story.quote} onChange={(e) => patchSection('story', { quote: e.target.value })} maxLength={600} rows={2} className={`${fieldClass} resize-y`} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          {([
            ['primary', 'Primary image', content.story.primary_image_url, content.story.primary_image_alt],
            ['secondary', 'Overlay image', content.story.secondary_image_url, content.story.secondary_image_alt],
          ] as const).map(([key, label, imageUrl, imageAlt]) => {
            const slot = `story-${key}`;
            const urlField = `${key}_image_url` as 'primary_image_url' | 'secondary_image_url';
            const altField = `${key}_image_alt` as 'primary_image_alt' | 'secondary_image_alt';
            return (
              <div key={key} className="space-y-3 rounded-lg border border-dark-700 bg-dark-800 p-3">
                <p className={labelClass}>{label}</p>
                <div className="aspect-[4/3] overflow-hidden rounded bg-dark-900">
                  {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-dark-500">Workshop photo fallback</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dark-600 px-3 py-2 text-xs text-cream-200 hover:bg-dark-700">
                    <ImagePlus size={14} /> {uploading === slot ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(slot, file, (url) => patchSection('story', { [urlField]: url })); e.target.value = ''; }} />
                  </label>
                  {imageUrl && <button type="button" onClick={() => patchSection('story', { [urlField]: '' })} className="text-xs text-red-400 hover:text-red-300">Remove</button>}
                </div>
                <input value={imageAlt} onChange={(e) => patchSection('story', { [altField]: e.target.value })} maxLength={200} placeholder="Image alt text" className={fieldClass} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Process */}
      <Card title="Process" enabled={content.process.enabled} onToggle={() => patchSection('process', { enabled: !content.process.enabled })}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow"><input value={content.process.eyebrow} onChange={(e) => patchSection('process', { eyebrow: e.target.value })} maxLength={160} className={fieldClass} /></Field>
          <Field label="Heading" hint="Line breaks preserved."><textarea value={content.process.heading} onChange={(e) => patchSection('process', { heading: e.target.value })} maxLength={400} rows={2} className={`${fieldClass} resize-y`} /></Field>
        </div>
        <Field label="Intro paragraph"><textarea value={content.process.intro} onChange={(e) => patchSection('process', { intro: e.target.value })} maxLength={1000} rows={2} className={`${fieldClass} resize-y`} /></Field>
        <div className="space-y-3">
          {content.process.steps.map((step: AboutProcessStep, index) => (
            <div key={index} className="rounded-lg border border-dark-700 bg-dark-800 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-dark-400">Step {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setList('process', 'steps', moveInList(content.process.steps, index, -1))} className="rounded p-1 text-dark-400 hover:text-cream-200"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => setList('process', 'steps', moveInList(content.process.steps, index, 1))} className="rounded p-1 text-dark-400 hover:text-cream-200"><ArrowDown size={13} /></button>
                  <button type="button" onClick={() => setList('process', 'steps', content.process.steps.filter((_, i) => i !== index))} className="rounded p-1 text-red-400 hover:text-red-300"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[5rem_1fr]">
                <input value={step.number} placeholder="01" onChange={(e) => setList('process', 'steps', content.process.steps.map((it, i) => i === index ? { ...it, number: e.target.value } : it))} maxLength={8} className={fieldClass} />
                <input value={step.title} placeholder="Step title" onChange={(e) => setList('process', 'steps', content.process.steps.map((it, i) => i === index ? { ...it, title: e.target.value } : it))} maxLength={160} className={fieldClass} />
              </div>
              <textarea value={step.text} placeholder="Step description" onChange={(e) => setList('process', 'steps', content.process.steps.map((it, i) => i === index ? { ...it, text: e.target.value } : it))} maxLength={1000} rows={2} className={`${fieldClass} mt-2 resize-y`} />
              <div className="mt-3 grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-center">
                <div className="aspect-[4/3] overflow-hidden rounded bg-dark-900">
                  {step.image_url ? <img src={step.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-dark-500">Workshop photo fallback</div>}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dark-600 px-3 py-2 text-xs text-cream-200 hover:bg-dark-700">
                      <ImagePlus size={14} /> {uploading === `process-${index}` ? 'Uploading…' : step.image_url ? 'Replace image' : 'Upload image'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(`process-${index}`, file, (url) => setList('process', 'steps', content.process.steps.map((it, i) => i === index ? { ...it, image_url: url } : it))); e.target.value = ''; }} />
                    </label>
                    {step.image_url && <button type="button" onClick={() => setList('process', 'steps', content.process.steps.map((it, i) => i === index ? { ...it, image_url: '' } : it))} className="text-xs text-red-400 hover:text-red-300">Remove</button>}
                  </div>
                  <input value={step.image_alt || ''} onChange={(e) => setList('process', 'steps', content.process.steps.map((it, i) => i === index ? { ...it, image_alt: e.target.value } : it))} maxLength={200} placeholder="Image alt text" className={fieldClass} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setList('process', 'steps', [...content.process.steps, { number: '', title: '', text: '', image_url: '', image_alt: '' }])} className="flex items-center gap-2 rounded-lg border border-dashed border-dark-600 px-3 py-2 text-xs text-dark-300 hover:text-cream-200"><Plus size={13} /> Add step</button>
        </div>
      </Card>

      {/* Principles */}
      <Card title="Principles" enabled={content.principles.enabled} onToggle={() => patchSection('principles', { enabled: !content.principles.enabled })}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow"><input value={content.principles.eyebrow} onChange={(e) => patchSection('principles', { eyebrow: e.target.value })} maxLength={160} className={fieldClass} /></Field>
          <Field label="Heading"><input value={content.principles.heading} onChange={(e) => patchSection('principles', { heading: e.target.value })} maxLength={400} className={fieldClass} /></Field>
        </div>
        <Field label="Intro paragraph"><textarea value={content.principles.intro} onChange={(e) => patchSection('principles', { intro: e.target.value })} maxLength={1000} rows={2} className={`${fieldClass} resize-y`} /></Field>
        <div className="space-y-3">
          {content.principles.items.map((item: AboutPrincipleItem, index) => (
            <div key={index} className="rounded-lg border border-dark-700 bg-dark-800 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-dark-400">Principle {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setList('principles', 'items', moveInList(content.principles.items, index, -1))} className="rounded p-1 text-dark-400 hover:text-cream-200"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => setList('principles', 'items', moveInList(content.principles.items, index, 1))} className="rounded p-1 text-dark-400 hover:text-cream-200"><ArrowDown size={13} /></button>
                  <button type="button" onClick={() => setList('principles', 'items', content.principles.items.filter((_, i) => i !== index))} className="rounded p-1 text-red-400 hover:text-red-300"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                <select value={item.icon} onChange={(e) => setList('principles', 'items', content.principles.items.map((it, i) => i === index ? { ...it, icon: e.target.value } : it))} className={fieldClass}>
                  {ABOUT_PRINCIPLE_ICONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input value={item.title} placeholder="Title" onChange={(e) => setList('principles', 'items', content.principles.items.map((it, i) => i === index ? { ...it, title: e.target.value } : it))} maxLength={160} className={fieldClass} />
              </div>
              <textarea value={item.text} placeholder="Description" onChange={(e) => setList('principles', 'items', content.principles.items.map((it, i) => i === index ? { ...it, text: e.target.value } : it))} maxLength={1000} rows={2} className={`${fieldClass} mt-2 resize-y`} />
            </div>
          ))}
          <button type="button" onClick={() => setList('principles', 'items', [...content.principles.items, { icon: 'hand', title: '', text: '' }])} className="flex items-center gap-2 rounded-lg border border-dashed border-dark-600 px-3 py-2 text-xs text-dark-300 hover:text-cream-200"><Plus size={13} /> Add principle</button>
        </div>
      </Card>

      {/* Founder */}
      <Card title="Founder note" enabled={content.founder.enabled} onToggle={() => patchSection('founder', { enabled: !content.founder.enabled })}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow"><input value={content.founder.eyebrow} onChange={(e) => patchSection('founder', { eyebrow: e.target.value })} maxLength={160} className={fieldClass} /></Field>
          <Field label="Heading"><input value={content.founder.heading} onChange={(e) => patchSection('founder', { heading: e.target.value })} maxLength={400} className={fieldClass} /></Field>
        </div>
        <Field label="Body" hint="Separate paragraphs with a blank line.">
          <textarea value={content.founder.body} onChange={(e) => patchSection('founder', { body: e.target.value })} maxLength={3000} rows={5} className={`${fieldClass} resize-y`} />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Name"><input value={content.founder.name} onChange={(e) => patchSection('founder', { name: e.target.value })} maxLength={160} className={fieldClass} /></Field>
          <Field label="Role"><input value={content.founder.role} onChange={(e) => patchSection('founder', { role: e.target.value })} maxLength={160} className={fieldClass} /></Field>
          <Field label="Image caption"><input value={content.founder.caption} onChange={(e) => patchSection('founder', { caption: e.target.value })} maxLength={240} className={fieldClass} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Image" hint="Falls back to a workshop photo when empty.">
            <div className="flex items-center gap-3">
              {content.founder.image_url && <img src={content.founder.image_url} alt="" className="h-14 w-24 rounded object-cover" />}
              <button type="button" disabled={uploading === 'founder'} onClick={() => founderFileRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-xs text-cream-200 hover:bg-dark-700 disabled:opacity-50">
                <ImagePlus size={14} /> {uploading === 'founder' ? 'Uploading…' : content.founder.image_url ? 'Replace' : 'Upload'}
              </button>
              {content.founder.image_url && (
                <button type="button" onClick={() => patchSection('founder', { image_url: '' })} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              )}
            </div>
          </Field>
          <input ref={founderFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage('founder', f); e.target.value = ''; }} />
        </div>
        <Field label="Image alt text"><input value={content.founder.image_alt} onChange={(e) => patchSection('founder', { image_alt: e.target.value })} maxLength={200} className={fieldClass} /></Field>
      </Card>

      {/* CTA */}
      <Card title="Closing call-to-action" enabled={content.cta.enabled} onToggle={() => patchSection('cta', { enabled: !content.cta.enabled })}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow"><input value={content.cta.eyebrow} onChange={(e) => patchSection('cta', { eyebrow: e.target.value })} maxLength={240} className={fieldClass} /></Field>
          <Field label="Heading"><input value={content.cta.heading} onChange={(e) => patchSection('cta', { heading: e.target.value })} maxLength={400} className={fieldClass} /></Field>
        </div>
        <Field label="Body"><textarea value={content.cta.body} onChange={(e) => patchSection('cta', { body: e.target.value })} maxLength={1000} rows={3} className={`${fieldClass} resize-y`} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Primary button label"><input value={content.cta.primary_label} onChange={(e) => patchSection('cta', { primary_label: e.target.value })} maxLength={80} className={fieldClass} /></Field>
          <Field label="Secondary button label"><input value={content.cta.secondary_label} onChange={(e) => patchSection('cta', { secondary_label: e.target.value })} maxLength={80} className={fieldClass} /></Field>
        </div>
      </Card>
    </div>
  );
}
