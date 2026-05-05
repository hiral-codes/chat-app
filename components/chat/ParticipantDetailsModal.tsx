"use client";

import { Avatar } from "@/components/chat/Avatar";
import { GlassModal } from "@/components/ui/Glass";
import { User } from "@/lib/types/chat";

type Props = {
  participant?: User;
  open: boolean;
  onClose: () => void;
};

const formatLastSeen = (lastSeenAt?: string | null) => {
  if (!lastSeenAt) return "Not available";
  return new Date(lastSeenAt).toLocaleString();
};

export function ParticipantDetailsModal({ participant, open, onClose }: Props) {
  if (!participant) return null;

  const online = participant.onlineStatus === "online";

  return (
    <GlassModal open={open} title="Profile details" onClose={onClose}>
      <div className="participant-profile">
        <Avatar user={participant} label={participant.displayName} size={72} />
        <div className="participant-profile-main">
          <h3>{participant.displayName}</h3>
          <div className={`participant-profile-status ${online ? "participant-profile-status-online" : ""}`}>
            <span aria-hidden="true" className="presence-dot" />
            {online ? "Online" : "Offline"}
          </div>
        </div>
        <div className="participant-profile-grid">
          <div>
            <span>User ID</span>
            <strong>{participant.userId}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{participant.email || "Not available"}</strong>
          </div>
          <div>
            <span>Last seen</span>
            <strong>{formatLastSeen(participant.lastSeenAt)}</strong>
          </div>
        </div>
      </div>
    </GlassModal>
  );
}
