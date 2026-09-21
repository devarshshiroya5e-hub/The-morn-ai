import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { BellRing, BriefcaseBusiness, Check, Clock3, Rocket, Sparkles, X } from 'lucide-react';
import { Appointment, ConnectionRequest, Startup, User } from '../types';
import { buildMornaiNotifications, formatRelativeDate, MornaiNotification } from './mornaiSignals';

interface NotificationCenterProps {
  isOpen: boolean;
  currentUser: User;
  startups: Startup[];
  appointments: Appointment[];
  connections: ConnectionRequest[];
  followedStartupIds: string[];
  readNotificationIds: string[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenNetwork: (tab?: 'people' | 'startups' | 'opportunities' | 'connections') => void;
  onOpenWorkspace: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  currentUser,
  startups,
  appointments,
  connections,
  followedStartupIds,
  readNotificationIds,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onOpenNetwork,
  onOpenWorkspace,
}) => {
  const notifications = useMemo(() => buildMornaiNotifications(currentUser, startups, appointments, connections, followedStartupIds), [appointments, connections, currentUser, followedStartupIds, startups]);
  const unread = notifications.filter((item) => !readNotificationIds.includes(item.id));

  if (!isOpen) return null;

  const handleOpen = (item: MornaiNotification) => {
    onMarkRead(item.id);
    if (item.type === 'match' || item.type === 'opportunity' || item.type === 'connection') onOpenNetwork(item.type === 'connection' ? 'connections' : currentUser.role === 'founder' ? 'people' : 'opportunities');
    else onOpenWorkspace();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[2px]" onClick={onClose} />
      <motion.aside
        initial={{ opacity: 0, x: 24, scale: .985 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 24, scale: .985 }}
        className="mornai-notification-drawer fixed right-3 top-20 z-50 w-[min(94vw,390px)] overflow-hidden rounded-[28px]"
      >
        <div className="border-b border-slate-200/70 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-violet-600" /><h2 className="text-sm font-black text-slate-950">Your signal</h2></div>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">{unread.length} unread • {notifications.length} total</p>
            </div>
            <div className="flex items-center gap-1.5">
              {unread.length > 0 && <button type="button" onClick={onMarkAllRead} className="mornai-notification-action"><Check className="h-3.5 w-3.5" /> Read all</button>}
              <button type="button" onClick={onClose} className="mornai-close-btn"><X className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-2">
          {notifications.map((item) => {
            const isUnread = !readNotificationIds.includes(item.id);
            return (
              <button key={item.id} type="button" onClick={() => handleOpen(item)} className={`mornai-notification-row ${isUnread ? 'is-unread' : ''}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-50">
                  {item.type === 'match' ? <Sparkles className="h-4 w-4 text-violet-600" /> :
                    item.type === 'connection' ? <BellRing className="h-4 w-4 text-violet-600" /> :
                    item.type === 'appointment' ? <Clock3 className="h-4 w-4 text-amber-500" /> :
                      item.type === 'opportunity' ? <BriefcaseBusiness className="h-4 w-4 text-sky-600" /> :
                        <Rocket className="h-4 w-4 text-emerald-600" />}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2"><strong className="truncate text-xs font-black text-slate-900">{item.title}</strong>{isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" />}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[10px] font-medium leading-5 text-slate-500">{item.description}</span>
                  <span className="mt-1 block text-[9px] font-semibold text-slate-400">{formatRelativeDate(item.timestamp)} • {item.action}</span>
                </span>
              </button>
            );
          })}
          {notifications.length === 0 && (
            <div className="p-7 text-center"><BellRing className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-xs font-black text-slate-700">You're caught up.</p><p className="mt-1 text-[10px] leading-5 text-slate-400">The next useful thing will appear here.</p></div>
          )}
        </div>
      </motion.aside>
    </>
  );
};
