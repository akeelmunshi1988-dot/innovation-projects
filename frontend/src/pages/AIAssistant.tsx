import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import { sendChat } from '../services/api';
import type { ChatMessage as ChatMessageType } from '../types';

const SUGGESTED_QUESTIONS = [
  "What's the price for a 4x6m wool rug?",
  "Do we have silk in stock?",
  "What's our MOQ for custom orders?",
  "How long for a rush order?",
  "Show me the full rug catalog with prices",
  "What bulk discounts do we offer?",
  "Is Tibetan wool available and how much?",
  "What are our pricing rules?",
];

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessageType = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendChat(newMessages, sessionId);
      setSessionId(result.session_id);
      setMessages([...newMessages, { role: 'assistant', content: result.response }]);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      const detail = apiErr?.response?.data?.detail;
      if (detail?.includes('ANTHROPIC_API_KEY')) {
        setError('The ANTHROPIC_API_KEY is not configured in the backend. Please add it to the .env file.');
      } else {
        setError(detail ?? 'Failed to get a response from the AI. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gold-600/20 border border-gold-600/40 rounded-full flex items-center justify-center">
            <Sparkles size={18} className="text-gold-400" />
          </div>
          <div>
            <h1 className="text-cream-100 font-bold">AI Business Assistant</h1>
            <p className="text-dark-400 text-xs">
              Powered by Claude · Queries real business data · Never fabricates prices
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
            <div className="w-16 h-16 bg-gold-600/10 border border-gold-600/20 rounded-2xl flex items-center justify-center">
              <Sparkles size={32} className="text-gold-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-cream-100 text-xl font-bold">LoomCraft AI Assistant</h2>
              <p className="text-dark-400 text-sm max-w-md">
                Ask me anything about our rug catalog, pricing, material availability, or production timelines.
                I query our live business database — no guessing.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm text-cream-300 bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-gold-600/50 rounded-lg px-3 py-2.5 transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} />
        ))}

        {isLoading && <ChatMessage role="assistant" content="" isLoading />}

        {error && (
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-700/40 rounded-xl p-4">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-medium">Error</p>
              <p className="text-red-400/80 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions (shown when there are messages) */}
      {messages.length > 0 && !isLoading && (
        <div className="px-6 py-2 border-t border-dark-800 flex gap-2 overflow-x-auto flex-shrink-0">
          {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="flex-shrink-0 text-xs text-dark-300 hover:text-cream-200 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-full px-3 py-1.5 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-dark-700 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about pricing, materials, production timelines..."
              rows={1}
              className="input-field w-full resize-none pr-4 py-3 text-sm leading-relaxed"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary flex items-center gap-2 py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <p className="text-dark-600 text-xs mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;
