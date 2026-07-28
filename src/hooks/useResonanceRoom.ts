"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MatterType,
  ParticipantColor
} from "@/lib/resonaui/types";
import type { TouchPulse3D } from "@/lib/resonaui/matter3d/types";

export type RoomStatus =
  | "idle"
  | "loading"
  | "hosting"
  | "joining"
  | "connected"
  | "error";

export type RoomParticipant = {
  id: string;
  name: string;
  color: ParticipantColor;
  matter: MatterType;
  level: number;
  active: boolean;
  isHost: boolean;
  lastSeen: number;
};

export type SharedGesture = {
  id: string;
  participantId: string;
  action: "tap" | "hold" | "glide" | "release";
  matter: MatterType;
  x: number;
  y: number;
  level: number;
  motion: number;
};

type PresencePatch = Partial<
  Pick<RoomParticipant, "matter" | "level" | "active" | "name">
>;

type RoomPacket =
  | { type: "hello"; participant: RoomParticipant }
  | { type: "snapshot"; participants: RoomParticipant[] }
  | { type: "presence"; participant: RoomParticipant }
  | { type: "gesture"; gesture: SharedGesture }
  | { type: "leave"; participantId: string };

type PeerDataConnection = {
  peer: string;
  open: boolean;
  metadata?: unknown;
  send: (data: RoomPacket) => void;
  close: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type PeerInstance = {
  id?: string;
  connect: (
    id: string,
    options?: { reliable?: boolean; metadata?: unknown }
  ) => PeerDataConnection;
  destroy: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type PeerConstructor = new (
  id?: string,
  options?: Record<string, unknown>
) => PeerInstance;

declare global {
  interface Window {
    Peer?: PeerConstructor;
  }
}

const PEER_SOURCES = [
  "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js",
  "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js"
];

let peerLoader: Promise<PeerConstructor> | null = null;

function loadPeerJs(): Promise<PeerConstructor> {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (peerLoader) return peerLoader;
  peerLoader = new Promise((resolve, reject) => {
    const trySource = (index: number) => {
      if (index >= PEER_SOURCES.length) {
        reject(new Error("Could not load the realtime room engine."));
        return;
      }
      const script = document.createElement("script");
      script.src = PEER_SOURCES[index];
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        if (window.Peer) resolve(window.Peer);
        else trySource(index + 1);
      };
      script.onerror = () => {
        script.remove();
        trySource(index + 1);
      };
      document.head.appendChild(script);
    };
    trySource(0);
  });
  return peerLoader;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 7 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 7);
}

function hostPeerId(code: string) {
  return `resona-${normalizeCode(code).toLowerCase()}`;
}

function colorFor(id: string): ParticipantColor {
  const colors: ParticipantColor[] = ["cyan", "blue", "purple", "magenta"];
  const score = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[score % colors.length];
}

function isRoomPacket(value: unknown): value is RoomPacket {
  return !!value && typeof value === "object" && "type" in value;
}

