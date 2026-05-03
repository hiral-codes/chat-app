"use client";

import Link from "next/link";
import { Avatar } from "@/components/chat/Avatar";
import { Conversation } from "@/lib/types/chat";

type Props = {
  conversations: Conversation[];
  selectedConversationId?: string;
  currentUserId?: string;
  loading?: boolean;
  archivedConversationIds?: string[];
  unreadCountsByConversationId?: Record<string, number>;
  mode?: "active" | "archived";
  emptyText?: string;
  onArchive?: (conversationId: string) => void;
  onUnarchive?: (conversationId: string) => void;
};

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

const looksLikeEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const nameFromEmail = (email: string) =>
  email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function ConversationList({
  conversations,
  selectedConversationId,
  currentUserId,
  loading = false,
  archivedConversationIds = [],
  unreadCountsByConversationId = {},
  mode = "active",
  emptyText = "No conversations yet. Start one with an email address.",
  onArchive,
  onUnarchive
}: Props) {
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
    return <p style={{ color: "#64748b" }}>{emptyText}</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {conversations.map((conversation) => {
        const selected = selectedConversationId === conversation.conversationId;
        const visibleParticipants = conversation.participants.filter((participant) => participant.userId !== currentUserId);
        const titleParticipants = visibleParticipants.length ? visibleParticipants : conversation.participants;
        const title = titleParticipants
          .map((participant) => (looksLikeEmail(participant.displayName) ? nameFromEmail(participant.displayName) : participant.displayName))
          .join(", ");
        const email = titleParticipants
          .map((participant) => participant.email || (looksLikeEmail(participant.displayName) ? participant.displayName : ""))
          .filter(Boolean)
          .join(", ");
        const preview = conversation.lastMessagePreview || "Start chatting...";
        const avatarUser = titleParticipants[0];
        const archived = archivedConversationIds.includes(conversation.conversationId);
        const unreadCount = unreadCountsByConversationId[conversation.conversationId] ?? 0;

        return (
          <div
            key={conversation.conversationId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
              overflow: "hidden",
              border: `1px solid ${selected ? "rgba(14, 165, 233, 0.42)" : "rgba(148, 163, 184, 0.18)"}`,
              background: selected ? "rgba(224, 242, 254, 0.78)" : "rgba(255, 255, 255, 0.54)",
              padding: 12,
              borderRadius: 8,
              transition: "border-color 160ms ease, background 160ms ease"
            }}
          >
            <Link href={`/chat/${conversation.conversationId}`} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, overflow: "hidden", flex: 1 }}>
              <Avatar user={avatarUser} label={title} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, maxWidth: "100%" }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, maxWidth: "100%", flex: 1 }} title={title}>
                    {truncate(title, 28)}
                  </div>
                  {unreadCount ? <span className="conversation-unread-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
                </div>
                <div style={{ color: unreadCount ? "#172033" : "#64748b", fontSize: 14, fontWeight: unreadCount ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }} title={preview}>
                  {truncate(preview, 42)}
                </div>
                {email ? (
                  <div className="conversation-email" title={email}>
                    {truncate(email, 34)}
                  </div>
                ) : null}
              </div>
            </Link>
            {mode === "archived" ? (
              <button className="icon-action-button archive-action-button" type="button" aria-label="Unarchive chat" title="Unarchive chat" onClick={() => onUnarchive?.(conversation.conversationId)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5.25 3.5h13.5a1.75 1.75 0 0 1 1.7 2.18l-.8 3.2A2.75 2.75 0 0 1 22 11.6v6.65A2.75 2.75 0 0 1 19.25 21H4.75A2.75 2.75 0 0 1 2 18.25V11.6c0-1.35.97-2.47 2.25-2.72l-.8-3.2A1.75 1.75 0 0 1 5.25 3.5Zm0 1.5a.25.25 0 0 0-.24.31l.75 2.94h12.48l.75-2.94a.25.25 0 0 0-.24-.31Zm-.5 4.75A1.25 1.25 0 0 0 3.5 11v7.25c0 .69.56 1.25 1.25 1.25h14.5c.69 0 1.25-.56 1.25-1.25V11a1.25 1.25 0 0 0-1.25-1.25Z" />
                  <path d="M12 17.5a.75.75 0 0 1-.75-.75v-3.44l-1.22 1.22a.75.75 0 1 1-1.06-1.06l2.5-2.5a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 1 1-1.06 1.06l-1.22-1.22v3.44a.75.75 0 0 1-.75.75Z" />
                </svg>
              </button>
            ) : (
              <button
                className="icon-action-button archive-action-button"
                type="button"
                aria-label={archived ? "Archived" : "Archive chat"}
                title={archived ? "Archived" : "Archive chat"}
                disabled={archived}
                onClick={() => onArchive?.(conversation.conversationId)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5.25 3.5h13.5a1.75 1.75 0 0 1 1.7 2.18l-.8 3.2A2.75 2.75 0 0 1 22 11.6v6.65A2.75 2.75 0 0 1 19.25 21H4.75A2.75 2.75 0 0 1 2 18.25V11.6c0-1.35.97-2.47 2.25-2.72l-.8-3.2A1.75 1.75 0 0 1 5.25 3.5Zm0 1.5a.25.25 0 0 0-.24.31l.75 2.94h12.48l.75-2.94a.25.25 0 0 0-.24-.31Zm-.5 4.75A1.25 1.25 0 0 0 3.5 11v7.25c0 .69.56 1.25 1.25 1.25h14.5c.69 0 1.25-.56 1.25-1.25V11a1.25 1.25 0 0 0-1.25-1.25Z" />
                  <path d="M12 11.25a.75.75 0 0 1 .75.75v3.44l1.22-1.22a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.22 1.22V12a.75.75 0 0 1 .75-.75Z" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
