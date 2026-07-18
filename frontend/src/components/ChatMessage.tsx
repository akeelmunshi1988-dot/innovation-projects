import React from 'react';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

// Very lightweight markdown-to-JSX renderer (no external deps needed)
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading 3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-gold-400 font-semibold text-sm mt-3 mb-1">
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-gold-300 font-bold text-base mt-4 mb-2">
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-gold-200 font-bold text-lg mt-4 mb-2">
          {line.slice(2)}
        </h1>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-2 text-cream-200">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm">
              {inlineFormat(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-1 my-2 text-cream-200">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm">
              {inlineFormat(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (line.startsWith('---') || line.startsWith('***')) {
      elements.push(<hr key={i} className="border-dark-600 my-3" />);
      i++;
      continue;
    }

    // Empty line → spacing
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm text-cream-200 leading-relaxed">
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function inlineFormat(text: string): React.ReactNode {
  // Handle **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-cream-100 font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-cream-200 italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-dark-700 text-gold-300 px-1.5 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isLoading }) => {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
          ${isAssistant
            ? 'bg-gold-600/20 border border-gold-600/40'
            : 'bg-rug-700/30 border border-rug-600/40'
          }
        `}
      >
        {isAssistant ? (
          <Bot size={16} className="text-gold-400" />
        ) : (
          <User size={16} className="text-rug-400" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`
          max-w-[80%] rounded-xl px-4 py-3
          ${isAssistant
            ? 'bg-dark-800 border border-dark-700 rounded-tl-none'
            : 'bg-rug-900/50 border border-rug-700/30 rounded-tr-none'
          }
        `}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 py-1">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-dark-400 text-xs">Thinking...</span>
          </div>
        ) : isAssistant ? (
          <div className="space-y-1">{renderMarkdown(content)}</div>
        ) : (
          <p className="text-sm text-cream-200 leading-relaxed">{content}</p>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
