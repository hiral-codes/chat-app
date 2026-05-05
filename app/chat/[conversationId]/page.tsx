"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Avatar } from "@/components/chat/Avatar";
import { ChatListColumn } from "@/components/chat/ChatListColumn";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { ParticipantDetailsModal } from "@/components/chat/ParticipantDetailsModal";
import { AppShell } from "@/components/layout/AppShell";
import { GlassAlert, GlassButton, GlassModal } from "@/components/ui/Glass";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";
import { updateTyping } from "@/lib/chat/api";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  archiveConversation,
  createConversationByEmail,
  initializeChat,
  loadMoreConversations,
  loadOlderMessages,
  markConversationReadOnServer,
  markConversationSeen,
  openConversation,
  sendChatMessage
} from "@/lib/store/chatSlice";
import { User } from "@/lib/types/chat";

ensureAmplifyConfigured();

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const conversationId = useMemo(() => params.conversationId, [params.conversationId]);
  const [initialMessagesLoading, setInitialMessagesLoading] = useState(true);
  const [peerEmail, setPeerEmail] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [profileParticipant, setProfileParticipant] = useState<User | undefined>(undefined);
  const dispatch = useAppDispatch();
  const {
    conversations,
    archivedConversationIds,
    currentUser,
    unreadCountsByConversationId,
    selectedConversation,
    nextConversationToken,
    messagesByConversationId,
    messageNextTokens,
    conversationsLoading,
    creatingConversation,
    loadingMoreConversations,
    messagesLoading,
    loadingOlderMessages,
    seenMessageIdsByConversationId,
    receiptsByConversationId,
    typingByConversationId,
    error
  } = useAppSelector((state) => state.chat);

  const messages = useMemo(() => messagesByConversationId[conversationId] ?? [], [conversationId, messagesByConversationId]);
  const activeConversations = useMemo(
    () => conversations.filter((conversation) => !archivedConversationIds.includes(conversation.conversationId)),
    [archivedConversationIds, conversations]
  );
  const nextToken = messageNextTokens[conversationId];
  const visibleParticipants = useMemo(
    () => selectedConversation?.participants.filter((participant) => participant.userId !== currentUser?.userId) ?? [],
    [currentUser?.userId, selectedConversation?.participants]
  );
  const titleParticipants = visibleParticipants.length ? visibleParticipants : selectedConversation?.participants ?? [];
  const chatPartnerNames = visibleParticipants
    .map((participant) => participant.displayName)
    .join(", ");
  const title = chatPartnerNames || selectedConversation?.participants.map((participant) => participant.displayName).join(", ") || "Chat";
  const avatarUser = titleParticipants[0];
  const peerReceipt = visibleParticipants[0]?.userId
    ? receiptsByConversationId[conversationId]?.[visibleParticipants[0].userId]
    : undefined;
  const typingNames = useMemo(() => {
    const typingByUserId = typingByConversationId[conversationId] ?? {};
    return visibleParticipants
      .filter((participant) => typingByUserId[participant.userId]?.isTyping)
      .map((participant) => participant.displayName);
  }, [conversationId, typingByConversationId, visibleParticipants]);
  const typingNamesByConversationId = useMemo(
    () =>
      Object.fromEntries(
        activeConversations.map((conversation) => {
          const typingByUserId = typingByConversationId[conversation.conversationId] ?? {};
          const names = conversation.participants
            .filter((participant) => participant.userId !== currentUser?.userId && typingByUserId[participant.userId]?.isTyping)
            .map((participant) => participant.displayName);
          return [conversation.conversationId, names];
        })
      ),
    [activeConversations, currentUser?.userId, typingByConversationId]
  );
  const peerStatus =
    avatarUser?.onlineStatus === "online"
      ? "Online"
      : avatarUser?.lastSeenAt
        ? `Last seen ${new Date(avatarUser.lastSeenAt).toLocaleString()}`
        : "Offline";

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setInitialMessagesLoading(true);

      try {
        const session = await fetchAuthSession();
        if (!session.tokens) {
          window.location.href = "/login";
          return;
        }

        await dispatch(initializeChat());
        await dispatch(openConversation(conversationId)).unwrap();
      } catch {
        return;
      } finally {
        if (!cancelled) setInitialMessagesLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [conversationId, dispatch]);

  useEffect(() => {
    dispatch(markConversationSeen(conversationId));
    if (messages.some((message) => message.senderId !== currentUser?.userId)) {
      dispatch(markConversationReadOnServer(conversationId)).catch(() => undefined);
    }
  }, [conversationId, currentUser?.userId, dispatch, messages]);

  const onSend = async (content: string) => {
    try {
      await dispatch(sendChatMessage({ conversationId, content })).unwrap();
    } catch {
      return;
    }
  };

  const onTypingChange = useCallback((isTyping: boolean) => {
    updateTyping(conversationId, isTyping).catch(() => undefined);
  }, [conversationId]);

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
      <main className="chat-workspace chat-workspace-detail">
        <ChatListColumn
          conversations={activeConversations}
          selectedConversationId={conversationId}
          currentUserId={currentUser?.userId}
          loading={conversationsLoading}
          loadingMore={loadingMoreConversations}
          hasMore={Boolean(nextConversationToken)}
          archivedConversationIds={archivedConversationIds}
          unreadCountsByConversationId={unreadCountsByConversationId}
          typingNamesByConversationId={typingNamesByConversationId}
          onArchive={(id) => dispatch(archiveConversation(id))}
          onLoadMore={() => dispatch(loadMoreConversations())}
          onCompose={() => setComposeOpen(true)}
          onViewParticipant={setProfileParticipant}
        />
        <section className="chat-detail-panel">
        <header className="chat-detail-header">
          <Link className="chat-back-button" href="/chat" aria-label="Back to chats" title="Back to chats">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.53 4.47a.75.75 0 0 1 0 1.06L9.06 12l6.47 6.47a.75.75 0 1 1-1.06 1.06l-7-7a.75.75 0 0 1 0-1.06l7-7a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </Link>
          <div className="chat-detail-title">
            <Avatar user={avatarUser} label={title} onClick={avatarUser ? () => setProfileParticipant(avatarUser) : undefined} />
            <div className="chat-detail-title-text">
              <div className="chat-detail-name">{title}</div>
              <div className={`chat-detail-status ${avatarUser?.onlineStatus === "online" ? "presence-online-text" : ""}`}>
                {peerStatus}
              </div>
            </div>
          </div>
        </header>

        <div className="chat-detail-body">
        {nextToken ? (
          <button
            className="load-older-button"
            onClick={() => dispatch(loadOlderMessages(conversationId))}
            disabled={loadingOlderMessages}
          >
            {loadingOlderMessages ? "Loading..." : "Load older messages"}
          </button>
        ) : null}
        {error && error !== "Unauthenticated" ? <GlassAlert tone="danger">{error}</GlassAlert> : null}
        <div className="chat-messages-fill">
        <MessageList
          messages={messages}
          currentUserId={currentUser?.userId}
          participants={selectedConversation?.participants}
          loading={initialMessagesLoading || messagesLoading}
          seenMessageIds={seenMessageIdsByConversationId[conversationId] ?? []}
          peerReceipt={peerReceipt}
          typingNames={typingNames}
          onViewParticipant={setProfileParticipant}
          fullHeight
        />
        </div>
        </div>

        <footer className="chat-detail-composer">
          <MessageInput onSend={onSend} onTypingChange={onTypingChange} />
        </footer>
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
      <ParticipantDetailsModal
        open={Boolean(profileParticipant)}
        participant={profileParticipant}
        onClose={() => setProfileParticipant(undefined)}
      />
      </AppShell>
    </RequireAuth>
  );
}
