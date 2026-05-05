"use client";

import { ConversationList } from "@/components/chat/ConversationList";
import { Conversation, User } from "@/lib/types/chat";

type Props = {
  conversations: Conversation[];
  currentUserId?: string;
  selectedConversationId?: string;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  archivedConversationIds?: string[];
  unreadCountsByConversationId?: Record<string, number>;
  typingNamesByConversationId?: Record<string, string[]>;
  onArchive: (conversationId: string) => void;
  onLoadMore: () => void;
  onCompose: () => void;
  onViewParticipant?: (participant: User) => void;
};

export function ChatListColumn({
  conversations,
  currentUserId,
  selectedConversationId,
  loading = false,
  loadingMore = false,
  hasMore = false,
  archivedConversationIds = [],
  unreadCountsByConversationId = {},
  typingNamesByConversationId = {},
  onArchive,
  onLoadMore,
  onCompose,
  onViewParticipant
}: Props) {
  return (
    <aside className="chat-list-column" aria-label="Chats">
      <header className="chat-list-header">
        <div>
          <h1>Chats</h1>
          <p className="muted-copy">Recent conversations</p>
        </div>
        <button className="chat-compose-button" type="button" aria-label="Start new conversation" title="Start new conversation" onClick={onCompose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.75 6.75A3.75 3.75 0 0 1 8.5 3h7A3.75 3.75 0 0 1 19.25 6.75v4.5A3.75 3.75 0 0 1 15.5 15h-3.94L7.2 19.05A.75.75 0 0 1 5.94 18.5v-3.55a3.75 3.75 0 0 1-1.19-2.7zM8.5 4.5a2.25 2.25 0 0 0-2.25 2.25v5.5c0 .67.29 1.28.75 1.7.16.14.25.35.25.56v2.27l3.5-3.25c.14-.13.32-.2.51-.2h4.24a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 15.5 4.5z" />
            <path d="M12 7.25a.75.75 0 0 1 .75.75v1.25H14a.75.75 0 0 1 0 1.5h-1.25V12a.75.75 0 0 1-1.5 0v-1.25H10a.75.75 0 0 1 0-1.5h1.25V8a.75.75 0 0 1 .75-.75" />
          </svg>
        </button>
      </header>

      <div className="chat-list-scroll">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          currentUserId={currentUserId}
          loading={loading}
          archivedConversationIds={archivedConversationIds}
          unreadCountsByConversationId={unreadCountsByConversationId}
          typingNamesByConversationId={typingNamesByConversationId}
          onArchive={onArchive}
          onViewParticipant={onViewParticipant}
        />
        {hasMore ? (
          <button className="chat-list-load-more" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
