import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  PhoneCall,
  LoaderCircle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { User } from '../types';

interface VideoCallPageProps {
  currentUser: User;
  contact: User;
  connectionId?: string;
  mode?: 'video' | 'audio';
  onClose: () => void;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const VideoCallPage: React.FC<VideoCallPageProps> = ({
  currentUser,
  contact,
  connectionId,
  mode = 'video',
  onClose,
}) => {
  const [callState, setCallState] = useState<'starting' | 'ringing' | 'connected' | 'ended' | 'error'>('starting');
  const [error, setError] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(mode === 'video');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionReadyRef = useRef(false);

  const participantIds = [currentUser.id, contact.id].sort();
  const callerId = participantIds[0];
  const isCaller = currentUser.id === callerId;
  const callId = connectionId
    ? 'call-' + connectionId + '-' + participantIds.join('-')
    : '';

  useEffect(() => {
    if (!connectionId || !currentUser.id || !contact.id) {
      setError('This video call requires an accepted connection.');
      setCallState('error');
      return;
    }

    let cancelled = false;
    let unsubCall: (() => void) | undefined;
    let unsubRemoteCandidates: (() => void) | undefined;

    const connect = async () => {
      try {
        setCallState(isCaller ? 'ringing' : 'starting');
        const stream = await navigator.mediaDevices.getUserMedia({ video: mode === 'video', audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(rtcConfig);
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          const remote = event.streams[0];
          if (!remote) return;
          if (mode === 'audio' && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remote;
          } else if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remote;
          }
          setCallState('connected');
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') setCallState('connected');
          if (['failed', 'disconnected'].includes(pc.connectionState)) {
            setError('The video connection was interrupted.');
            setCallState('error');
          }
        };

        const ownCandidatesCollection = collection(
          db,
          'videoCalls',
          callId,
          isCaller ? 'callerCandidates' : 'calleeCandidates',
        );
        const remoteCandidatesCollection = collection(
          db,
          'videoCalls',
          callId,
          isCaller ? 'calleeCandidates' : 'callerCandidates',
        );

        pc.onicecandidate = async (event) => {
          if (!event.candidate || cancelled) return;
          await addDoc(ownCandidatesCollection, {
            ...event.candidate.toJSON(),
            senderId: currentUser.id,
            createdAt: serverTimestamp(),
          });
        };

        const flushPendingCandidates = async () => {
          if (!remoteDescriptionReadyRef.current || !pcRef.current) return;
          const queued = pendingCandidatesRef.current.splice(0);
          for (const candidate of queued) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (candidateError) {
              console.error('Failed to apply queued ICE candidate:', candidateError);
            }
          }
        };

        unsubRemoteCandidates = onSnapshot(remoteCandidatesCollection, async (snapshot) => {
          for (const candidateDoc of snapshot.docChanges()) {
            if (candidateDoc.type !== 'added') continue;
            const data = candidateDoc.doc.data() as RTCIceCandidateInit;
            if (!remoteDescriptionReadyRef.current) {
              pendingCandidatesRef.current.push(data);
            } else {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data));
              } catch (candidateError) {
                console.error('Failed to apply ICE candidate:', candidateError);
              }
            }
          }
        });

        unsubCall = onSnapshot(doc(db, 'videoCalls', callId), async (snapshot) => {
          if (!snapshot.exists()) {
            if (!isCaller) return;
            await setDoc(doc(db, 'videoCalls', callId), {
              callId,
              connectionId,
              participants: participantIds,
              callerId,
              calleeId: contact.id,
              status: 'ringing',
              createdAt: serverTimestamp(),
            }, { merge: true });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await updateDoc(doc(db, 'videoCalls', callId), {
              offer: {
                type: offer.type,
                sdp: offer.sdp,
              },
            });
            return;
          }

          const data = snapshot.data() as any;
          if (data.status === 'ended') {
            setCallState('ended');
            return;
          }

          if (!isCaller && data.offer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            remoteDescriptionReadyRef.current = true;
            await flushPendingCandidates();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateDoc(doc(db, 'videoCalls', callId), {
              answer: {
                type: answer.type,
                sdp: answer.sdp,
              },
              status: 'active',
            });
            setCallState('connected');
          }

          if (isCaller && data.answer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            remoteDescriptionReadyRef.current = true;
            await flushPendingCandidates();
            setCallState('connected');
          }
        });

        if (isCaller) {
          await setDoc(doc(db, 'videoCalls', callId), {
            callId,
            connectionId,
            participants: participantIds,
            callerId,
            calleeId: contact.id,
            status: 'ringing',
            createdAt: serverTimestamp(),
          }, { merge: true });

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await updateDoc(doc(db, 'videoCalls', callId), {
            offer: {
              type: offer.type,
              sdp: offer.sdp,
            },
          });
        } else {
          setCallState('ringing');
        }
      } catch (err: any) {
        console.error('Video call setup error:', err);
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera and microphone permission is required for an in-app call.'
            : err?.message || 'Unable to start the video call.',
        );
        setCallState('error');
      }
    };

    void connect();

    return () => {
      cancelled = true;
      unsubCall?.();
      unsubRemoteCandidates?.();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [callId, connectionId, contact.id, currentUser.id, isCaller, callerId, participantIds.join('|')]);

  useEffect(() => {
    if (mode === 'video' && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [cameraEnabled, mode]);

  const endCall = async () => {
    try {
      if (callId) {
        await updateDoc(doc(db, 'videoCalls', callId), {
          status: 'ended',
          endedBy: currentUser.id,
          endedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Failed to mark video call ended:', err);
    } finally {
      setCallState('ended');
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    }
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-slate-950 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-slate-900 shadow-[0_35px_120px_rgba(0,0,0,.35)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-300">MornAI {mode === 'audio' ? 'voice' : 'video'} call</p>
            <h1 className="mt-1 text-lg font-black">{contact.name}</h1>
            <p className="text-[10px] font-semibold text-slate-400">{contact.title}</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-slate-300">
            {callState === 'connected' ? 'Connected' : callState === 'ringing' ? 'Calling' : callState === 'ended' ? 'Ended' : callState === 'error' ? 'Needs attention' : 'Starting'}
          </span>
        </div>

        <div className="relative grid min-h-0 flex-1 bg-black p-2 sm:p-3 lg:grid-cols-[1fr_280px]">
          <div className="relative min-h-[420px] overflow-hidden rounded-[24px] bg-slate-950">
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full min-h-[420px] w-full object-cover" />
            {callState !== 'connected' && (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(124,58,237,.18),transparent_42%),#020617] p-6 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white/10 text-violet-200">
                    {callState === 'starting' ? <LoaderCircle className="h-7 w-7 animate-spin" /> : <Video className="h-7 w-7" />}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">{callState === 'ringing' ? 'Calling ' + contact.name + '…' : 'Preparing your camera and microphone…'}</p>
                  <p className="mt-2 max-w-md text-[11px] leading-5 text-slate-400">The call is peer-to-peer. Camera and microphone stay in your browser; Firebase only carries the connection signal.</p>
                </div>
              </div>
            )}
            {mode === 'video' && (
              <div className="absolute bottom-4 right-4 h-28 w-40 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
                <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <aside className="flex flex-col justify-between border-t border-white/10 bg-slate-900 p-4 lg:border-l lg:border-t-0">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-500">Call controls</p>
              <div className="mt-3 space-y-2">
                <button type="button" onClick={toggleMic} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-[10px] font-black text-slate-200">
                  {micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-rose-300" />}
                  {micEnabled ? 'Microphone on' : 'Microphone muted'}
                </button>
                <button type="button" onClick={toggleCamera} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-[10px] font-black text-slate-200">
                  {cameraEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5 text-rose-300" />}
                  {cameraEnabled ? 'Camera on' : 'Camera off'}
                </button>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-semibold text-slate-400">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-300" /> Browser audio output
                </div>
              </div>
            </div>

            {error && <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-[10px] leading-5 text-rose-200">{error}</p>}

            <div className="mt-6 space-y-2">
              <button type="button" onClick={() => void endCall()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-rose-950/30 hover:bg-rose-500">
                <PhoneOff className="h-4 w-4" /> End call
              </button>
              <button type="button" onClick={onClose} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black text-slate-300 hover:bg-white/10">
                Back to network
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
