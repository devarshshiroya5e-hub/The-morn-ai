import React, { useState, useRef, useEffect, useCallback } from 'react';
import { postMornAI } from '../lib/mornaiAi';
import { createPortal } from 'react-dom';
import { Startup, User } from '../types';
import {
  X,
  Send,
  BrainCircuit,
  Bot,
  User as UserIcon,
  RefreshCw,
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
  animate?: boolean;
}

/** Render inline **bold** highlights inside a line of AI text. */
const renderInline = (text: string, keyPrefix: string) => {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <mark
          key={`${keyPrefix}-b-${index}`}
          className="rounded-md bg-amber-100/90 px-1 py-0.5 font-extrabold text-amber-950 shadow-[inset_0_0_0_1px_rgba(245,158,11,.25)]"
        >
          {bold[1]}
        </mark>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${index}`}>{part}</React.Fragment>;
  });
};

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
              {renderInline(trimmed.replace(/^#{1,3}\s+/, ''), `h${index}`)}
            </div>
          );
        }

        const bullet = trimmed.match(/^[-•*]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={`bullet-${index}`} className="flex items-start gap-2 text-[13px] leading-6 text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{renderInline(bullet[1], `bu${index}`)}</span>
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
              <span>{renderInline(numbered[1], `n${index}`)}</span>
            </div>
          );
        }

        return (
          <p key={`text-${index}`} className="text-[13px] leading-6 text-slate-700">
            {renderInline(trimmed, `p${index}`)}
          </p>
        );
      })}
    </div>
  );
};

/** Types out AI text; scrolls the chat so this message stays at the top of the viewport. */
const TypedAiBubble: React.FC<{
  fullText: string;
  animate: boolean;
  suggestions?: string[];
  onSendSuggestion: (text: string) => void;
  scrollParent: HTMLDivElement | null;
}> = ({ fullText, animate, suggestions, onSendSuggestion, scrollParent }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [displayed, setDisplayed] = useState(animate ? '' : fullText);
  const [done, setDone] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setDisplayed(fullText);
      setDone(true);
      return;
    }

    setDisplayed('');
    setDone(false);
    let index = 0;
    const step = Math.max(1, Math.floor(fullText.length / 180));
    const id = window.setInterval(() => {
      index = Math.min(fullText.length, index + step);
      setDisplayed(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, 16);

    return () => window.clearInterval(id);
  }, [fullText, animate]);

  // Keep the start of this AI reply pinned near the top of the chat viewport.
  useEffect(() => {
    const node = rootRef.current;
    const parent = scrollParent;
    if (!node || !parent) return;

    const top = node.offsetTop - 12;
    parent.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [displayed, scrollParent, fullText]);

  return (
    <div ref={rootRef} className="w-[min(100%,520px)]">
      <div className="rounded-2xl rounded-bl-none border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-800 shadow-xs">
        {renderAiText(displayed)}
        {!done && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-500 align-middle" />
        )}

        {done && suggestions && suggestions.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Recommended Strategic Inquiries:
            </span>
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendSuggestion(sug)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
              >
                ⚡ {sug}
              </button>
            ))}
          </div>
        )}
      </div>
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
        ? `Hi ${currentUser.name} 👋 I'm your **MornAI Career & Startup Coach**.\n\nAsk me how to get a job, pitch yourself, pick a role, price your work, or improve your profile.`
        : `Hello ${currentUser.name}! 🚀 I'm your **AI Co-Founder** for **${activeStartup?.name || 'your startup'}**.\n\nI can help with roadmap, hiring, roles, product strategy, and the next sprint.`,
      timestamp: 'Just now',
      animate: false,
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
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const setChatScrollNode = useCallback((node: HTMLDivElement | null) => {
    chatScrollRef.current = node;
    setScrollEl(node);
  }, []);

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

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // After the user message mounts, keep the upcoming AI reply area in view.
    requestAnimationFrame(() => {
      const parent = chatScrollRef.current;
      if (parent) parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' });
    });

    try {
      const data = await postMornAI<{ reply?: string }>('co-founder-chat', {
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
        text: data.reply || "Let's keep laser-focused on the **highest-impact** next step for your sprint. 🎯",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        animate: true,
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

      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      console.error('Co-Founder Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: "⚠️ I hit a network glitch. Please ask again in a moment — your question is still important.",
          timestamp: 'Just now',
          animate: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="mornai-ai-drawer fixed right-0 top-0 z-[110] flex h-[100dvh] min-h-0 w-full max-w-[560px] flex-col overflow-hidden rounded-l-[28px] border-y-0 border-r-0 border-l border-white/80 bg-white/92 shadow-[-24px_0_90px_rgba(15,23,42,.16)] backdrop-blur-2xl animate-in slide-in-from-right-8 fade-in duration-300">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />

      <div className="flex flex-shrink-0 items-center justify-between border-b border-indigo-900/50 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-5 text-white sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-600/90 text-white shadow-sm">
            <BrainCircuit className="h-5 w-5 text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Outfit'] text-sm font-bold sm:text-base">
                {currentUser.role === 'employee' ? 'AI Career & Startup Coach' : 'AI Co-Founder & Strategist'}
              </h3>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                {currentUser.role === 'employee' ? 'Career Mode' : 'Active Memory'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {currentUser.role === 'employee'
                ? 'Jobs • pitching • pricing • role fit • profile help'
                : 'Grounded in ' + (activeStartup?.historyLogs?.length || 0) + ' historical logs & roadmap'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {currentUser.role === 'founder' && activeStartup && allStartups.length > 0 && (
        <div className="flex flex-shrink-0 items-center justify-between border-b border-indigo-100 bg-indigo-50/60 px-5 py-3 text-xs">
          <span className="font-medium text-slate-500">Advising Startup:</span>
          <select
            value={activeStartup.id}
            onChange={(e) => {
              const found = allStartups.find((s) => s.id === e.target.value);
              if (found) onSelectStartup(found);
            }}
            className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-900 focus:outline-none"
          >
            {allStartups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.stage})
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        ref={setChatScrollNode}
        className="mornai-ai-chat min-h-0 flex-1 touch-pan-y space-y-5 overflow-y-auto overscroll-contain bg-slate-50/55 px-5 py-6 sm:px-6 sm:py-7"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`flex w-full items-start gap-2 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              {msg.sender === 'user' ? (
                <div className="max-w-[78%] rounded-2xl rounded-br-none bg-indigo-600 p-3.5 text-xs leading-relaxed text-white shadow-xs">
                  <div className="whitespace-pre-line text-[13px] leading-6">{msg.text}</div>
                </div>
              ) : (
                <TypedAiBubble
                  fullText={msg.text}
                  animate={Boolean(msg.animate)}
                  suggestions={msg.suggestions}
                  onSendSuggestion={handleSendMessage}
                  scrollParent={scrollEl}
                />
              )}

              {msg.sender === 'user' && (
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs text-white">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>

            <span className={`mt-1 px-9 text-[10px] text-slate-400 ${msg.sender === 'user' ? 'text-right' : ''}`}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              <span>Thinking… crafting your strategy ✨</span>
            </div>
          </div>
        )}

        <div aria-hidden="true" className="h-px" />
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-5 py-4 sm:px-6 sm:py-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="flex items-end gap-3"
        >
          <textarea
            id="ai-co-founder-chat-input"
            rows={4}
            placeholder={
              currentUser.role === 'employee'
                ? 'Ask about jobs, pitching, role fit, pricing or your profile...'
                : 'Ask anything about roadmap, hiring, roles, product strategy or sprint delegation...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
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
