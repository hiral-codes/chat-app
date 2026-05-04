"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ChatListColumn } from "@/components/chat/ChatListColumn";
import { AppShell } from "@/components/layout/AppShell";
import { GlassAlert, GlassButton, GlassModal } from "@/components/ui/Glass";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { archiveConversation, createConversationByEmail, initializeChat, loadMoreConversations } from "@/lib/store/chatSlice";

ensureAmplifyConfigured();

export default function ChatInboxPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [peerEmail, setPeerEmail] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const {
    conversations,
    archivedConversationIds,
    currentUser,
    unreadCountsByConversationId,
    nextConversationToken,
    conversationsLoading,
    creatingConversation,
    loadingMoreConversations,
    error
  } = useAppSelector((state) => state.chat);
  const activeConversations = conversations.filter((conversation) => !archivedConversationIds.includes(conversation.conversationId));

  useEffect(() => {
    dispatch(initializeChat())
      .unwrap()
      .catch((reason) => {
        if (reason?.message === "Unauthenticated") window.location.href = "/login";
      });
  }, [dispatch]);

  const createConversation = async (event: FormEvent) => {
    event.preventDefault();
    const email = peerEmail.trim();
    if (!email || creatingConversation) return;

    try {
      const conversation = await dispatch(createConversationByEmail(email)).unwrap();
      setPeerEmail("");
      setComposeOpen(false);
      router.push(`/chat/${conversation.conversationId}`);
    } catch {
      return;
    }
  };

  return (
    <RequireAuth>
      <AppShell>
        <main className="chat-workspace chat-workspace-inbox">
          <ChatListColumn
            conversations={activeConversations}
            currentUserId={currentUser?.userId}
            loading={conversationsLoading}
            loadingMore={loadingMoreConversations}
            hasMore={Boolean(nextConversationToken)}
            archivedConversationIds={archivedConversationIds}
            unreadCountsByConversationId={unreadCountsByConversationId}
            onArchive={(conversationId) => dispatch(archiveConversation(conversationId))}
            onLoadMore={() => dispatch(loadMoreConversations())}
            onCompose={() => setComposeOpen(true)}
          />
          <section className="chat-empty-detail" aria-label="Chat detail">
            {error && error !== "Unauthenticated" ? <GlassAlert tone="danger">{error}</GlassAlert> : null}
            <div>
              <h2>Select a chat</h2>
              <p className="muted-copy">Choose a conversation from the list to open messages here.</p>
            </div>
          </section>
        </main>
        <GlassModal open={composeOpen} title="New conversation" onClose={() => setComposeOpen(false)}>
          <form className="modal-form" onSubmit={createConversation}>
            <label>
              Email address
              <input
                value={peerEmail}
                onChange={(event) => setPeerEmail(event.target.value)}
                placeholder="friend@example.com"
                type="email"
                disabled={creatingConversation}
                autoFocus
              />
            </label>
            <GlassButton type="submit" variant="primary" disabled={creatingConversation || !peerEmail.trim()}>
              {creatingConversation ? "Starting..." : "Start chat"}
            </GlassButton>
          </form>
        </GlassModal>
      </AppShell>
    </RequireAuth>
  );
}
