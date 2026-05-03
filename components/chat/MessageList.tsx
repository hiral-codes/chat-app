"use client";

import { Message, User } from "@/lib/types/chat";

type Props = {
  messages: Message[];
  currentUserId?: string;
  participants?: User[];
  loading?: boolean;
};

export function MessageList({ messages, currentUserId, participants = [], loading = false }: Props) {
  const participantNames = new Map(participants.map((participant) => [participant.userId, participant.displayName]));

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 10, padding: "8px 4px" }}>
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="soft-skeleton"
            style={{
              height: item % 2 ? 62 : 48,
              width: item % 2 ? "68%" : "52%",
              marginLeft: item % 2 ? "auto" : 0,
              borderRadius: 8
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8, maxHeight: "60vh", overflowY: "auto", padding: "8px 4px" }}>
      {!messages.length ? <p style={{ color: "#94a3b8", textAlign: "center" }}>No messages yet.</p> : null}
      {messages.map((message) => {
        const mine = currentUserId === message.senderId;
        const senderName = mine ? "You" : participantNames.get(message.senderId) ?? "Chat partner";
        return (
          <div
            key={message.messageId}
            style={{
              marginLeft: mine ? "auto" : 0,
              maxWidth: "75%",
              background: mine ? "#1d4ed8" : "#1f2937",
              padding: "10px 12px",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.16)"
            }}
          >
            <div style={{ fontSize: 12, color: mine ? "#bfdbfe" : "#94a3b8", marginBottom: 4 }}>{senderName}</div>
            <div>{message.content}</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{new Date(message.createdAt).toLocaleTimeString()}</div>
          </div>
        );
      })}
    </div>
  );
}
