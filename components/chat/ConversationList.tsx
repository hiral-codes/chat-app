"use client";

import Link from "next/link";
import { Avatar } from "@/components/chat/Avatar";
import { Conversation } from "@/lib/types/chat";

type Props = {
  conversations: Conversation[];
  selectedConversationId?: string;
  currentUserId?: string;
  loading?: boolean;
};

export function ConversationList({ conversations, selectedConversationId, currentUserId, loading = false }: Props) {
  if (loading) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {[0, 1, 2].map((item) => (
          <div key={item} className="soft-skeleton" style={{ height: 72, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return <p style={{ color: "#94a3b8" }}>No conversations yet. Start one with an email address.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {conversations.map((conversation) => {
        const selected = selectedConversationId === conversation.conversationId;
        const visibleParticipants = conversation.participants.filter((participant) => participant.userId !== currentUserId);
        const title = (visibleParticipants.length ? visibleParticipants : conversation.participants)
          .map((participant) => participant.displayName)
          .join(", ");
        const avatarUser = (visibleParticipants.length ? visibleParticipants : conversation.participants)[0];

        return (
          <Link
            key={conversation.conversationId}
            href={`/chat/${conversation.conversationId}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: `1px solid ${selected ? "#2563eb" : "#1f2937"}`,
              background: selected ? "#17305d" : "#111827",
              padding: 12,
              borderRadius: 8,
              transition: "border-color 160ms ease, background 160ms ease"
            }}
          >
            <Avatar user={avatarUser} label={title} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
              <div style={{ color: "#94a3b8", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {conversation.lastMessagePreview || "Start chatting..."}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
