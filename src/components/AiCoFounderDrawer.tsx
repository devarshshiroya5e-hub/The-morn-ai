import React, { useState, useRef, useEffect } from 'react';
import { Startup, User } from '../types';
import { 
  X, 
  Send, 
  BrainCircuit, 
  Sparkles, 
  TrendingUp, 
  Briefcase, 
  CheckCircle2, 
  Bot, 
  User as UserIcon,
  RefreshCw,
  Lightbulb
} from 'lucide-react';

interface AiCoFounderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeStartup: Startup;
  currentUser: User;
  allStartups: Startup[];
  onSelectStartup: (startup: Startup) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

export const AiCoFounderDrawer: React.FC<AiCoFounderDrawerProps> = ({
  isOpen,
  onClose,
  activeStartup,
  currentUser,
  allStartups,
  onSelectStartup,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-welcome',
      sender: 'ai',
      text: `Hello ${currentUser.name}! I am your automated AI Co-Founder and Business Strategist for **${activeStartup.name}**.\n\nI have indexed all ${activeStartup.historyLogs.length} historical logs, pivots, and team commitments. How can I help steer our company roadmap, optimize role postings, or unblock our next sprint today?`,
      timestamp: 'Just now',
      suggestions: [
        'Analyze bottlenecks in our current Phase 1 sprint',
        'Suggest which high-impact role we need to hire next',
        'Review our investor readiness score and how to reach 95+',
        'How should we structure equity vs stipend for new joiners?',
      ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Lock the document while the drawer is open so wheel/touch gestures belong
  // to the AI panel instead of moving the page underneath it.
  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isOpen]);

  // Scroll only the message viewport. scrollIntoView() would also move the
  // document, which is exactly the weird page jump we do not want.
  useEffect(() => {
    if (!isOpen) return;
    const container = chatScrollRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/co-founder-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup: activeStartup,
          userPrompt: textToSend,
          userRole: currentUser.role,
        }),
      });

      const data = await res.json();
      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply || "Based on our roadmap and historical data, let's keep laser-focused on MVP deliverability.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Generate next sprint task delegation',
          'Create high-converting job post for this',
          'Review latest historical pivot impact',
        ],
      };

      setMessages(prev => [...prev, aiReply]);
    } catch (err) {
      console.error('Co-Founder Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: "I encountered a minor network glitch connecting to the strategic neural engine. Please ask again in a moment.",
        timestamp: 'Just now',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mornai-ai-drawer fixed inset-y-0 right-0 z-50 flex h-dvh max-h-dvh min-h-0 w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/90 flex items-center justify-center text-white border border-indigo-400/30 shadow-sm">
            <BrainCircuit className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base font-['Outfit']">
                AI Co-Founder & Strategist
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Active Memory
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Grounded in {activeStartup.historyLogs.length} historical logs & roadmap
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Startup Context Switcher */}
      <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between text-xs flex-shrink-0">
        <span className="text-slate-500 font-medium">Advising Startup:</span>
        <select
          value={activeStartup.id}
          onChange={(e) => {
            const found = allStartups.find(s => s.id === e.target.value);
            if (found) onSelectStartup(found);
          }}
          className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1 font-bold text-indigo-900 focus:outline-none text-xs"
        >
          {allStartups?.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.stage})
            </option>
          ))}
        </select>
      </div>

      {/* Chat Messages Body */}
      <div ref={chatScrollRef} className="mornai-ai-chat min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 bg-slate-50/50 touch-pan-y">
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-2 max-w-[88%]">
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Prompt Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      Recommended Strategic Inquiries:
                    </span>
                    {msg.suggestions?.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(sug)}
                        className="block w-full text-left px-2.5 py-1.5 text-[11px] font-medium bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                      >
                        ⚡ {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-400 mt-1 px-9">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Analyzing startup memory vault & formulating strategy...</span>
            </div>
          </div>
        )}

        <div aria-hidden="true" className="h-px" />
      </div>

      {/* Chat Input */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            id="ai-co-founder-chat-input"
            placeholder="Ask anything (e.g. roadmap, hiring post, sprint delegation)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            id="send-ai-chat-btn"
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-sm transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
          Powered by Gemini 2.5 Flash • Context: {activeStartup.name}
        </p>
      </div>

    </div>
  );
};
