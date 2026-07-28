"use client";

import { useEffect, useMemo, useState } from "react";
import type { UseResonanceRoom } from "@/hooks/useResonanceRoom";
import { ResonanceMeter } from "./ResonanceMeter";
import styles from "./MergeRoomPanel.module.css";

const STATUS_COPY = {
  idle: "Room offline",
  loading: "Loading realtime engine",
  hosting: "Room open — waiting for peers",
  joining: "Negotiating peer connection",
  connected: "Live peer-to-peer session",
  error: "Connection needs attention"
} as const;

export function MergeRoomPanel({ room }: { room: UseResonanceRoom }) {
  const [name, setName] = useState("You");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const active = room.status !== "idle" && room.status !== "error";

  useEffect(() => {
    const stored = window.localStorage.getItem("resona-participant-name");
    if (stored) setName(stored);
    const code = new URLSearchParams(window.location.search).get("room");
    if (code) setJoinCode(room.normalizeCode(code));
  }, [room.normalizeCode]);

  const saveName = (value: string) => {
    setName(value);
    window.localStorage.setItem("resona-participant-name", value);
  };

  const statusCopy = STATUS_COPY[room.status];
  const connectedCount = room.participants.length;
  const roomLabel = useMemo(
    () => (room.isHost ? "HOST NODE" : "GUEST NODE"),
    [room.isHost]
  );

  const shareInvite = async () => {
    if (!room.inviteUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my RESONA room",
          text: `Open RESONA and merge sound with room ${room.code}.`,
          url: room.inviteUrl
        });
      } else {
        await navigator.clipboard.writeText(room.inviteUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      /* Share sheets may be dismissed intentionally. */
    }
  };

  return (
    <section className={styles.panel} aria-label="Realtime Merge room">
      <div className={styles.heading}>
        <div>
          <span className={styles.kicker}>Resonance room</span>
          <strong>{statusCopy}</strong>
        </div>
        <span className={styles.liveDot} data-live={active}>
          {active ? "P2P LIVE" : "OFFLINE"}
        </span>
      </div>

      {active ? (
        <>
          <div className={styles.roomCard}>
            <div>
              <span>{roomLabel}</span>
              <strong>{room.code}</strong>
            </div>
            <button type="button" onClick={shareInvite} disabled={!room.inviteUrl}>
              {copied ? "Copied" : "Invite"}
            </button>
          </div>

          <ResonanceMeter resonance={room.resonance} />

          <div className={styles.participantHeader}>
            <span>Connected matter</span>
            <span>{connectedCount}/8</span>
          </div>
          <div className={styles.participants}>
            {room.participants.map((participant) => (
              <div
                className={styles.participant}
                data-color={participant.color}
                key={participant.id}
              >
                <span className={styles.avatar} aria-hidden>
                  {participant.name.slice(0, 1).toUpperCase()}
                </span>
                <div className={styles.participantCopy}>
                  <strong>
                    {participant.name}
                    {participant.isHost ? " · Host" : ""}
                  </strong>
                  <span>{participant.matter} · {Math.round(participant.level * 100)}%</span>
                </div>
                <span
                  className={styles.activity}
                  data-active={participant.active}
                  aria-label={participant.active ? "Playing" : "Listening"}
                />
              </div>
            ))}
          </div>

          <p className={styles.explainer}>
            Touches, sustained notes, portamento, Matter choice, and signal energy are
            mirrored between connected browsers in real time.
          </p>
          <button type="button" className={styles.leave} onClick={room.leaveRoom}>
            Leave room
          </button>
        </>
      ) : (
        <div className={styles.setup}>
          <label className={styles.field}>
            <span>Your display name</span>
            <input
              value={name}
              maxLength={18}
              onChange={(event) => saveName(event.target.value)}
              placeholder="You"
              autoComplete="nickname"
            />
          </label>

          <button
            className={styles.create}
            type="button"
            onClick={() => void room.createRoom(name)}
            disabled={room.status === "loading"}
          >
            <span>Create a room</span>
            <small>Open a host node and share the link</small>
          </button>

          <div className={styles.divider}><span>or join</span></div>

          <div className={styles.joinRow}>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(room.normalizeCode(event.target.value))}
              placeholder="7-character code"
              aria-label="Room code"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => void room.joinRoom(joinCode, name)}
              disabled={joinCode.length !== 7 || room.status === "loading"}
            >
              Join
            </button>
          </div>

          <p className={styles.privacy}>
            Audio remains on each device. Only lightweight gesture and performance data
            travels over the encrypted WebRTC data channel.
          </p>
        </div>
      )}

      {room.error && <p className={styles.error}>{room.error}</p>}
    </section>
  );
}
