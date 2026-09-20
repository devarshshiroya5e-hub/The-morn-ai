import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, limit, limitToLast, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCheck,
  Clock3,
  Globe2,
  LockKeyhole,
  MessageCircle,
  RotateCw,
  Search,
  SendHorizontal,
  UsersRound,
  X,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { ChatMessage, Startup, User } from '../types';

interface ChatPageProps {
  currentUser: User;
  startups: Startup[];
}

interface Room {
  id: string;
  title: string;
  subtitle: string;
  kind: 'world' | 'private';
  startup?: Startup;
  contact?: { id: string; name: string; avatar?: string; role?: string };
}

interface RoomPreview {
  text: string;
  createdAt: string;
  senderId: string;
}

const READ_STORAGE_KEY = 'mornai-chat-read:';
const MAX_MESSAGE_LENGTH = 2000;

const toMessage = (docSnap: any): ChatMessage => {
  const data = docSnap.data();
  const timestamp =
    data.createdAt?.toDate?.()?.toISOString?.() ||
    data.createdAt ||
    (typeof data.createdAtClient === 'number' ? new Date(data.createdAtClient).toISOString() : new Date().toISOString());

  return {
    id: docSnap.id,
    senderId: data.senderId || '',
    senderName: data.senderName || 'MornAI member',
    senderAvatar: data.senderAvatar,
    text: typeof data.text === 'string' ? data.text : '',
    createdAt: timestamp,
    createdAtClient: typeof data.createdAtClient === 'number' ? data.createdAtClient : Date.parse(timestamp),
    clientId: typeof data.clientId === 'string' ? data.clientId : undefined,
    status: 'sent',
    startupId: data.startupId,
    recipientId: data.recipientId,
  };
};

