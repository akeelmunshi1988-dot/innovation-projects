import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import DOMPurify from 'dompurify';
import {
  Bold, Italic, List, ListOrdered, Link as LinkIcon,
  Heading2, Heading3, Undo, Redo, Quote, Code2, X,
} from 'lucide-react';
import { PROSE_ALLOWED_TAGS, PROSE_ALLOWED_ATTR } from '../utils/richTextSanitize';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [htmlPasteOpen, setHtmlPasteOpen] = useState(false);
  const [htmlPasteValue, setHtmlPasteValue] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose-editor min-h-[160px] px-3 py-2.5 text-sm text-cream-100 focus:outline-none',
        'data-placeholder': placeholder ?? '',
      },
    },
  });

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `p-1.5 rounded-lg transition-colors ${active ? 'bg-gold-600 text-white' : 'text-dark-300 hover:text-cream-200 hover:bg-dark-700'}`;

  const handleInsertHtml = () => {
    const clean = DOMPurify.sanitize(htmlPasteValue, {
      ALLOWED_TAGS: PROSE_ALLOWED_TAGS,
      ALLOWED_ATTR: PROSE_ALLOWED_ATTR,
    });
    // insertContent additionally filters through the editor's own schema (StarterKit + Link),
    // so anything outside what this editor understands is dropped here too, not just above.
    editor.chain().focus().insertContent(clean).run();
    setHtmlPasteValue('');
    setHtmlPasteOpen(false);
  };

  return (
    <div className="border border-dark-600 rounded-lg overflow-hidden bg-dark-800">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-dark-700 flex-wrap">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive('bold'))} title="Bold">
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnCls(editor.isActive('italic'))} title="Italic">
          <Italic size={14} />
        </button>
        <span className="w-px h-4 bg-dark-600 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnCls(editor.isActive('heading', { level: 2 }))} title="Heading">
          <Heading2 size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnCls(editor.isActive('heading', { level: 3 }))} title="Subheading">
          <Heading3 size={14} />
        </button>
        <span className="w-px h-4 bg-dark-600 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnCls(editor.isActive('bulletList'))} title="Bullet list">
          <List size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnCls(editor.isActive('orderedList'))} title="Numbered list">
          <ListOrdered size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnCls(editor.isActive('blockquote'))} title="Quote">
          <Quote size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Link URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={btnCls(editor.isActive('link'))}
          title="Add link"
        >
          <LinkIcon size={14} />
        </button>
        <span className="w-px h-4 bg-dark-600 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btnCls(false)} title="Undo">
          <Undo size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btnCls(false)} title="Redo">
          <Redo size={14} />
        </button>
        <span className="w-px h-4 bg-dark-600 mx-1" />
        <button
          type="button"
          onClick={() => setHtmlPasteOpen((v) => !v)}
          className={btnCls(htmlPasteOpen)}
          title="Paste HTML"
        >
          <Code2 size={14} />
        </button>
      </div>

      {htmlPasteOpen && (
        <div className="px-3 py-2.5 border-b border-dark-700 bg-dark-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-dark-300 text-xs font-medium">Paste HTML source — inserted at the cursor, sanitized on insert.</p>
            <button type="button" onClick={() => { setHtmlPasteOpen(false); setHtmlPasteValue(''); }} className="text-dark-400 hover:text-cream-200 transition-colors">
              <X size={13} />
            </button>
          </div>
          <textarea
            value={htmlPasteValue}
            onChange={(e) => setHtmlPasteValue(e.target.value)}
            placeholder="<p>Paste raw HTML here…</p>"
            rows={5}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-cream-100 text-xs font-mono placeholder-dark-500 focus:outline-none focus:border-gold-600/60 resize-y"
          />
          <p className="text-dark-500 text-xs">
            Only these tags survive: p, h2, h3, strong/b, em/i, ul, ol, li, blockquote, a, br. Scripts, styles, and anything else are stripped.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleInsertHtml}
              disabled={!htmlPasteValue.trim()}
              className="bg-gold-600 hover:bg-gold-500 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Insert HTML
            </button>
            <button
              type="button"
              onClick={() => { setHtmlPasteOpen(false); setHtmlPasteValue(''); }}
              className="text-dark-400 hover:text-cream-200 text-xs px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
