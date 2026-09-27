import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video, PhoneCall } from 'lucide-react';
import { User } from '../types';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

export interface IncomingCallInfo {
  callId: string;
  mode: 'video' | 'audio';
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  participantCount: number;
}

interface IncomingCallOverlayProps {
  call: IncomingCallInfo | null;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
  call,
  onAccept,
  onReject,
}) => {
  useBodyScrollLock(Boolean(call));

  useEffect(() => {
    if (!call) return;
    // Soft ring pulse via Web Audio so we don't need an asset file.
    let ctx: AudioContext | null = null;
    let stopped = false;
    const beep = async () => {
      try {
        ctx = new AudioContext();
        const playTone = () => {
          if (stopped || !ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = call.mode === 'audio' ? 880 : 740;
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(ctx.destination);
          const now = ctx.currentTime;
          gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.36);
        };
        playTone();
        const id = window.setInterval(playTone, 1800);
        return () => window.clearInterval(id);
      } catch {
        return () => undefined;
      }
    };
    let clearTone: (() => void) | undefined;
    void beep().then((clear) => {
      clearTone = clear;
    });
    return () => {
      stopped = true;
      clearTone?.();
      void ctx?.close();
    };
  }, [call?.callId, call?.mode]);

  if (!call || typeof document === 'undefined') return null;

  const isGroup = call.participantCount > 2;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-2xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(167,139,250,.35), transparent 42%), radial-gradient(circle at 70% 75%, rgba(56,189,248,.22), transparent 40%)',
        }}
      />

      <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/35 bg-white/18 p-6 shadow-[0_40px_120px_rgba(15,23,42,.45)] backdrop-blur-3xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-sky-300/25 blur-3xl" />

        <div className="relative text-center">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-100/90">
            Incoming {call.mode === 'audio' ? 'voice' : 'video'} {isGroup ? 'group call' : 'call'}
          </p>

          <div className="relative mx-auto mt-6 h-28 w-28">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/25" />
            <span className="absolute inset-2 animate-pulse rounded-full bg-violet-300/20" />
            <div className="absolute inset-4 grid place-items-center overflow-hidden rounded-full border border-white/40 bg-white/25 shadow-inner backdrop-blur-xl">
              {call.callerAvatar ? (
                <img src={call.callerAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <PhoneCall className="h-9 w-9 text-white" />
              )}
            </div>
          </div>

          <h2 className="mt-5 text-2xl font-black tracking-tight text-white drop-shadow">
            {call.callerName}
          </h2>
          <p className="mt-1 text-xs font-semibold text-white/70">
            {isGroup
              ? `Group ${call.mode} call • ${call.participantCount} people`
              : call.mode === 'audio'
                ? 'Voice call ringing…'
                : 'Video call ringing…'}
          </p>

          <div className="mt-8 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={onReject}
              className="group flex flex-col items-center gap-2"
              aria-label="Cut call"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-rose-500 text-white shadow-[0_12px_40px_rgba(244,63,94,.45)] transition group-hover:scale-105 group-active:scale-95">
                <PhoneOff className="h-7 w-7" />
              </span>
              <span className="text-[11px] font-black text-white/85">Cut</span>
            </button>

            <button
              type="button"
              onClick={onAccept}
              className="group flex flex-col items-center gap-2"
              aria-label="Pick up call"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_12px_40px_rgba(16,185,129,.45)] transition group-hover:scale-105 group-active:scale-95">
                {call.mode === 'audio' ? <Phone className="h-7 w-7" /> : <Video className="h-7 w-7" />}
              </span>
              <span className="text-[11px] font-black text-white/85">Pick up</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// Keep User type import used for future profile wiring without unused lint if needed.
export type IncomingCaller = Pick<User, 'id' | 'name' | 'avatar'>;
