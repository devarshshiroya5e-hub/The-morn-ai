import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
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
import { ChatMessage, ConnectionRequest, Startup, User } from '../types';
import { InitialAvatar } from './InitialAvatar';

interface ChatPageProps {
  currentUser: User;
  startups: Startup[];
  connections: ConnectionRequest[];
  initialContact?: User | null;
  initialConnectionId?: string;
}

interface Room {
  id: string;
  title: string;
  subtitle: string;
  kind: 'world' | 'private' | 'startup';
  startup?: Startup;
  contact?: { id: string; name: string; avatar?: string; role?: string };
  connectionId?: string;
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
    roomId: typeof data.roomId === 'string' ? data.roomId : undefined,
    roomType: data.roomType === 'world' || data.roomType === 'private' || data.roomType === 'startup' ? data.roomType : undefined,
    participants: Array.isArray(data.participants) ? data.participants.filter((value: unknown): value is string => typeof value === 'string') : undefined,
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

export const ChatPage: React.FC<ChatPageProps> = ({ currentUser, startups, connections, initialContact, initialConnectionId }) => {
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
  const [chatRetryKey, setChatRetryKey] = useState(0);
  const [directChatRooms, setDirectChatRooms] = useState<Room[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const initialScrollPendingRef = useRef(true);

  const rooms = useMemo<Room[]>(() => {
    const privateRooms: Room[] = [];

    // Keep every accepted one-to-one relationship visible in Messages,
    // not only the person opened from the People page.
    connections
      .filter((connection) => connection.status === 'accepted')
      .forEach((connection) => {
        const isSender = connection.fromUserId === currentUser.id;
        const contactId = isSender ? connection.toUserId : connection.fromUserId;
        const contactName = isSender ? connection.toName : connection.fromName;
        const contactAvatar = isSender ? connection.toAvatar : connection.fromAvatar;
        privateRooms.push({
          id: 'dm-' + [currentUser.id, contactId].sort().join('-'),
          title: contactName,
          subtitle: connection.startupName || 'MornAI connection',
          kind: 'private',
          contact: {
            id: contactId,
            name: contactName,
            avatar: contactAvatar,
            role: 'Network connection',
          },
          connectionId: connection.id,
        });
      });

    if (initialContact && initialContact.id !== currentUser.id) {
      const ids = [currentUser.id, initialContact.id].sort();
      const directRoomId = 'dm-' + ids.join('-');
      if (!privateRooms.some((room) => room.id === directRoomId)) {
        privateRooms.push({
          id: directRoomId,
          title: initialContact.name,
          subtitle: initialContact.title || 'Private conversation',
          kind: 'private',
          contact: {
            id: initialContact.id,
            name: initialContact.name,
            avatar: initialContact.avatar,
            role: initialContact.role,
          },
          connectionId: initialConnectionId,
        });
      }
    }

    if (currentUser.role === 'founder') {
      startups
        .filter((startup) => startup.persisted && startup.founderId === currentUser.id)
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
          startup.persisted &&
          (
            startup.memberIds?.includes(currentUser.id) ||
            startup.members?.some(
              (member) => member.userId === currentUser.id && member.status === 'active',
            )
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

    startups
      .filter((startup) =>
        startup.persisted &&
        (
          startup.founderId === currentUser.id ||
          startup.memberIds?.includes(currentUser.id) ||
          startup.members?.some((member) => member.userId === currentUser.id && member.status === 'active')
        ),
      )
      .forEach((startup) => {
        privateRooms.push({
          id: 'startup-chat-' + startup.id,
          title: startup.name,
          subtitle: 'Startup team chat • everyone on the team',
          kind: 'startup',
          startup,
        });
      });

    const roomMap = new Map<string, Room>();
    privateRooms.forEach((room) => roomMap.set(room.id, room));
    directChatRooms.forEach((room) => {
      const existing = roomMap.get(room.id);
      if (!existing || (!existing.connectionId && room.connectionId)) {
        roomMap.set(room.id, room);
      }
    });

    return [
      {
        id: 'world',
        title: 'World Chat',
        subtitle: 'Everyone on THE MORN AI',
        kind: 'world',
      },
      ...Array.from(roomMap.values()),
    ];
  }, [currentUser, startups, connections, directChatRooms, initialContact, initialConnectionId]);

  useEffect(() => {
    if (initialContact && initialContact.id !== currentUser.id) {
      const ids = [currentUser.id, initialContact.id].sort();
      const targetRoomId = 'dm-' + ids.join('-');
      if (rooms.some((room) => room.id === targetRoomId)) {
        setActiveRoomId(targetRoomId);
        return;
      }
    }

    if (!rooms.some((room) => room.id === activeRoomId)) {
      setActiveRoomId(rooms[0]?.id || 'world');
    }
  }, [rooms, activeRoomId, initialContact, initialConnectionId, currentUser.id]);

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

  useEffect(() => {
    const chatsQuery = query(
      collection(db, 'directChats'),
      where('participants', 'array-contains', currentUser.id),
    );

    return onSnapshot(
      chatsQuery,
      (snapshot) => {
        const nextRooms = snapshot.docs
          .map((snap) => {
            const data = snap.data();
            const isA = data.participantAId === currentUser.id;
            const contactId = isA ? data.participantBId : data.participantAId;
            const contactName = isA ? data.participantBName : data.participantAName;
            const contactAvatar = isA ? data.participantBAvatar : data.participantAAvatar;
            if (typeof contactId !== 'string' || typeof contactName !== 'string') return null;
            return {
              id: typeof data.roomId === 'string' ? data.roomId : snap.id,
              title: contactName,
              subtitle: 'Private conversation',
              kind: 'private' as const,
              contact: {
                id: contactId,
                name: contactName,
                avatar: typeof contactAvatar === 'string' ? contactAvatar : undefined,
                role: 'Network connection',
              },
              connectionId: typeof data.connectionId === 'string' ? data.connectionId : undefined,
            };
          })
          .filter((room) => room !== null) as Room[];
        setDirectChatRooms(nextRooms);
      },
      (error) => console.error('Direct chat rooms error:', error),
    );
  }, [currentUser.id]);

  const participantsForRoom = (room: Room) => {
    if (room.kind === 'private') {
      return Array.from(new Set([currentUser.id, room.contact!.id]));
    }

    if (room.kind === 'startup' && room.startup) {
      const startupMemberIds = [
        room.startup.founderId,
        ...(room.startup.memberIds || []),
        ...(room.startup.members || [])
          .filter((member) => member.status === 'active')
          .map((member) => member.userId),
      ];

      return Array.from(new Set(startupMemberIds.filter(Boolean)));
    }

    return [];
  };

  const messagesQueryForRoom = (room: Room) => {
    const filters = [
      where('roomId', '==', room.id),
      where('roomType', '==', room.kind),
    ];

    if (room.kind === 'private' || room.kind === 'startup') {
      filters.push(where('participants', 'array-contains', currentUser.id));
    }

    // Keep this query equality-only so Firestore can serve it from automatic
    // single-field indexes. We sort by message time in the client.
    return query(collection(db, 'messages'), ...filters);
  };

  useEffect(() => {
    if (!rooms.length) return;

    const unsubscribes = rooms.map((room) => {
      const latestQuery = messagesQueryForRoom(room);

      return onSnapshot(
        latestQuery,
        (snapshot) => {
          const latest = snapshot.docs
            .map(toMessage)
            .sort((a, b) => roomTimestamp(a) - roomTimestamp(b))
            .at(-1);
          if (!latest) return;
          const message = latest;
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

    initialScrollPendingRef.current = true;

    const messagesQuery = messagesQueryForRoom(activeRoom);

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
    chatRetryKey,
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

  const setActiveRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setMobileRoomListOpen(false);
  };

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
      roomId: activeRoom.id,
      roomType: activeRoom.kind,
      participants: participantsForRoom(activeRoom),
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
            ...(activeRoom.startup ? { startupId: activeRoom.startup.id } : {}),
            recipientId: activeRoom.contact!.id,
          }
        : activeRoom.kind === 'startup'
          ? {
              startupId: activeRoom.startup!.id,
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
      const participants = participantsForRoom(activeRoom);
      await addDoc(collection(db, 'messages'), {
        roomId: activeRoom.id,
        roomType: activeRoom.kind,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar || null,
        text,
        clientId,
        createdAt: serverTimestamp(),
        createdAtClient: Date.now(),
        ...(activeRoom.kind === 'private'
          ? activeRoom.startup
            ? {
                startupId: activeRoom.startup.id,
                recipientId: activeRoom.contact!.id,
                participants,
              }
            : {
                recipientId: activeRoom.contact!.id,
                ...(activeRoom.connectionId ? { connectionId: activeRoom.connectionId } : {}),
                participants,
              }
          : activeRoom.kind === 'startup'
            ? {
                startupId: activeRoom.startup!.id,
                participants,
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

  const activeReadAt = activeRoom ? readAt[activeRoom.id] || 0 : 0;

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
              onClick={() => setChatRetryKey((value) => value + 1)}
              className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[10px] font-extrabold text-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid min-h-[620px] lg:grid-cols-[290px_1fr]">
          <aside className={`border-b border-slate-200/80 bg-white/95 p-4 backdrop-blur-xl lg:static lg:flex lg:flex-col lg:border-b-0 lg:border-r ${
            mobileRoomListOpen
              ? 'absolute inset-0 z-30 flex'
              : 'hidden'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-600">Inbox</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-950">Your conversations</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileRoomListOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 lg:hidden"
                aria-label="Close conversations"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
              />
            </div>

            <div className="mt-4 space-y-1.5 overflow-y-auto">
              {visibleRooms.map((room) => {
                const active = room.id === activeRoom?.id;
                const preview = roomPreviews[room.id];
                const lastRead = readAt[room.id] || 0;
                const previewTime = preview ? Date.parse(preview.createdAt) : 0;
                const unread = Boolean(preview && !active && previewTime > lastRead);

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setActiveRoom(room.id)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                      active
                        ? 'border-violet-200 bg-violet-50 shadow-[0_0_24px_rgba(124,58,237,.09)]'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl ${
                      room.kind === 'world' ? 'bg-slate-950 text-white' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {room.kind === 'world' ? (
                        <Globe2 className="h-4 w-4" />
                      ) : (
                        <InitialAvatar
                          name={room.kind === 'startup' ? room.startup?.name || room.title : room.contact?.name || room.title}
                          src={room.kind === 'startup' ? room.startup?.logo : room.contact?.avatar}
                          className="h-full w-full rounded-2xl"
                          textClassName="text-sm font-black"
                        />
                      )}
                      {unread && <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-white bg-violet-600" />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-xs ${
                          unread ? 'font-black text-slate-950' : 'font-extrabold text-slate-900'
                        }`}>
                          {room.title}
                        </span>
                        {preview && (
                          <span className="shrink-0 text-[9px] font-semibold text-slate-400">
                            {formatTime(preview.createdAt)}
                          </span>
                        )}
                      </span>
                      <span className={`mt-1 block truncate text-[10px] leading-5 ${
                        unread ? 'font-bold text-slate-600' : 'font-semibold text-slate-400'
                      }`}>
                        {preview?.text || room.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {!rooms.some((room) => room.kind === 'private' || room.kind === 'startup') && (
              <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-4">
                <MessageCircle className="h-4 w-4 text-violet-600" />
                <p className="mt-2 text-xs font-extrabold text-slate-900">Start a private chat</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Open People and choose Message next to anyone you want to contact.
                </p>
              </div>
            )}
          </aside>

          <section className="relative flex min-h-[620px] min-w-0 flex-col bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.07),transparent_30%),#fff]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileRoomListOpen(true)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 lg:hidden"
                  aria-label="Open conversations"
                >
                  <ArrowUp className="h-4 w-4 rotate-90" />
                </button>
                <span className="hidden h-10 w-10 place-items-center overflow-hidden rounded-xl bg-violet-50 text-violet-700 lg:grid">
                  {activeRoom?.kind === 'world' ? <Globe2 className="h-4 w-4" /> : (
                    <InitialAvatar
                      name={activeRoom?.kind === 'startup' ? activeRoom.startup?.name || activeRoom.title : activeRoom?.contact?.name || activeRoom?.title || 'MornAI'}
                      src={activeRoom?.kind === 'startup' ? activeRoom.startup?.logo : activeRoom?.contact?.avatar}
                      className="h-full w-full rounded-xl"
                      textClassName="text-xs font-black"
                    />
                  )}
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

            <div
              ref={messageViewportRef}
              className="relative flex-1 overflow-y-auto px-3 py-5 sm:px-7"
            >
              {isLoadingMessages && (
                <div className="mx-auto flex min-h-[360px] max-w-md items-center justify-center">
                  <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/60 px-5 py-4 text-center">
                    <RotateCw className="mx-auto h-5 w-5 animate-spin text-violet-600" />
                    <p className="mt-2 text-xs font-extrabold text-violet-700">Connecting to messages...</p>
                    <p className="mt-1 text-[10px] font-semibold text-violet-500">Your conversation will appear here.</p>
                  </div>
                </div>
              )}

              {!isLoadingMessages && messages.length === 0 && !chatError && (
                <div className="flex min-h-[360px] items-center justify-center">
                  <div className="mx-auto max-w-md rounded-[30px] border border-dashed border-slate-200 bg-white/80 p-8 text-center shadow-sm">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                      {activeRoom?.kind === 'world' ? <Globe2 className="h-5 w-5" /> : activeRoom?.kind === 'startup' ? <UsersRound className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                    </span>
                    <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                      {activeRoom?.kind === 'world' ? 'Start the global conversation' : activeRoom?.kind === 'startup' ? 'Start the team conversation' : 'Start a private conversation'}
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {activeRoom?.kind === 'world'
                        ? 'Share an idea, ask a useful question, or find someone building something interesting.'
                        : 'This private room is available because this teammate is part of the startup team.'}
                    </p>
                  </div>
                </div>
              )}

              {!isLoadingMessages && messages.length > 0 && (
                <div className="mx-auto max-w-3xl">
                  {messages.map((message, index) => {
                    const previous = index > 0 ? messages[index - 1] : undefined;
                    const mine = message.senderId === currentUser.id;
                    const previousMine = previous?.senderId === message.senderId;
                    const sameDay = previous && formatDay(previous.createdAt) === formatDay(message.createdAt);
                    const grouped =
                      Boolean(previousMine && sameDay) &&
                      roomTimestamp(message) - roomTimestamp(previous as ChatMessage) < 5 * 60 * 1000;
                    const showDay = !previous || !sameDay;
                    const unreadBoundary =
                      Boolean(previous) &&
                      activeReadAt > 0 &&
                      roomTimestamp(message) > activeReadAt &&
                      roomTimestamp(previous as ChatMessage) <= activeReadAt;

                    return (
                      <React.Fragment key={message.id}>
                        {showDay && (
                          <div className="my-6 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[9px] font-extrabold uppercase tracking-[.14em] text-slate-400">
                              {formatDay(message.createdAt)}
                            </span>
                            <div className="h-px flex-1 bg-slate-200" />
                          </div>
                        )}

                        {unreadBoundary && (
                          <div className="my-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-violet-200" />
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-[9px] font-black uppercase tracking-[.13em] text-violet-700">
                              New messages
                            </span>
                            <div className="h-px flex-1 bg-violet-200" />
                          </div>
                        )}

                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: .16 }}
                          className={`flex ${
                            mine ? 'justify-end' : 'justify-start'
                          } ${grouped ? 'mt-1' : 'mt-3'}`}
                        >
                          <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[76%] ${mine ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 shrink-0">
                              {!grouped && !mine && (
                                <InitialAvatar
                                  name={message.senderName}
                                  src={message.senderAvatar}
                                  className="h-8 w-8 rounded-xl"
                                  textClassName="text-[10px] font-black"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              {!grouped && !mine && (
                                <p className="mb-1 ml-1 text-[10px] font-extrabold text-violet-600">
                                  {message.senderName}
                                </p>
                              )}

                              <div
                                className={`rounded-[22px] px-4 py-3 shadow-sm transition-shadow ${
                                  mine
                                    ? 'rounded-br-md bg-[linear-gradient(135deg,#5b21b6_0%,#7c3aed_65%,#9333ea_100%)] text-white shadow-[0_10px_28px_rgba(124,58,237,.18)]'
                                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                                } ${message.status === 'failed' ? 'ring-2 ring-rose-200 ring-offset-2' : ''}`}
                              >
                                <p className="whitespace-pre-wrap break-words text-xs leading-6">{message.text}</p>
                                <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[9px] font-semibold ${
                                  mine ? 'text-violet-100' : 'text-slate-400'
                                }`}>
                                  <span>{formatTime(message.createdAt)}</span>
                                  {mine && (
                                    <>
                                      {message.status === 'sending' && <Clock3 className="h-3 w-3" />}
                                      {message.status === 'sent' && <CheckCheck className="h-3 w-3" />}
                                      {message.status === 'failed' && <AlertCircle className="h-3 w-3 text-rose-200" />}
                                    </>
                                  )}
                                </div>
                              </div>

                              {message.status === 'failed' && (
                                <button
                                  type="button"
                                  onClick={() => void sendMessage(message)}
                                  className="mt-1 flex items-center gap-1 text-[9px] font-extrabold text-rose-600 hover:text-rose-700"
                                >
                                  <RotateCw className="h-3 w-3" /> Tap to retry
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              <div ref={bottomRef} />

              <AnimatePresence>
                {showScrollToLatest && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 8, scale: .96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: .96 }}
                    onClick={scrollToLatest}
                    className="sticky bottom-3 left-1/2 z-10 mx-auto flex -translate-x-1/2 items-center gap-2 rounded-full border border-violet-200 bg-white/95 px-3.5 py-2 text-[10px] font-extrabold text-violet-700 shadow-lg backdrop-blur-xl"
                  >
                    <ArrowDown className="h-3.5 w-3.5" /> Jump to latest
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <div className="border-t border-slate-200/70 bg-white/90 p-3 backdrop-blur-xl sm:p-4">
              <div className="mx-auto max-w-3xl">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-2 shadow-[0_12px_32px_rgba(15,23,42,.05)] transition-all focus-within:border-violet-300 focus-within:bg-white focus-within:shadow-[0_16px_38px_rgba(124,58,237,.10)]">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder={activeRoom?.kind === 'world' ? 'Message everyone...' : 'Write to your startup contact...'}
                    className="min-h-12 w-full resize-none border-0 bg-transparent px-3 py-2.5 text-xs leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                    aria-label="Message"
                  />

                  <div className="flex items-center justify-between gap-3 px-2 pb-1">
                    <p className={`text-[9px] font-semibold ${
                      draft.length > MAX_MESSAGE_LENGTH * .9 ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {draft.length.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()} • Enter to send • Shift + Enter for a new line
                    </p>
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={!draft.trim() || !activeRoom || isSending}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-md transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Send message"
                    >
                      {isSending ? <RotateCw className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};