export function useResonanceRoom(
  onRemoteGesture?: (gesture: SharedGesture) => void
) {
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [code, setCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [remoteTouches, setRemoteTouches] = useState<TouchPulse3D[]>([]);
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  const connectionsRef = useRef(new Map<string, PeerDataConnection>());
  const participantRef = useRef(new Map<string, RoomParticipant>());
  const selfRef = useRef<RoomParticipant | null>(null);
  const hostRef = useRef(false);
  const gestureCallbackRef = useRef(onRemoteGesture);
  const pulseCounter = useRef(10000);
  gestureCallbackRef.current = onRemoteGesture;

  const commitParticipants = useCallback(() => {
    const next = [...participantRef.current.values()].sort((a, b) => {
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    setParticipants(next);
  }, []);

  const sendToAll = useCallback((packet: RoomPacket, except?: string) => {
    connectionsRef.current.forEach((connection, peerId) => {
      if (peerId === except || !connection.open) return;
      try {
        connection.send(packet);
      } catch {
        /* peer may be closing */
      }
    });
  }, []);

  const receiveGesture = useCallback((gesture: SharedGesture) => {
    if (gesture.participantId === selfRef.current?.id) return;
    gestureCallbackRef.current?.(gesture);
    if (gesture.action === "release") return;
    const id = pulseCounter.current++;
    const pulse: TouchPulse3D = {
      id,
      x: gesture.x,
      y: gesture.y,
      vx: gesture.action === "glide" ? (gesture.motion - 0.5) * 420 : 0,
      vy: gesture.action === "hold" ? -80 : -150,
      strength: 0.86 + gesture.level * 0.42,
      createdAt: performance.now()
    };
    setRemoteTouches((current) => [...current.slice(-18), pulse]);
    window.setTimeout(
      () => setRemoteTouches((current) => current.filter((item) => item.id !== id)),
      1400
    );
  }, []);

  const handlePacket = useCallback(
    (packet: RoomPacket, sourcePeer: string) => {
      if (packet.type === "snapshot") {
        participantRef.current = new Map(
          packet.participants.map((participant) => [participant.id, participant])
        );
        if (selfRef.current) {
          participantRef.current.set(selfRef.current.id, selfRef.current);
        }
        commitParticipants();
        return;
      }

      if (packet.type === "hello" || packet.type === "presence") {
        participantRef.current.set(packet.participant.id, packet.participant);
        commitParticipants();
        if (hostRef.current) {
          sendToAll(
            { type: "snapshot", participants: [...participantRef.current.values()] },
            packet.type === "hello" ? undefined : sourcePeer
          );
        }
        return;
      }

      if (packet.type === "gesture") {
        receiveGesture(packet.gesture);
        if (hostRef.current) sendToAll(packet, sourcePeer);
        return;
      }

      participantRef.current.delete(packet.participantId);
      commitParticipants();
      if (hostRef.current) sendToAll(packet, sourcePeer);
    },
    [commitParticipants, receiveGesture, sendToAll]
  );

  const attachConnection = useCallback(
    (connection: PeerDataConnection) => {
      connectionsRef.current.set(connection.peer, connection);
      connection.on("open", () => {
        setStatus("connected");
        setError(null);
        if (hostRef.current) {
          connection.send({
            type: "snapshot",
            participants: [...participantRef.current.values()]
          });
        } else if (selfRef.current) {
          connection.send({ type: "hello", participant: selfRef.current });
        }
      });
      connection.on("data", (...args: unknown[]) => {
        const packet = args[0];
        if (isRoomPacket(packet)) handlePacket(packet, connection.peer);
      });
      connection.on("close", () => {
        connectionsRef.current.delete(connection.peer);
        const leaving = [...participantRef.current.values()].find(
          (participant) => participant.id === connection.peer
        );
        if (leaving) participantRef.current.delete(leaving.id);
        commitParticipants();
        if (!hostRef.current && connectionsRef.current.size === 0) {
          setStatus("error");
          setError("The room connection ended. Rejoin with the same code.");
        }
      });
      connection.on("error", () => {
        setError("A peer connection could not be established on this network.");
      });
    },
    [commitParticipants, handlePacket]
  );

  const leaveRoom = useCallback(() => {
    const self = selfRef.current;
    if (self) sendToAll({ type: "leave", participantId: self.id });
    connectionsRef.current.forEach((connection) => connection.close());
    connectionsRef.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
    participantRef.current.clear();
    selfRef.current = null;
    hostRef.current = false;
    setParticipants([]);
    setRemoteTouches([]);
    setCode("");
    setIsHost(false);
    setStatus("idle");
    setError(null);
  }, [sendToAll]);

  const createRoom = useCallback(
    async (name: string) => {
      leaveRoom();
      setStatus("loading");
      try {
        const Peer = await loadPeerJs();
        const nextCode = roomCode();
        const peer = new Peer(hostPeerId(nextCode), { debug: 0 });
        peerRef.current = peer;
        hostRef.current = true;
        setIsHost(true);
        setCode(nextCode);
        peer.on("open", (...args: unknown[]) => {
          const id = String(args[0] ?? hostPeerId(nextCode));
          const self: RoomParticipant = {
            id,
            name: name.trim() || "Host",
            color: "cyan",
            matter: "glass",
            level: 0.35,
            active: false,
            isHost: true,
            lastSeen: Date.now()
          };
          selfRef.current = self;
          participantRef.current.set(id, self);
          commitParticipants();
          setStatus("hosting");
        });
        peer.on("connection", (...args: unknown[]) => {
          attachConnection(args[0] as PeerDataConnection);
        });
        peer.on("error", (...args: unknown[]) => {
          const issue = args[0] as { type?: string; message?: string } | undefined;
          setStatus("error");
          setError(
            issue?.type === "unavailable-id"
              ? "That room code collided. Create another room."
              : issue?.message || "Could not create the room."
          );
        });
      } catch (issue) {
        setStatus("error");
        setError(issue instanceof Error ? issue.message : "Could not create the room.");
      }
    },
    [attachConnection, commitParticipants, leaveRoom]
  );

  const joinRoom = useCallback(
    async (rawCode: string, name: string) => {
      const nextCode = normalizeCode(rawCode);
      if (nextCode.length !== 7) {
        setError("Enter the 7-character room code.");
        return;
      }
      leaveRoom();
      setStatus("loading");
      setCode(nextCode);
      try {
        const Peer = await loadPeerJs();
        const peer = new Peer(undefined, { debug: 0 });
        peerRef.current = peer;
        hostRef.current = false;
        setIsHost(false);
        peer.on("open", (...args: unknown[]) => {
          const id = String(args[0]);
          const self: RoomParticipant = {
            id,
            name: name.trim() || "Guest",
            color: colorFor(id),
            matter: "glass",
            level: 0.35,
            active: false,
            isHost: false,
            lastSeen: Date.now()
          };
          selfRef.current = self;
          participantRef.current.set(id, self);
          commitParticipants();
          setStatus("joining");
          attachConnection(
            peer.connect(hostPeerId(nextCode), {
              reliable: true,
              metadata: { name: self.name, color: self.color }
            })
          );
        });
        peer.on("connection", (...args: unknown[]) => {
          attachConnection(args[0] as PeerDataConnection);
        });
        peer.on("error", (...args: unknown[]) => {
          const issue = args[0] as { type?: string; message?: string } | undefined;
          setStatus("error");
          setError(
            issue?.type === "peer-unavailable"
              ? "No active host was found for that room code."
              : issue?.message || "Could not join the room."
          );
        });
      } catch (issue) {
        setStatus("error");
        setError(issue instanceof Error ? issue.message : "Could not join the room.");
      }
    },
    [attachConnection, commitParticipants, leaveRoom]
  );

  const publishPresence = useCallback(
    (patch: PresencePatch) => {
      const current = selfRef.current;
      if (!current) return;
      const participant: RoomParticipant = {
        ...current,
        ...patch,
        level: clamp01(patch.level ?? current.level),
        lastSeen: Date.now()
      };
      selfRef.current = participant;
      participantRef.current.set(participant.id, participant);
      commitParticipants();
      const packet: RoomPacket = { type: "presence", participant };
      if (hostRef.current) sendToAll(packet);
      else connectionsRef.current.forEach((connection) => {
        if (connection.open) connection.send(packet);
      });
    },
    [commitParticipants, sendToAll]
  );

  const sendGesture = useCallback(
    (gesture: Omit<SharedGesture, "id" | "participantId">) => {
      const self = selfRef.current;
      if (!self) return;
      const packet: RoomPacket = {
        type: "gesture",
        gesture: {
          ...gesture,
          id: `${self.id}-${performance.now()}-${Math.random()}`,
          participantId: self.id
        }
      };
      if (hostRef.current) sendToAll(packet);
      else connectionsRef.current.forEach((connection) => {
        if (connection.open) connection.send(packet);
      });
    },
    [sendToAll]
  );

  const resonance = useMemo(() => {
    if (participants.length <= 1) return status === "hosting" ? 0.22 : 0.12;
    const levels = participants.map((participant) => participant.level);
    const average = levels.reduce((sum, value) => sum + value, 0) / levels.length;
    const deviation =
      levels.reduce((sum, value) => sum + Math.abs(value - average), 0) /
      levels.length;
    const synchrony = 1 - Math.min(1, deviation * 2.8);
    const occupancy = Math.min(1, (participants.length - 1) / 4);
    const activity = participants.filter((participant) => participant.active).length /
      participants.length;
    return clamp01(0.28 + synchrony * 0.3 + occupancy * 0.22 + average * 0.12 + activity * 0.08);
  }, [participants, status]);

  const inviteUrl = useMemo(() => {
    if (!code || typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("room", code);
    return url.toString();
  }, [code]);

  useEffect(() => () => leaveRoom(), [leaveRoom]);

  return {
    status,
    code,
    isHost,
    participants,
    remoteTouches,
    resonance,
    error,
    inviteUrl,
    createRoom,
    joinRoom,
    leaveRoom,
    publishPresence,
    sendGesture,
    normalizeCode
  };
}

export type UseResonanceRoom = ReturnType<typeof useResonanceRoom>;
