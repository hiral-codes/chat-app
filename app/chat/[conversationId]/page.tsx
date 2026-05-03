"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Avatar } from "@/components/chat/Avatar";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";
import { subscribeToMessages } from "@/lib/chat/api";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  initializeChat,
  loadOlderMessages,
  messageReceived,
  openConversation,
  sendChatMessage
} from "@/lib/store/chatSlice";

ensureAmplifyConfigured();

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = useMemo(() => params.conversationId, [params.conversationId]);
  const [initialMessagesLoading, setInitialMessagesLoading] = useState(true);
  const dispatch = useAppDispatch();
  const {
    currentUser,
    selectedConversation,
    messagesByConversationId,
    messageNextTokens,
    messagesLoading,
    loadingOlderMessages,
    sendingMessage,
    error
  } = useAppSelector((state) => state.chat);

  const messages = messagesByConversationId[conversationId] ?? [];
  const nextToken = messageNextTokens[conversationId];
  const visibleParticipants = selectedConversation?.participants.filter((participant) => participant.userId !== currentUser?.userId) ?? [];
  const titleParticipants = visibleParticipants.length ? visibleParticipants : selectedConversation?.participants ?? [];
  const chatPartnerNames = visibleParticipants
    .map((participant) => participant.displayName)
    .join(", ");
  const title = chatPartnerNames || selectedConversation?.participants.map((participant) => participant.displayName).join(", ") || "Chat";
  const avatarUser = titleParticipants[0];

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
    const unsubscribe = subscribeToMessages(conversationId, (message) => {
      dispatch(messageReceived(message));
    });

    return unsubscribe;
  }, [conversationId, dispatch]);

  const onSend = async (content: string) => {
    try {
      await dispatch(sendChatMessage({ conversationId, content })).unwrap();
    } catch {
      return;
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: "30px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
        <Link href="/chat" style={{ color: "#bfdbfe" }}>
          Back to chats
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ textAlign: "right", minWidth: 0 }}>
            <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Conversation</div>
          </div>
          <Avatar user={avatarUser} label={title} />
        </div>
      </div>

      {nextToken ? (
        <button
          onClick={() => dispatch(loadOlderMessages(conversationId))}
          disabled={loadingOlderMessages}
          style={{ marginBottom: 12, borderRadius: 8, padding: "8px 12px" }}
        >
          {loadingOlderMessages ? "Loading..." : "Load older messages"}
        </button>
      ) : null}
      {error && error !== "Unauthenticated" ? <p style={{ color: "#fca5a5", marginTop: 0 }}>{error}</p> : null}
      <MessageList
        messages={messages}
        currentUserId={currentUser?.userId}
        participants={selectedConversation?.participants}
        loading={initialMessagesLoading || messagesLoading}
      />
      <div style={{ marginTop: 12 }}>
        <MessageInput onSend={onSend} sending={sendingMessage} />
      </div>
    </main>
  );
}
