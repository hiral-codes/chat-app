"use client";

import { useEffect } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ConversationList } from "@/components/chat/ConversationList";
import { AppShell } from "@/components/layout/AppShell";
import { GlassAlert, GlassPanel } from "@/components/ui/Glass";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { initializeChat, unarchiveConversation } from "@/lib/store/chatSlice";

ensureAmplifyConfigured();

export default function ArchivedPage() {
  const dispatch = useAppDispatch();
  const { archivedConversationIds, conversations, conversationsLoading, currentUser, error, unreadCountsByConversationId } = useAppSelector((state) => state.chat);
  const archivedConversations = conversations.filter((conversation) => archivedConversationIds.includes(conversation.conversationId));

  useEffect(() => {
    dispatch(initializeChat())
      .unwrap()
      .catch((reason) => {
        if (reason?.message === "Unauthenticated") window.location.href = "/login";
      });
  }, [dispatch]);

  return (
    <RequireAuth>
      <AppShell>
        <main className="page-stack">
          <GlassPanel>
            <h1 style={{ margin: 0 }}>Archived</h1>
            <p className="muted-copy">Chats you move out of the main inbox live here.</p>
          </GlassPanel>

          {error && error !== "Unauthenticated" ? <GlassAlert tone="danger">{error}</GlassAlert> : null}

          <GlassPanel>
            <ConversationList
              conversations={archivedConversations}
              currentUserId={currentUser?.userId}
              loading={conversationsLoading}
              unreadCountsByConversationId={unreadCountsByConversationId}
              mode="archived"
              emptyText="No archived chats."
              onUnarchive={(conversationId) => dispatch(unarchiveConversation(conversationId))}
            />
          </GlassPanel>
        </main>
      </AppShell>
    </RequireAuth>
  );
}
