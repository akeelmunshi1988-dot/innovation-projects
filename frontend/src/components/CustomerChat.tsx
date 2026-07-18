import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, AlertTriangle, ChevronDown, HelpCircle } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED = [
  "What's the softest rug for a bedroom?",
  "How do I choose the right rug size for my living room?",
  "What's the difference between wool and silk rugs?",
  "Which rug is best for high-traffic areas?",
  "How long does a custom rug take to make?",
  "Can I get a rug in a custom size?",
];

// Split the last question sentence from the rest of the response body
function splitQuestion(content: string): { body: string; question: string | null } {
  const trimmed = content.trim();
  // Split into paragraphs, then find last paragraph/line ending with ?
  const paragraphs = trimmed.split(/\n\n+/);
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const para = paragraphs[i].trim();
    if (para.endsWith('?')) {
      const body = paragraphs.slice(0, i).join('\n\n').trim();
      // Strip markdown bold/em wrappers from question for cleaner display
      const question = para.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      return { body, question };
    }
    // Also check last sentence within the paragraph
    const sentences = para.split(/(?<=[.!?])\s+/);
    const lastSentence = sentences[sentences.length - 1].trim();
    if (lastSentence.endsWith('?') && sentences.length > 1) {
      const bodyPara = sentences.slice(0, -1).join(' ').trim();
      const bodyAll = [...paragraphs.slice(0, i), bodyPara].join('\n\n').trim();
      const question = lastSentence.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      return { body: bodyAll, question };
    }
  }
  return { body: trimmed, question: null };
}

// Markdown renderer with dark-theme styling for assistant bubbles
function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-cream-100">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-dark-300">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="mt-1.5 mb-2 space-y-0.5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-1.5 mb-2 space-y-0.5 list-decimal list-inside last:mb-0">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-1.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-500 flex-shrink-0" />
            <span>{children}</span>
          </li>
        ),
        code: ({ children }) => (
          <code className="bg-dark-700 text-gold-300 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-cream-100 mt-2 mb-1 text-sm">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="font-medium text-cream-200 mt-1.5 mb-0.5 text-sm">{children}</h4>
        ),
        hr: () => <hr className="border-dark-600 my-2" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function CustomerChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Listen for external trigger from the home page AI section
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message;
      if (msg) {
        setOpen(true);
        setPendingAsk(msg);
      }
    };
    window.addEventListener('loomcraftrugs:ask', handler);
    return () => window.removeEventListener('loomcraftrugs:ask', handler);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post('/api/customer/chat', {
        messages: next,
        session_id: sessionId,
      });
      setSessionId(data.session_id);
      setMessages([...next, { role: 'assistant', content: data.response }]);
      if (!open) setUnread((n) => n + 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [messages, loading, sessionId, open]);

  // Fire pending ask once chat is open and sendMessage is stable
  useEffect(() => {
    if (pendingAsk && open && !loading) {
      sendMessage(pendingAsk);
      setPendingAsk(null);
    }
  }, [pendingAsk, open, loading, sendMessage]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gold-600 hover:bg-gold-500 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
      >
        {open ? <ChevronDown size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[540px] max-h-[calc(100vh-120px)] bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700 bg-dark-900 flex-shrink-0">
            <div className="w-8 h-8 bg-gold-600/20 border border-gold-600/30 rounded-full flex items-center justify-center">
              <Sparkles size={15} className="text-gold-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-cream-100 font-semibold text-sm">Rug Consultant</p>
              <p className="text-dark-400 text-xs">Powered by Claude AI · Always available</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-dark-500 hover:text-cream-300 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !loading && (
              <div className="space-y-4">
                <div className="bg-dark-800 rounded-xl rounded-bl-sm px-3 py-2.5 text-sm text-dark-200 space-y-2">
                  <ChatMarkdown content={"Hi! I'm your **LoomCraftRugs AI** rug consultant.\n\nI can help you:\n- Choose the right rug for your space\n- Understand materials and weave types\n- Figure out the best size"} />
                  <div className="flex items-start gap-2 bg-gold-600/10 border border-gold-500/30 rounded-lg px-2.5 py-2">
                    <HelpCircle size={14} className="text-gold-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gold-300 text-sm leading-relaxed font-medium">What can I help you with today?</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left text-xs text-cream-300 bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-gold-600/40 rounded-lg px-3 py-2 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[82%] bg-gold-600 text-white rounded-xl rounded-br-sm px-3 py-2 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%] bg-dark-800 text-dark-200 rounded-xl rounded-bl-sm px-3 py-2.5 text-sm space-y-2">
                    {(() => {
                      const { body, question } = splitQuestion(msg.content);
                      return (
                        <>
                          {body && <ChatMarkdown content={body} />}
                          {question && (
                            <div className="flex items-start gap-2 bg-gold-600/10 border border-gold-500/30 rounded-lg px-2.5 py-2 mt-1">
                              <HelpCircle size={14} className="text-gold-400 flex-shrink-0 mt-0.5" />
                              <p className="text-gold-300 text-sm leading-relaxed font-medium">{question}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-dark-800 rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-dark-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-600/30 rounded-lg p-2 text-red-400 text-xs">
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick replies (shown after first message) */}
          {messages.length > 0 && !loading && (
            <div className="px-3 py-2 border-t border-dark-800 flex gap-1.5 overflow-x-auto flex-shrink-0">
              {SUGGESTED.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="flex-shrink-0 text-xs text-dark-400 hover:text-cream-200 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-full px-2.5 py-1 transition-all"
                >
                  {q.length > 28 ? q.slice(0, 28) + '…' : q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-dark-700 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything about rugs…"
                rows={1}
                disabled={loading}
                className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-3 py-2.5 text-cream-100 placeholder-dark-500 focus:outline-none focus:border-gold-600 text-sm resize-none transition-colors"
                style={{ minHeight: '40px', maxHeight: '100px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-gold-600 hover:bg-gold-500 disabled:bg-dark-700 disabled:text-dark-500 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-dark-600 text-xs mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </>
  );
}
