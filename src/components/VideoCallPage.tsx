import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  LoaderCircle,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  SwitchCamera,
  Video,
  VideoOff,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { User } from '../types';

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
}

interface VideoCallPageProps {
  currentUser: User;
  callId: string;
  mode?: 'video' | 'audio';
  peers: CallParticipant[];
  isCaller: boolean;
  onClose: () => void;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const sessionIdFor = (a: string, b: string) => [a, b].sort().join('_');

const playStream = async (el: HTMLVideoElement | HTMLAudioElement | null, stream: MediaStream | null) => {
  if (!el || !stream) return;
  if (el.srcObject !== stream) el.srcObject = stream;
  try {
    await el.play();
  } catch {
    // Autoplay can be blocked until a user gesture; muted local preview usually works.
  }
};

export const VideoCallPage: React.FC<VideoCallPageProps> = ({
  currentUser,
  callId,
  mode = 'video',
  peers,
  isCaller,
  onClose,
}) => {
  const [callState, setCallState] = useState<'starting' | 'ringing' | 'connected' | 'ended' | 'error'>(
    isCaller ? 'ringing' : 'starting',
  );
  const [error, setError] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(mode === 'video');
  const [sharingScreen, setSharingScreen] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const linksRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteReadyRef = useRef<Map<string, boolean>>(new Map());
  const setupPeersRef = useRef<Set<string>>(new Set());
  const unsubscribersRef = useRef<Array<() => void>>([]);

  const peerMap = useMemo(() => {
    const map = new Map<string, CallParticipant>();
    peers.forEach((peer) => map.set(peer.id, peer));
    return map;
  }, [peers]);

  const setLocalVideoNode = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStreamRef.current) {
      void playStream(node, localStreamRef.current);
    }
  }, []);

  const attachLocalPreview = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    void playStream(localVideoRef.current, stream);
  }, []);

  const upsertRemoteStream = (peerId: string, stream: MediaStream) => {
    setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    setCallState('connected');
  };

  const flushIce = async (peerId: string) => {
    const pc = linksRef.current.get(peerId);
    if (!pc || !remoteReadyRef.current.get(peerId)) return;
    const queued = pendingIceRef.current.get(peerId) || [];
    pendingIceRef.current.set(peerId, []);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('ICE apply failed:', err);
      }
    }
  };

  const ensurePeerConnection = (remoteId: string, localStream: MediaStream) => {
    const existing = linksRef.current.get(remoteId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      upsertRemoteStream(remoteId, stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState('connected');
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[remoteId];
          return next;
        });
      }
    };

    const sessionId = sessionIdFor(currentUser.id, remoteId);
    const candidatesCol = collection(db, 'videoCalls', callId, 'sessions', sessionId, 'candidates');
    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      try {
        await addDoc(candidatesCol, {
          ...event.candidate.toJSON(),
          senderId: currentUser.id,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Failed to publish ICE candidate:', err);
      }
    };

    linksRef.current.set(remoteId, pc);
    return pc;
  };

  const wirePeerSession = (remoteId: string, localStream: MediaStream) => {
    if (setupPeersRef.current.has(remoteId)) return;
    setupPeersRef.current.add(remoteId);

    const pc = ensurePeerConnection(remoteId, localStream);
    const sessionId = sessionIdFor(currentUser.id, remoteId);
    const sessionRef = doc(db, 'videoCalls', callId, 'sessions', sessionId);
    const iAmOfferer = currentUser.id < remoteId;
    remoteReadyRef.current.set(remoteId, false);

    const unsubSession = onSnapshot(sessionRef, async (sessionSnap) => {
      const session = sessionSnap.exists() ? (sessionSnap.data() as any) : null;

      if (iAmOfferer && !pc.currentLocalDescription && (!session || !session.offer)) {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === 'video' });
          await pc.setLocalDescription(offer);
          await setDoc(
            sessionRef,
            {
              sessionId,
              offererId: currentUser.id,
              answererId: remoteId,
              offer: { type: offer.type, sdp: offer.sdp },
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch (err) {
          console.error('Offer create failed:', err);
        }
        return;
      }

      if (!iAmOfferer && session?.offer && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(session.offer));
          remoteReadyRef.current.set(remoteId, true);
          await flushIce(remoteId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await setDoc(
            sessionRef,
            {
              answer: { type: answer.type, sdp: answer.sdp },
              answererId: currentUser.id,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
          await updateDoc(doc(db, 'videoCalls', callId), {
            status: 'active',
            updatedAt: serverTimestamp(),
          });
          setCallState('connected');
        } catch (err) {
          console.error('Answer failed:', err);
        }
      }

      if (iAmOfferer && session?.answer && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(session.answer));
          remoteReadyRef.current.set(remoteId, true);
          await flushIce(remoteId);
          setCallState('connected');
        } catch (err) {
          console.error('Set remote answer failed:', err);
        }
      }
    });
    unsubscribersRef.current.push(unsubSession);

    const unsubIce = onSnapshot(
      collection(db, 'videoCalls', callId, 'sessions', sessionId, 'candidates'),
      async (iceSnap) => {
        for (const change of iceSnap.docChanges()) {
          if (change.type !== 'added') continue;
          const payload = change.doc.data() as RTCIceCandidateInit & { senderId?: string };
          if (payload.senderId === currentUser.id) continue;
          if (!remoteReadyRef.current.get(remoteId)) {
            const queue = pendingIceRef.current.get(remoteId) || [];
            queue.push(payload);
            pendingIceRef.current.set(remoteId, queue);
          } else {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload));
            } catch (err) {
              console.error('Remote ICE failed:', err);
            }
          }
        }
      },
    );
    unsubscribersRef.current.push(unsubIce);
  };

  useEffect(() => {
    if (!callId || !currentUser.id) {
      setError('Missing call session.');
      setCallState('error');
      return;
    }

    let cancelled = false;

    const connect = async () => {
      try {
        setCallState(isCaller ? 'ringing' : 'starting');
        const media = await navigator.mediaDevices.getUserMedia({
          video:
            mode === 'video'
              ? {
                  facingMode,
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }
              : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = media;
        attachLocalPreview(media);
        setMediaReady(true);
        if (mode === 'video') setCameraEnabled(true);
        setMicEnabled(true);

        await setDoc(
          doc(db, 'videoCalls', callId),
          {
            joinedIds: { [currentUser.id]: true },
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        const unsubCall = onSnapshot(doc(db, 'videoCalls', callId), (snapshot) => {
          if (!snapshot.exists() || cancelled) return;
          const data = snapshot.data() as any;

          if (data.status === 'ended' || data.status === 'rejected') {
            setCallState('ended');
            return;
          }

          const participants: string[] = Array.isArray(data.participants) ? data.participants : [];
          const joinedMap = data.joinedIds && typeof data.joinedIds === 'object' ? data.joinedIds : {};
          const others = participants.filter((id) => id !== currentUser.id);
          const localStream = localStreamRef.current;
          if (!localStream) return;

          for (const remoteId of others) {
            const shouldConnect =
              Boolean(joinedMap[remoteId]) ||
              (others.length === 1 && (data.status === 'ringing' || data.status === 'active'));
            if (shouldConnect) wirePeerSession(remoteId, localStream);
          }

          if (data.status === 'active') {
            setCallState((prev) => (prev === 'ended' || prev === 'error' ? prev : 'connected'));
          }
        });

        unsubscribersRef.current.push(unsubCall);
      } catch (err: any) {
        console.error('Call setup error:', err);
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera and microphone permission is required for an in-app call.'
            : err?.message || 'Unable to start the call.',
        );
        setCallState('error');
        setMediaReady(false);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
      setupPeersRef.current.clear();
      linksRef.current.forEach((pc) => pc.close());
      linksRef.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenTrackRef.current?.stop();
    };
    // facingMode changes are handled by flipCamera — do not remount the whole call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, currentUser.id, isCaller, mode, attachLocalPreview]);

  const endCall = async () => {
    try {
      await updateDoc(doc(db, 'videoCalls', callId), {
        status: 'ended',
        endedBy: currentUser.id,
        endedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to end call:', err);
    } finally {
      setCallState('ended');
      linksRef.current.forEach((pc) => pc.close());
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenTrackRef.current?.stop();
      onClose();
    }
  };

  const toggleMic = () => {
    const track =
      localStreamRef.current?.getAudioTracks()[0] ||
      cameraStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  };

  const toggleCamera = () => {
    if (sharingScreen || mode !== 'video') return;
    const track =
      localStreamRef.current?.getVideoTracks()[0] ||
      cameraStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  };

  const flipCamera = async () => {
    if (mode !== 'video' || sharingScreen) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing } },
        audio: false,
      });
      const newTrack = media.getVideoTracks()[0];
      if (!newTrack) return;

      const oldTrack = cameraStreamRef.current?.getVideoTracks()[0];
      oldTrack?.stop();

      if (cameraStreamRef.current) {
        cameraStreamRef.current.removeTrack(oldTrack!);
        cameraStreamRef.current.addTrack(newTrack);
      } else {
        cameraStreamRef.current = media;
      }

      for (const pc of linksRef.current.values()) {
        const sender = pc.getSenders().find((item) => item.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newTrack);
      }

      const preview = new MediaStream([
        newTrack,
        ...(localStreamRef.current?.getAudioTracks() || cameraStreamRef.current?.getAudioTracks() || []),
      ]);
      attachLocalPreview(preview);
      setFacingMode(nextFacing);
      setCameraEnabled(true);
    } catch (err) {
      console.error('Flip camera failed:', err);
    }
  };

  const replaceVideoTrackEverywhere = async (track: MediaStreamTrack | null) => {
    for (const pc of linksRef.current.values()) {
      const videoSender = pc.getSenders().find((item) => item.track?.kind === 'video');
      if (videoSender) await videoSender.replaceTrack(track);
      else if (track && localStreamRef.current) pc.addTrack(track, localStreamRef.current);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (sharingScreen) {
        screenTrackRef.current?.stop();
        screenTrackRef.current = null;
        const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0] || null;
        await replaceVideoTrackEverywhere(cameraTrack);
        if (cameraStreamRef.current) attachLocalPreview(cameraStreamRef.current);
        setSharingScreen(false);
        setCameraEnabled(Boolean(cameraTrack?.enabled));
        return;
      }

      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = display.getVideoTracks()[0];
      if (!screenTrack) return;
      screenTrackRef.current = screenTrack;
      screenTrack.onended = () => {
        void toggleScreenShare();
      };
      await replaceVideoTrackEverywhere(screenTrack);
      const preview = new MediaStream([
        screenTrack,
        ...(localStreamRef.current?.getAudioTracks() || []),
      ]);
      attachLocalPreview(preview);
      setSharingScreen(true);
      setCameraEnabled(true);
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        console.error('Screen share failed:', err);
        setError(err?.message || 'Screen share could not start.');
      }
    }
  };

  const remoteEntries = Object.entries(remoteStreams);
  const statusLabel =
    callState === 'ringing'
      ? peers.length > 1
        ? 'Ringing group…'
        : `Calling ${peers[0]?.name || 'contact'}…`
      : callState === 'connected'
        ? 'Connected'
        : callState === 'error'
          ? 'Needs attention'
          : callState === 'ended'
            ? 'Ended'
            : mediaReady
              ? 'Ready'
              : 'Starting camera…';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[180] flex flex-col bg-slate-950 text-white">
      {/* Dark status strip — no white navbar chrome */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-300">
            MornAI {peers.length > 1 ? 'group ' : ''}{mode === 'audio' ? 'voice' : 'video'}
          </p>
          <h1 className="truncate text-base font-black sm:text-lg">
            {peers.length === 1 ? peers[0].name : `${peers.length + 1} people`}
          </h1>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-slate-200">
          {statusLabel}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        {mode === 'video' ? (
          <>
            {/* While waiting: show YOUR camera full-bleed so the page is never blank */}
            {remoteEntries.length === 0 ? (
              <div className="absolute inset-0">
                <video
                  ref={setLocalVideoNode}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${cameraEnabled ? '' : 'opacity-0'}`}
                />
                {!cameraEnabled && mediaReady && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950">
                    <div className="text-center">
                      <VideoOff className="mx-auto h-10 w-10 text-slate-500" />
                      <p className="mt-3 text-sm font-bold text-slate-300">Camera is off</p>
                    </div>
                  </div>
                )}
                {!mediaReady && callState !== 'error' && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950">
                    <div className="text-center">
                      <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-violet-300" />
                      <p className="mt-3 text-sm font-bold text-white">Starting camera & microphone…</p>
                      <p className="mt-1 text-[11px] text-slate-400">Allow permission if your browser asks.</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-28 px-4 text-center sm:bottom-24">
                  <p className="rounded-2xl bg-black/45 px-4 py-2 text-xs font-bold text-white backdrop-blur">
                    {statusLabel}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`absolute inset-0 grid gap-1 p-1 ${
                  remoteEntries.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {remoteEntries.map(([peerId, stream]) => (
                  <RemoteTile
                    key={peerId}
                    stream={stream as MediaStream}
                    name={peerMap.get(peerId)?.name || 'Guest'}
                  />
                ))}
              </div>
            )}

            {/* PiP self-view once remote is connected */}
            {remoteEntries.length > 0 && (
              <div className="absolute bottom-[7.5rem] right-3 h-36 w-28 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl sm:bottom-28 sm:right-4 sm:h-40 sm:w-32">
                <video
                  ref={setLocalVideoNode}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${cameraEnabled ? '' : 'opacity-40'}`}
                />
                {sharingScreen && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                    Share
                  </span>
                )}
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[8px] font-black text-white">
                  You
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(124,58,237,.25),transparent_45%),#020617]">
            {remoteEntries.map(([peerId, stream]) => (
              <audio
                key={peerId}
                autoPlay
                ref={(node) => {
                  if (node) void playStream(node, stream as MediaStream);
                }}
              />
            ))}
            <div className="text-center">
              <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-white/10 text-violet-200 ring-1 ring-white/15">
                {mediaReady ? <Mic className="h-10 w-10" /> : <LoaderCircle className="h-8 w-8 animate-spin" />}
              </div>
              <p className="mt-5 text-xl font-black">
                {peers.length === 1 ? peers[0].name : 'Group voice call'}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{statusLabel}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute left-3 right-3 top-3 rounded-2xl border border-rose-400/30 bg-rose-950/80 p-3 text-xs leading-5 text-rose-100 backdrop-blur">
            {error}
          </div>
        )}
      </div>

      {/* Mobile-first control bar: mic / camera always visible */}
      <div className="shrink-0 border-t border-white/10 bg-slate-950 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-3 sm:gap-4">
          <ControlButton
            active={!micEnabled}
            danger={!micEnabled}
            label={micEnabled ? 'Mute' : 'Unmute'}
            onClick={toggleMic}
          >
            {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </ControlButton>

          {mode === 'video' && (
            <ControlButton
              active={!cameraEnabled}
              danger={!cameraEnabled}
              label={cameraEnabled ? 'Cam off' : 'Cam on'}
              onClick={toggleCamera}
              disabled={sharingScreen}
            >
              {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </ControlButton>
          )}

          {mode === 'video' && (
            <ControlButton label="Flip" onClick={() => void flipCamera()} disabled={sharingScreen || !mediaReady}>
              <SwitchCamera className="h-5 w-5" />
            </ControlButton>
          )}

          <ControlButton
            active={sharingScreen}
            label={sharingScreen ? 'Stop' : 'Share'}
            onClick={() => void toggleScreenShare()}
            className="hidden sm:flex"
          >
            <MonitorUp className="h-5 w-5" />
          </ControlButton>

          <ControlButton danger label="End" onClick={() => void endCall()} large>
            <PhoneOff className="h-6 w-6" />
          </ControlButton>
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-slate-500">
          Mic & camera controls work on phone and desktop
        </p>
      </div>
    </div>,
    document.body,
  );
};

const ControlButton: React.FC<{
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  large?: boolean;
  className?: string;
}> = ({ children, label, onClick, active, danger, disabled, large, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-1 disabled:opacity-40 ${className}`}
  >
    <span
      className={`grid place-items-center rounded-full border transition active:scale-95 ${
        large ? 'h-14 w-14' : 'h-12 w-12'
      } ${
        danger
          ? 'border-rose-400/40 bg-rose-600 text-white shadow-lg shadow-rose-950/40'
          : active
            ? 'border-amber-300/30 bg-amber-500/20 text-amber-100'
            : 'border-white/15 bg-white/10 text-white'
      }`}
    >
      {children}
    </span>
    <span className="text-[9px] font-black uppercase tracking-wide text-slate-300">{label}</span>
  </button>
);

const RemoteTile: React.FC<{ stream: MediaStream; name: string }> = ({ stream, name }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    void playStream(ref.current, stream);
  }, [stream]);
  return (
    <div className="relative min-h-0 overflow-hidden rounded-2xl bg-slate-900">
      <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
      <span className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
        {name}
      </span>
    </div>
  );
};
