import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const IGNORED_SELECTORS = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[contenteditable="true"]',
  '[data-no-pull-refresh]',
  '.mornai-modal-scroll',
  '.mornai-startup-explorer',
  '.mornai-ai-drawer',
  '.mornai-auth-scroll',
];

export const PullToRefresh: React.FC = () => {
  const startY = useRef(0);
  const tracking = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const onStart = (event: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 2) {
        tracking.current = false;
        return;
      }

      const target = event.target as Element | null;
      if (target && IGNORED_SELECTORS.some((selector) => target.closest(selector))) {
        tracking.current = false;
        return;
      }

      startY.current = event.touches[0]?.clientY || 0;
      pullRef.current = 0;
      tracking.current = true;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking.current || refreshingRef.current || window.scrollY > 2) return;

      const currentY = event.touches[0]?.clientY || startY.current;
      const distance = currentY - startY.current;
      if (distance <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }

      const eased = Math.min(104, distance * 0.48);
      pullRef.current = eased;
      setPull(eased);

      if (eased > 6 && event.cancelable) {
        event.preventDefault();
      }
    };

    const onEnd = () => {
      if (!tracking.current) return;
      tracking.current = false;

      if (pullRef.current >= 62) {
        refreshingRef.current = true;
        setRefreshing(true);
        pullRef.current = 72;
        setPull(72);
        window.setTimeout(() => window.location.reload(), 320);
        return;
      }

      setPull(0);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  if (pull <= 0 && !refreshing) return null;

  const ready = refreshing || pull >= 62;
  return (
    <div
      className="fixed left-1/2 top-3 z-[250] -translate-x-1/2 pointer-events-none"
      style={{ transform: 'translateX(-50%) translateY(' + Math.min(18, pull * 0.16) + 'px)' }}
      aria-live="polite"
    >
      <div className="mornai-pull-refresh flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3.5 py-2 shadow-[0_16px_45px_rgba(15,23,42,.16)] backdrop-blur-xl">
        <RefreshCw className={'h-4 w-4 text-violet-600 transition-transform duration-200 ' + (refreshing ? 'animate-spin' : ready ? 'rotate-180 scale-110' : '')} />
        <span className="text-[10px] font-black text-slate-700">
          {refreshing ? 'Refreshing…' : ready ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
};
