"use client";

import { Message } from "@/lib/types/chat";

type Props = {
  messages: Message[];
  currentUserId?: string;
};

export function MessageList({ messages, currentUserId }: Props) {
  return (
    <div style={{ display: "grid", gap: 8, maxHeight: "60vh", overflowY: "auto", padding: "8px 4px" }}>
      {messages.map((message) => {
        const mine = currentUserId === message.senderId;
        return (
          <div
            key={message.messageId}
            style={{
              marginLeft: mine ? "auto" : 0,
              maxWidth: "75%",
              background: mine ? "#1d4ed8" : "#1f2937",
              padding: "10px 12px",
              borderRadius: 10
            }}
          >
            <div>{message.content}</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{new Date(message.createdAt).toLocaleTimeString()}</div>
          </div>
        );
      })}
    </div>
  );
}
