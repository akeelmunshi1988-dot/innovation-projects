import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold, Italic, List, ListOrdered, Link as LinkIcon,
  Heading2, Heading3, Undo, Redo, Quote,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