const roomTimestamp = (message: ChatMessage) => {
  if (typeof message.createdAtClient === 'number' && Number.isFinite(message.createdAtClient)) {
    return message.createdAtClient;
  }
  const value = Date.parse(message.createdAt);
  return Number.isFinite(value) ? value : 0;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDay = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

export const ChatPage: React.FC<ChatPageProps> = ({ currentUser, startups }) => {
  const [activeRoomId, setActiveRoomId] = useState('world');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomPreviews, setRoomPreviews] = useState<Record<string, RoomPreview>>({});
  const [readAt, setReadAt] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [mobileRoomListOpen, setMobileRoomListOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const initialScrollPendingRef = useRef(true);

  const rooms = useMemo<Room[]>(() => {
    const privateRooms: Room[] = [];

    if (currentUser.role === 'founder') {
      startups
        .filter((startup) => startup.founderId === currentUser.id)
        .forEach((startup) => {
          (startup.members || [])
            .filter((member) => member.userId !== currentUser.id && member.status === 'active')
            .forEach((member) => {
              privateRooms.push({
                id: `private-${startup.id}-${member.userId}`,
                title: member.name,
                subtitle: `${startup.name} • ${member.role}`,
                kind: 'private',
                startup,
                contact: {
                  id: member.userId,
                  name: member.name,
                  avatar: member.avatar,
                  role: member.role,
                },
              });
            });
        });
    } else {
      startups
        .filter((startup) =>
          startup.members?.some(
            (member) => member.userId === currentUser.id && member.status === 'active',
          ),
        )
        .forEach((startup) => {
          privateRooms.push({
            id: `private-${startup.id}-${currentUser.id}`,
            title: startup.founderName,
            subtitle: `${startup.name} • Founder`,
            kind: 'private',
            startup,
            contact: {
              id: startup.founderId,
              name: startup.founderName,
              avatar: startup.founderAvatar,
              role: 'Founder',
            },
          });
        });
    }

    return [
      {
        id: 'world',
        title: 'World Chat',
        subtitle: 'Everyone on THE MORN AI',
        kind: 'world',
      },
      ...privateRooms,
    ];
  }, [currentUser, startups]);

  useEffect(() => {
    if (!rooms.some((room) => room.id === activeRoomId)) {
      setActiveRoomId(rooms[0]?.id || 'world');
    }
  }, [rooms, activeRoomId]);

  const visibleRooms = rooms.filter((room) =>
    `${room.title} ${room.subtitle}`.toLowerCase().includes(search.toLowerCase()),
  );

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || rooms[0];

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${READ_STORAGE_KEY}${currentUser.id}`);
      setReadAt(stored ? JSON.parse(stored) : {});
    } catch {
      setReadAt({});
    }
  }, [currentUser.id]);

  const messagesRefForRoom = (room: Room) =>
    room.kind === 'world'
      ? collection(db, 'worldChat', 'messages')
      : collection(
          db,
          'startups',
          room.startup!.id,
          'privateChats',
          currentUser.role === 'founder' ? room.contact!.id : currentUser.id,
          'messages',
        );

  useEffect(() => {
    if (!rooms.length) return;

    const unsubscribes = rooms.map((room) => {
      const latestQuery = query(messagesRefForRoom(room), orderBy('createdAt', 'desc'), limit(1));

      return onSnapshot(
        latestQuery,
        (snapshot) => {
          const latest = snapshot.docs[0];
          if (!latest) return;
          const message = toMessage(latest);
          setRoomPreviews((prev) => ({
            ...prev,
            [room.id]: {
              text: message.text,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
          }));
        },
        (error) => console.error('Room preview error:', error),
      );
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [rooms, currentUser.id, currentUser.role]);

  useEffect(() => {
    if (!activeRoom) return;

    setMessages([]);
    setChatError(null);
    setIsLoadingMessages(true);

    const messagesRef =
      activeRoom.kind === 'world'
        ? collection(db, 'worldChat', 'messages')
        : collection(
            db,
            'startups',
            activeRoom.startup!.id,
            'privateChats',
            currentUser.role === 'founder' ? activeRoom.contact!.id : currentUser.id,
            'messages',
          );

    initialScrollPendingRef.current = true;

    const messagesQuery = query(messagesRefForRoom(activeRoom), orderBy('createdAt', 'asc'), limitToLast(200));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const nextMessages = snapshot.docs.map(toMessage).sort(
          (a, b) => roomTimestamp(a) - roomTimestamp(b),
        );
        setMessages((previous) => {
          const localOnly = previous.filter(
            (message) =>
              message.id.startsWith('local-') &&
              message.status !== 'sent' &&
              !nextMessages.some(
                (persisted) => persisted.clientId && persisted.clientId === message.clientId,
              ),
          );
          return [...nextMessages, ...localOnly].sort(
            (a, b) => roomTimestamp(a) - roomTimestamp(b),
          );
        });
        setChatError(null);
        setIsLoadingMessages(false);
      },
      (error) => {
        console.error('Chat subscription error:', error);
        setChatError(error.message || 'Unable to connect to the message service.');
        setMessages([]);
        setIsLoadingMessages(false);
      },
    );

    return () => unsubscribe();
  }, [
    activeRoom?.id,
    activeRoom?.kind,
    activeRoom?.startup?.id,
    activeRoom?.contact?.id,
    currentUser.id,
    currentUser.role,
  ]);

  useEffect(() => {
    if (!isLoadingMessages && initialScrollPendingRef.current) {
      initialScrollPendingRef.current = false;
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }));
      return;
    }

    const viewport = messageViewportRef.current;
    if (!viewport) return;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

    if (distanceFromBottom < 180) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      setShowScrollToLatest(true);
    }
  }, [messages, isLoadingMessages]);

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setShowScrollToLatest(distanceFromBottom > 180);
    };

    handleScroll();
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [activeRoomId]);

  useEffect(() => {
    if (!activeRoom || isLoadingMessages) return;
    const latest = messages[messages.length - 1];
    if (!latest) return;

    const latestTime = roomTimestamp(latest);
    setReadAt((previous) => {
      const next = {
        ...previous,
        [activeRoom.id]: Math.max(previous[activeRoom.id] || 0, latestTime),
      };
      try {
        window.localStorage.setItem(
          `${READ_STORAGE_KEY}${currentUser.id}`,
          JSON.stringify(next),
        );
      } catch {
        // Ignore local storage errors. The chat remains usable.
      }
      return next;
    });
  }, [activeRoom?.id, currentUser.id, isLoadingMessages, messages]);

  const scrollToLatest = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setShowScrollToLatest(false);
  };

  const sendMessage = async (existingMessage?: ChatMessage) => {
    const text = existingMessage?.text?.trim() || draft.trim();
    if (!text || !activeRoom || isSending) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      setChatError(`Messages are limited to ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`);
      return;
    }

    setIsSending(true);
    setChatError(null);

    const clientId =
      existingMessage?.clientId ||
      `${currentUser.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const localMessage: ChatMessage = existingMessage || {
      id: `local-${clientId}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text,
      createdAt: new Date().toISOString(),
      createdAtClient: Date.now(),
      clientId,
      status: 'sending',
      ...(activeRoom.kind === 'private'
        ? {
            startupId: activeRoom.startup!.id,
            recipientId: activeRoom.contact!.id,
          }
        : {}),
    };

    if (!existingMessage) {
      setMessages((previous) => [...previous, localMessage]);
      setDraft('');
    } else {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === existingMessage.id
            ? { ...message, status: 'sending' }
            : message,
        ),
      );
    }

    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }),
    );

    try {
      await addDoc(messagesRefForRoom(activeRoom), {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar || null,
        text,
        clientId,
        createdAt: serverTimestamp(),
        createdAtClient: Date.now(),
        ...(activeRoom.kind === 'private'
          ? {
              startupId: activeRoom.startup!.id,
              recipientId: activeRoom.contact!.id,
            }
          : {}),
      });

      setMessages((previous) =>
        previous.map((message) =>
          message.clientId === clientId ? { ...message, status: 'sent' } : message,
        ),
      );
    } catch (error: any) {
      console.error('Message send error:', error);

      setMessages((previous) =>
        previous.map((message) =>
          message.clientId === clientId ? { ...message, status: 'failed' } : message,
        ),
      );

      if (!existingMessage) {
        setDraft(text);
      }

      setChatError(
        error?.code === 'permission-denied'
          ? 'You no longer have permission to send messages in this room.'
          : error?.message || 'Unable to send the message. Please try again.',
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mornai-chat-page mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mornai-discover-box overflow-hidden rounded-[32px] border border-white/90 bg-white/70 shadow-[0_30px_90px_rgba(15,23,42,.10)] backdrop-blur-2xl">
        <div className="border-b border-white/80 bg-[linear-gradient(135deg,#111827_0%,#25133f_48%,#6d28d9_100%)] px-5 py-6 text-white sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-100">
                <MessageCircle className="h-3.5 w-3.5" /> MornAI Message Network
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Talk to the network.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/80">
                World Chat is open to everyone on THE MORN AI. Private startup rooms appear only after a founder selects you for their team.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="mornai-discover-box rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Live global room</div>
                <div className="mt-1 text-[10px] text-violet-100/65">All authenticated THE MORN AI members</div>
              </div>
              <div className="mornai-discover-box hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-3 sm:block">
                <UsersRound className="h-4 w-4 text-violet-200" />
                <div className="mt-1 text-[10px] font-bold text-violet-100/70">World + private rooms</div>
              </div>
            </div>
          </div>
        </div>

        {chatError && (
          <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 sm:mx-6">
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">Message connection issue</p>
              <p className="mt-1 break-words leading-5">{chatError}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRoomId(activeRoom?.id || 'world')}
              className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[10px] font-extrabold text-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid min-h-[620px] lg:grid-cols-[290px_1fr]">
          <aside className="border-b border-slate-200/80 bg-white/65 p-4 lg:border-b-0 lg:border-r">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-2xl border border-indigo-100 bg-white px-10 py-3 text-xs font-semibold text-slate-800 outline-none shadow-[0_0_22px_rgba(99,102,241,.08)] focus:border-indigo-300"
              />
            </div>

            <div className="mt-4 space-y-2">
              {visibleRooms.map((room) => {
                const active = room.id === activeRoom?.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setActiveRoomId(room.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-violet-200 bg-violet-50 shadow-[0_0_24px_rgba(124,58,237,.10)]'
                        : 'border-transparent hover:border-slate-200 hover:bg-white'
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      room.kind === 'world' ? 'bg-slate-950 text-white' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {room.kind === 'world' ? <Globe2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-extrabold text-slate-900">{room.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{room.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {currentUser.role === 'employee' && !rooms.some((room) => room.kind === 'private') && (
              <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-4">
                <LockKeyhole className="h-4 w-4 text-violet-600" />
                <p className="mt-2 text-xs font-extrabold text-slate-900">Private chat locked</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  A startup owner must select you before a private room appears here.
                </p>
              </div>
            )}
          </aside>

          <section className="flex min-h-[620px] flex-col bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.07),transparent_30%),#fff]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                  {activeRoom?.kind === 'world' ? <Globe2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-950">{activeRoom?.title || 'World Chat'}</h2>
                  <p className="text-[10px] font-semibold text-slate-400">{activeRoom?.subtitle || ''}</p>
                </div>
              </div>
              {activeRoom?.kind === 'private' && (
                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-extrabold text-violet-700">Selected team member</span>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-7">
              {isLoadingMessages && (
                <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-3xl border border-dashed border-violet-200 bg-violet-50/50 p-6 text-center text-xs font-semibold text-violet-700">
                  <RotateCw className="h-4 w-4 animate-spin" /> Connecting to messages...
                </div>
              )}

              {!isLoadingMessages && messages.length === 0 && !chatError && (
                <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center">
                  {activeRoom?.kind === 'world' ? <Globe2 className="mx-auto h-9 w-9 text-violet-300" /> : <LockKeyhole className="mx-auto h-9 w-9 text-violet-300" />}
                  <h3 className="mt-3 text-sm font-extrabold text-slate-900">Start the conversation</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {activeRoom?.kind === 'world' ? 'Say something useful, interesting, or at least not “hi”.' : 'This private room is unlocked for your startup selection.'}
                  </p>
                </div>
              )}

              {messages.map((message) => {
                const mine = message.senderId === currentUser.id;
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                      mine ? 'bg-violet-600 text-white' : 'border border-slate-200 bg-white text-slate-800 shadow-sm'
                    }`}>
                      {!mine && <div className="mb-1 text-[10px] font-extrabold text-violet-600">{message.senderName}</div>}
                      <p className="whitespace-pre-wrap text-xs leading-6">{message.text}</p>
                      <span className={`mt-1 block text-[9px] ${mine ? 'text-violet-100' : 'text-slate-400'}`}>
                        {new Date(message.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-200/70 bg-white/85 p-4 backdrop-blur-xl sm:p-5">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={activeRoom?.kind === 'world' ? 'Message everyone...' : 'Message your startup contact...'}
                  className="min-h-12 flex-1 resize-none rounded-2xl border border-indigo-100 bg-white px-4 py-3.5 text-xs text-slate-900 outline-none shadow-[0_0_20px_rgba(99,102,241,.07)] focus:border-indigo-300 focus:shadow-[0_0_28px_rgba(99,102,241,.12)]"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || !activeRoom || isSending}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSending ? <RotateCw className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-[10px] font-semibold text-slate-400">Enter sends • Shift + Enter adds a new line</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};