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
                id: 'dm-' + [currentUser.id, member.userId].sort().join('-'),
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
            id: 'dm-' + [currentUser.id, startup.founderId].sort().join('-'),
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
    privateRooms.forEach((room) => {
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
  }, [currentUser, startups, connections, initialContact, initialConnectionId]);

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

  const participantsForRoom = (room: Room) => {
    if (room.kind === 'private') {
      return Array.from(new Set([currentUser.id, room.contact!.id].filter(Boolean)));
    }

    if (room.kind === 'startup' && room.startup) {
      const startupMemberIds = [
        room.startup.founderId,
        ...(room.startup.memberIds || []),
        ...(room.startup.members || [])
          .filter((member) => member.status === 'active')
          .map((member) => member.userId),
      ];

      const participants = Array.from(new Set(startupMemberIds.filter(Boolean)));
      // Always include the sender so permission checks and room membership succeed.
      if (!participants.includes(currentUser.id)) {
        participants.push(currentUser.id);
      }
      return participants;
    }

    return [];
  };

  const messagesQueryForRoom = (room: Room) => {
    const userId = typeof currentUser.id === 'string' ? currentUser.id.trim() : '';
    if (!room?.id || !room?.kind) return null;

    if (room.kind === 'world') {
      return query(
        collection(db, 'messages'),
        where('roomId', '==', 'world'),
        where('roomType', '==', 'world'),
      );
    }

    if (!userId) return null;

    // Query only by participant so private chat does not depend on a
    // multi-field composite index. Filter the exact room client-side.
    return query(
      collection(db, 'messages'),
      where('participants', 'array-contains', userId),
    );
  };

  useEffect(() => {
    if (!rooms.length) return;

    const userId = typeof currentUser.id === 'string' ? currentUser.id.trim() : '';
    const worldRoom = rooms.find((room) => room.kind === 'world');
    const privateRooms = rooms.filter((room) => room.kind !== 'world');
    const unsubscribes: Array<() => void> = [];

    const applyLatestPreview = (room: Room, candidates: ChatMessage[]) => {
      const latest = candidates
        .filter((message) =>
          message.roomId === room.id &&
          message.roomType === room.kind &&
          (room.kind !== 'startup' || message.startupId === room.startup?.id),
        )
        .sort((a, b) => roomTimestamp(a) - roomTimestamp(b))
        .at(-1);

      if (!latest) return;

      setRoomPreviews((prev) => ({
        ...prev,
        [room.id]: {
          text: latest.text,
          createdAt: latest.createdAt,
          senderId: latest.senderId,
        },
      }));
    };

    if (worldRoom) {
      const worldQuery = messagesQueryForRoom(worldRoom);
      if (worldQuery) {
        unsubscribes.push(
          onSnapshot(
            worldQuery,
            (snapshot) => {
              applyLatestPreview(worldRoom, snapshot.docs.map(toMessage));
            },
            (error) => console.error('World preview error:', error),
          ),
        );
      }
    }

    // One participant listener fans out previews for every private/startup room.
    if (userId && privateRooms.length > 0) {
      const participantQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', userId),
      );

      unsubscribes.push(
        onSnapshot(
          participantQuery,
          (snapshot) => {
            const messages = snapshot.docs.map(toMessage);
            privateRooms.forEach((room) => applyLatestPreview(room, messages));
          },
          (error) => console.error('Room preview error:', error),
        ),
      );
    }

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [rooms, currentUser.id]);


  useEffect(() => {
    if (!activeRoom) return;

    setMessages([]);
    setChatError(null);
    setIsLoadingMessages(true);

    initialScrollPendingRef.current = true;

    const messagesQuery = messagesQueryForRoom(activeRoom);
    if (!messagesQuery) {
      setIsLoadingMessages(false);
      setChatError('Your account session is still loading. Please try again in a moment.');
      return;
    }

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const nextMessages = snapshot.docs
          .map(toMessage)
          .filter((message) =>
            message.roomId === activeRoom.id &&
            message.roomType === activeRoom.kind &&
            (activeRoom.kind !== 'startup' || message.startupId === activeRoom.startup?.id)
          )
          .sort((a, b) => roomTimestamp(a) - roomTimestamp(b));
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
        const code = String((error as { code?: string })?.code || '');
        const messageText = String(error.message || '');
        setChatError(
          code === 'permission-denied'
            ? 'Firebase blocked reading messages (permission-denied). Deploy the latest firestore.rules for project themorn-ai, then refresh while signed in.'
            : code === 'failed-precondition' || messageText.includes('index')
              ? 'Firestore needs an index for this chat query. Deploy firestore.indexes.json, or open the index link in the browser console.'
              : messageText || 'Unable to connect to the message service.',
        );
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
      const payload: Record<string, unknown> = {
        roomId: activeRoom.id,
        roomType: activeRoom.kind,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar || null,
        text,
        clientId,
        createdAt: serverTimestamp(),
        createdAtClient: Date.now(),
      };

      if (activeRoom.kind === 'world') {
        // World chat is readable by every signed-in user via roomId/roomType rules.
        payload.participants = [currentUser.id];
      } else if (activeRoom.kind === 'private') {
        if (!activeRoom.contact?.id) {
          throw new Error('Private chat is missing a recipient.');
        }
        payload.recipientId = activeRoom.contact.id;
        payload.participants = participants;
        if (activeRoom.startup?.id) payload.startupId = activeRoom.startup.id;
        if (activeRoom.connectionId) payload.connectionId = activeRoom.connectionId;
      } else if (activeRoom.kind === 'startup') {
        if (!activeRoom.startup?.id) {
          throw new Error('Startup chat is missing a startup id.');
        }
        if (participants.length < 1) {
          throw new Error('Startup chat has no participants yet. Refresh and try again.');
        }
        payload.startupId = activeRoom.startup.id;
        payload.participants = participants;
      }

      await addDoc(collection(db, 'messages'), payload);

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

      const code = String(error?.code || '');
      const messageText = String(error?.message || '');
      setChatError(
        code === 'permission-denied'
          ? 'Firebase blocked this message (permission-denied). Deploy the latest firestore.rules for project themorn-ai, then refresh while signed in.'
          : code === 'failed-precondition' || messageText.includes('index')
            ? 'Firestore needs an index for this chat query. Deploy firestore.indexes.json, or open the index link shown in the browser console.'
            : messageText || 'Unable to send the message. Please try again.',
      );
    } finally {
      setIsSending(false);
    }
  };

  const activeReadAt = activeRoom ? readAt[activeRoom.id] || 0 : 0;

  return (
    <div className="mornai-chat-page mx-auto w-full max-w-7xl">
      <div className="mornai-chat-shell mornai-discover-box rounded-[22px] border border-white/90 bg-white/80 shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:rounded-[28px]">
        <div className="mornai-chat-hero border-b border-white/50 px-4 py-3 text-white sm:px-6 sm:py-4">
          <div className="flex flex-col gap-1.5 sm:gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/20 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.16em] text-white">
                <MessageCircle className="h-3 w-3" /> Talk to the community
              </span>
              <h1 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">Talk to the network.</h1>
              <p className="mt-1 hidden max-w-2xl text-sm leading-5 text-violet-50/95 sm:block">
                World Chat is open to everyone on THE MORN AI. Private rooms appear after a founder selects you.
              </p>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <div className="rounded-2xl border border-white/20 bg-white/20 px-3.5 py-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-50"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Live global room</div>
                <div className="mt-0.5 text-[10px] text-white/80">All authenticated members</div>
              </div>
            </div>
          </div>
        </div>

        {chatError && (
          <div className="mx-3 mt-2 flex shrink-0 items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 sm:mx-6">
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

        <div className="mornai-chat-body relative">
          <aside className={`min-h-0 border-b border-slate-200/80 bg-white/95 p-3 sm:p-4 lg:flex lg:flex-col lg:border-b-0 lg:border-r ${
            mobileRoomListOpen
              ? 'absolute inset-0 z-30 flex flex-col'
              : 'hidden lg:flex'
          }`}>
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-600">Inbox</p>
                <h2 className="mt-0.5 text-base font-extrabold text-slate-950 sm:text-lg">Your conversations</h2>
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

            <div className="relative mt-3 shrink-0">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
              />
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain">
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

          <section className="mornai-chat-thread bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,.10),transparent_32%),#fff]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-3 py-2.5 sm:px-6 sm:py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMobileRoomListOpen(true)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 lg:hidden"
                  aria-label="Open conversations"
                >
                  <ArrowUp className="h-4 w-4 rotate-90" />
                </button>
                <span className="hidden h-9 w-9 place-items-center overflow-hidden rounded-xl bg-violet-50 text-violet-700 lg:grid">
                  {activeRoom?.kind === 'world' ? <Globe2 className="h-4 w-4" /> : (
                    <InitialAvatar
                      name={activeRoom?.kind === 'startup' ? activeRoom.startup?.name || activeRoom.title : activeRoom?.contact?.name || activeRoom?.title || 'MornAI'}
                      src={activeRoom?.kind === 'startup' ? activeRoom.startup?.logo : activeRoom?.contact?.avatar}
                      className="h-full w-full rounded-xl"
                      textClassName="text-xs font-black"
                    />
                  )}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-extrabold text-slate-950">{activeRoom?.title || 'World Chat'}</h2>
                  <p className="truncate text-[10px] font-semibold text-slate-400">{activeRoom?.subtitle || ''}</p>
                </div>
              </div>
              {activeRoom?.kind === 'private' && (
                <span className="hidden rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-extrabold text-violet-700 sm:inline">Selected team member</span>
              )}
            </div>

            <div
              ref={messageViewportRef}
              className="mornai-chat-messages px-3 py-3 sm:px-6 sm:py-4"
            >
              {isLoadingMessages && (
                <div className="mx-auto flex min-h-[200px] max-w-md items-center justify-center py-10">
                  <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/60 px-5 py-4 text-center">
                    <RotateCw className="mx-auto h-5 w-5 animate-spin text-violet-600" />
                    <p className="mt-2 text-xs font-extrabold text-violet-700">Connecting to messages...</p>
                    <p className="mt-1 text-[10px] font-semibold text-violet-500">Your conversation will appear here.</p>
                  </div>
                </div>
              )}

              {!isLoadingMessages && messages.length === 0 && !chatError && (
                <div className="flex min-h-[200px] items-center justify-center py-10">
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
            <div className="mornai-chat-composer px-2 pt-2 sm:px-4 sm:pt-2.5">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/95 px-2 py-1.5 shadow-sm transition-all focus-within:border-violet-300 focus-within:bg-white focus-within:shadow-[0_10px_28px_rgba(124,58,237,.08)]">
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
                    placeholder={activeRoom?.kind === 'world' ? 'Message everyone…' : 'Write a message…'}
                    className="min-h-9 max-h-24 w-full resize-none border-0 bg-transparent px-2 py-1.5 text-xs leading-5 text-slate-900 outline-none placeholder:text-slate-400"
                    aria-label="Message"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!draft.trim() || !activeRoom || isSending}
                    className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-md transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Send message"
                  >
                    {isSending ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className={`mt-1 px-1 pb-0.5 text-[8px] font-semibold sm:text-[9px] ${
                  draft.length > MAX_MESSAGE_LENGTH * .9 ? 'text-amber-600' : 'text-slate-400'
                }`}>
                  {draft.length.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()} • Enter to send
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};