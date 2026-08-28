import React, { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Send, Sparkles, AlertCircle, Check, X, MessageSquare, History, ArrowLeft, RefreshCw, PlayCircle } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import { sendChat, getPendingAiActions, confirmAiAction, rejectAiAction, getChatSessions, getChatHistory } from '../services/api';
import type { ChatMessage as ChatMessageType, PendingAiAction, AiChatSession } from '../types';
import { useAuth } from '../contexts/AuthContext';

const SUGGESTED_QUESTIONS = [
  "What's the price for a 4x6m wool rug?",
  "Do we have silk in stock?",
  "What's our MOQ for custom orders?",
  "How long for rush delivery?",
  "Show me the full rug catalog with prices",
  "What bulk discounts do we offer?",
  "Add a new material: Merino wool, cream, ₹1200/sqm",
  "Create a 15% off promo code called WELCOME15",
];

const AIAssistant: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingAiAction[]>([]);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [historyMessages, setHistoryMessages] = useState<ChatMessageType[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    getPendingAiActions().then(setPendingActions).catch(() => {});
  }, []);

  const mergePendingActions = (fresh: PendingAiAction[]) => {
    if (!fresh.length) return;
    setPendingActions((prev) => {
      const byId = new Map(prev.map((a) => [a.id, a]));
      for (const a of fresh) byId.set(a.id, a);
      return Array.from(byId.values());
    });
  };

  const resolveAction = async (id: number, confirm: boolean) => {
    setResolvingId(id);
    try {
      const updated = confirm ? await confirmAiAction(id) : await rejectAiAction(id);
      setPendingActions((prev) => prev.map((a) => (a.id === id ? updated : a)).filter((a) => a.status === 'pending'));
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(apiErr?.response?.data?.detail ?? 'Failed to update this action. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      setSessions(await getChatSessions());
    } finally {
      setSessionsLoading(false);
    }
  };

  const openTab = (tab: 'chat' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history') {
      setSelectedSessionId(null);
      loadSessions();
    }
  };

  const viewSession = async (id: string) => {
    setSelectedSessionId(id);
    setHistoryLoading(true);
    try {
      const rows = await getChatHistory(id);
      // API returns newest-first; the transcript should read chronologically
      const chronological = [...rows].reverse();
      setHistoryMessages(chronological.map((r) => ({ role: r.role, content: r.content })));
    } finally {
      setHistoryLoading(false);
    }
  };

  const continueSession = () => {
    if (!selectedSessionId) return;
    setMessages(historyMessages);
    setSessionId(selectedSessionId);
    setActiveTab('chat');
  };

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
      mergePendingActions(result.pending_actions ?? []);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      const detail = apiErr?.response?.data?.detail;
      if (detail?.includes('OPENAI_API_KEY')) {
        setError('The OPENAI_API_KEY is not configured in the backend. Please add it to the .env file.');
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

  if (user && user.tenant.ai_assistant_vendor_enabled === false) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold-600/20 border border-gold-600/40 rounded-full flex items-center justify-center">
              <Sparkles size={18} className="text-gold-400" />
            </div>
            <div>
              <h1 className="text-cream-100 font-bold">AI Business Assistant</h1>
              <p className="text-dark-400 text-xs">
                Queries real business data · Can propose catalog/material/promo changes — nothing goes live until you confirm it
              </p>
            </div>
          </div>
          <div className="flex border border-dark-600 rounded-lg overflow-hidden flex-shrink-0">
            <button
              onClick={() => openTab('chat')}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 transition-colors ${
                activeTab === 'chat' ? 'bg-gold-600 text-dark-950' : 'text-dark-300 hover:bg-dark-700'
              }`}
            >
              <MessageSquare size={13} /> Chat
            </button>
            <button
              onClick={() => openTab('history')}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 transition-colors border-l border-dark-600 ${
                activeTab === 'history' ? 'bg-gold-600 text-dark-950' : 'text-dark-300 hover:bg-dark-700'
              }`}
            >
              <History size={13} /> History
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="flex-1 overflow-y-auto p-6">
          {selectedSessionId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedSessionId(null)}
                  className="flex items-center gap-1.5 text-sm text-dark-300 hover:text-cream-200 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to conversations
                </button>
                <button onClick={continueSession} className="btn-primary flex items-center gap-2 text-xs px-3 py-1.5">
                  <PlayCircle size={13} /> Continue this conversation
                </button>
              </div>
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {historyMessages.map((msg, idx) => (
                    <ChatMessage key={idx} role={msg.role} content={msg.content} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-dark-400 text-xs font-medium uppercase tracking-wider">Past conversations</p>
                <button onClick={loadSessions} className="btn-secondary flex items-center gap-1.5 text-xs px-2.5 py-1.5">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              {sessionsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <History size={32} className="text-dark-600" />
                  <p className="text-dark-400 text-sm">No past conversations yet.</p>
                </div>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.session_id}
                    onClick={() => viewSession(s.session_id)}
                    className="w-full text-left bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-gold-600/50 rounded-lg px-4 py-3 transition-colors"
                  >
                    <p className="text-cream-200 text-sm truncate">{s.preview || '(no preview)'}</p>
                    <p className="text-dark-500 text-xs mt-1">
                      {s.message_count} message{s.message_count !== 1 ? 's' : ''} · {new Date(s.last_message_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
            <div className="w-16 h-16 bg-gold-600/10 border border-gold-600/20 rounded-2xl flex items-center justify-center">
              <Sparkles size={32} className="text-gold-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-cream-100 text-xl font-bold">{user?.tenant.name ?? 'Business'} AI Assistant</h2>
              <p className="text-dark-400 text-sm max-w-md">
                Ask me anything about our rug catalog, pricing, material availability, or production timelines —
                I query our live business database, no guessing. I can also draft changes to the catalog,
                materials, and promo codes; every draft waits for your confirmation before it takes effect.
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

      {/* Pending AI actions — proposed writes awaiting confirmation. Nothing
          the assistant proposes takes effect until confirmed here. */}
      {pendingActions.length > 0 && (
        <div className="px-6 py-3 border-t border-dark-700 space-y-2 flex-shrink-0 max-h-56 overflow-y-auto">
          <p className="text-dark-400 text-xs font-medium uppercase tracking-wider">
            Awaiting your confirmation ({pendingActions.length})
          </p>
          {pendingActions.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between gap-3 bg-dark-800 border border-gold-600/30 rounded-lg px-3 py-2.5"
            >
              <p className="text-cream-200 text-sm">{action.summary}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => resolveAction(action.id, true)}
                  disabled={resolvingId === action.id}
                  className="flex items-center gap-1 text-xs font-medium text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 border border-green-700/40 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50"
                >
                  <Check size={13} /> Confirm
                </button>
                <button
                  onClick={() => resolveAction(action.id, false)}
                  disabled={resolvingId === action.id}
                  className="flex items-center gap-1 text-xs font-medium text-dark-300 hover:text-red-300 bg-dark-700 hover:bg-red-900/20 border border-dark-600 hover:border-red-700/40 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50"
                >
                  <X size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
      </>
      )}
    </div>
  );
};

export default AIAssistant;
