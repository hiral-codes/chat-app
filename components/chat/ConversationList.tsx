"use client";

import Link from "next/link";
import { Conversation } from "@/lib/types/chat";

type Props = {
  conversations: Conversation[];
  selectedConversationId?: string;
};

export function ConversationList({ conversations, selectedConversationId }: Props) {
  if (!conversations.length) {
    return <p style={{ color: "#94a3b8" }}>No conversations yet.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {conversations.map((conversation) => {
        const selected = selectedConversationId === conversation.conversationId;
        const title = conversation.participants.map((p) => p.displayName).join(", ");
        return (
          <Link
            key={conversation.conversationId}
            href={`/chat/${conversation.conversationId}`}
            style={{
              display: "block",
              border: `1px solid ${selected ? "#2563eb" : "#1f2937"}`,
              background: selected ? "#172554" : "#111827",
              padding: 12,
              borderRadius: 10
            }}
          >
            <div style={{ fontWeight: 600 }}>{title}</div>
            <div style={{ color: "#94a3b8", fontSize: 14 }}>{conversation.lastMessagePreview || "Start chatting..."}</div>
          </Link>
        );
      })}
    </div>
  );
}
