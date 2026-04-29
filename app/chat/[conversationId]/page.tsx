"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { listMessages, sendMessage, subscribeToMessages } from "@/lib/chat/api";
import { Message } from "@/lib/types/chat";

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = useMemo(() => params.conversationId, [params.conversationId]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    const run = async () => {
      const user = await getCurrentUser();
      setUserId(user.userId);
      const data = await listMessages(conversationId);
      setMessages(data.items.reverse());
      setNextToken(data.nextToken ?? null);
    };
    run().catch(() => (window.location.href = "/login"));

    const unsubscribe = subscribeToMessages(conversationId, (incoming) => {
      setMessages((prev) => (prev.some((m) => m.messageId === incoming.messageId) ? prev : [...prev, incoming]));
    });
    return unsubscribe;
  }, [conversationId]);

  const onSend = async (content: string) => {
    const sent = await sendMessage(conversationId, content);
    setMessages((prev) => (prev.some((m) => m.messageId === sent.messageId) ? prev : [...prev, sent]));
  };

  const loadOlder = async () => {
    if (!nextToken) return;
    const data = await listMessages(conversationId, 30, nextToken);
    setMessages((prev) => [...data.items.reverse(), ...prev]);
    setNextToken(data.nextToken ?? null);
  };

  return (
    <main style={{ maxWidth: 900, margin: "30px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Link href="/chat">Back to chats</Link>
        <span style={{ color: "#94a3b8" }}>Conversation: {conversationId}</span>
      </div>
      {nextToken ? (
        <button onClick={loadOlder} style={{ marginBottom: 12 }}>
          Load older messages
        </button>
      ) : null}
      <MessageList messages={messages} currentUserId={userId} />
      <div style={{ marginTop: 12 }}>
        <MessageInput onSend={onSend} />
      </div>
    </main>
  );
}
