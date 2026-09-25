import React, { useState, useRef, useEffect } from 'react';
import { postMornAI } from '../lib/mornaiAi';
import { createPortal } from 'react-dom';
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
  activeStartup: Startup | null;
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

const renderAiText = (text: string) => {
  const lines = String(text || '').split(/\r?\n/);
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={`spacer-${index}`} className="h-1" />;

        if (/^#{1,3}\s+/.test(trimmed)) {
          return (
            <div key={`heading-${index}`} className="pt-1 text-[13px] font-extrabold text-slate-950">
              {trimmed.replace(/^#{1,3}\s+/, '')}
            </div>
          );
        }

        const bullet = trimmed.match(/^[-•*]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={`bullet-${index}`} className="flex items-start gap-2 text-[13px] leading-6 text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{bullet[1]}</span>
            </div>
          );
        }

        const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
        if (numbered) {
          return (
            <div key={`number-${index}`} className="flex items-start gap-2.5 text-[13px] leading-6 text-slate-700">
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-indigo-50 px-1 text-[10px] font-extrabold text-indigo-600">
                {trimmed.match(/^\d+/)?.[0]}
              </span>
              <span>{numbered[1]}</span>
            </div>
          );
        }

        return (
          <p key={`text-${index}`} className="text-[13px] leading-6 text-slate-700">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};

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
      text: currentUser.role === 'employee'
        ? `Hi ${currentUser.name}. I’m your MornAI Career & Startup Coach.\n\nAsk me how to get a job, how to pitch yourself to a founder, what role fits your skills, how to price your work, or how to improve your profile. You do not need to own a startup to use this assistant.`
        : `Hello ${currentUser.name}! I am your automated AI Co-Founder and Business Strategist for **${activeStartup.name}**.\n\nI have indexed the startup context and can help steer the roadmap, role strategy, hiring and next sprint.`,
      timestamp: 'Just now',
      suggestions: currentUser.role === 'employee'
        ? [
            'How can I get a job through MornAI?',
            'How should I pitch myself to a founder?',
            'Which role fits my skills best?',
            'What should I charge for my work?',
          ]
        : [
            'Analyze bottlenecks in our current sprint',
            'Suggest the next role we should hire',
            'Review our investor readiness',
            'How should we structure a partnership for a new role?',
          ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // The drawer itself follows the document. Only the conversation viewport
  // has its own internal scroll so opening AI never locks the main page.
  useEffect(() => {
    if (!isOpen) return;
    const container = chatScrollRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'auto',
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
      const data = await postMornAI<any>('co-founder-chat', {
          startup: currentUser.role === 'founder' ? activeStartup : null,
          message: textToSend,
          userPrompt: textToSend,
          userRole: currentUser.role,
          userProfile: currentUser,
          chatHistory: messages.slice(-8),
        });
      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply || "Based on our roadmap and historical data, let's keep laser-focused on MVP deliverability.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: currentUser.role === 'employee'
          ? [
              'How can I get a job through MornAI?',
              'How should I pitch myself to a founder?',
              'Which role fits my skills best?',
              'Help me improve my profile.',
            ]
          : [
              'Generate next sprint task delegation',
              'Create a high-converting role post',
              'Review the latest historical pivot impact',
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

  return createPortal(
    <div className="mornai-ai-drawer fixed right-0 top-0 z-[110] flex h-[100dvh] min-h-0 w-full max-w-[560px] flex-col overflow-hidden rounded-l-[28px] border-y-0 border-r-0 border-l border-white/80 bg-white/92 shadow-[-24px_0_90px_rgba(15,23,42,.16)] backdrop-blur-2xl animate-in slide-in-from-right-8 fade-in duration-300">
      
      {/* Header */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />

      <div className="px-5 py-5 sm:px-6 sm:py-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/90 flex items-center justify-center text-white border border-indigo-400/30 shadow-sm">
            <BrainCircuit className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base font-['Outfit']">
                {currentUser.role === 'employee' ? 'AI Career & Startup Coach' : 'AI Co-Founder & Strategist'}
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                {currentUser.role === 'employee' ? 'Career Mode' : 'Active Memory'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {currentUser.role === 'employee'
                ? 'Jobs • pitching • pricing • role fit • profile help'
                : 'Grounded in ' + activeStartup.historyLogs.length + ' historical logs & roadmap'}
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

      {/* Context Switcher */}
      {currentUser.role === 'founder' && activeStartup && (
      <div className="px-5 py-3 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between text-xs flex-shrink-0">
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
      )}

      {/* Chat Messages Body */}
      <div ref={chatScrollRef} className="mornai-ai-chat min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6 sm:py-7 space-y-5 bg-slate-50/55 touch-pan-y">
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex w-full items-start gap-2">
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none max-w-[78%]'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none w-[min(100%,520px)]'
                }`}
              >
                {msg.sender === 'ai' ? renderAiText(msg.text) : (
                  <div className="whitespace-pre-line text-[13px] leading-6">{msg.text}</div>
                )}

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
      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-5 py-4 sm:px-6 sm:py-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-3"
        >
          <textarea
            id="ai-co-founder-chat-input"
            rows={4}
            placeholder={currentUser.role === 'employee'
              ? 'Ask about jobs, pitching, role fit, pricing or your profile...'
              : 'Ask anything about roadmap, hiring, roles, product strategy or sprint delegation...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="min-h-[112px] max-h-44 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            id="send-ai-chat-btn"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:translate-y-0 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          Enter to send • Shift+Enter for a new line • Powered by MornAI AI
        </p>
      </div>

    </div>,
    document.body,
  );
};
