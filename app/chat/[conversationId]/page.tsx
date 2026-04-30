"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { listMessages, sendMessage, subscribeToMessages } from "@/lib/chat/api";
import { Message } from "@/lib/types/chat";

const dedupeMessages = (messages: Message[]) => Array.from(new Map(messages.map((message) => [message.messageId, message])).values());

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = useMemo(() => params.conversationId, [params.conversationId]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const run = async () => {
      try {
        const session = await fetchAuthSession();
        if (!session.tokens) {
          window.location.href = "/login";
          return;
        }

        const user = await getCurrentUser();
        if (cancelled) return;
        setUserId(user.userId);
      } catch {
        window.location.href = "/login";
        return;
      }

      try {
        const data = await listMessages(conversationId);
        if (cancelled) return;
        setMessages(dedupeMessages(data.items.reverse()));
        setNextToken(data.nextToken ?? null);

        unsubscribe = subscribeToMessages(conversationId, (incoming) => {
          setMessages((prev) => dedupeMessages([...prev, incoming]));
        });
        if (cancelled) unsubscribe();
      } catch (apiError) {
        console.error("Failed to load messages", apiError);
        if (cancelled) return;
        setError("You are signed in, but this conversation could not be loaded.");
      }
    };

    run();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [conversationId]);

  const onSend = async (content: string) => {
    try {
      const sent = await sendMessage(conversationId, content);
      setMessages((prev) => dedupeMessages([...prev, sent]));
      setError("");
    } catch (apiError) {
      console.error("Failed to send message", apiError);
      setError("Could not send that message.");
    }
  };

  const loadOlder = async () => {
    if (!nextToken) return;
    try {
      const data = await listMessages(conversationId, 30, nextToken);
      setMessages((prev) => dedupeMessages([...data.items.reverse(), ...prev]));
      setNextToken(data.nextToken ?? null);
    } catch (apiError) {
      console.error("Failed to load older messages", apiError);
      setError("Could not load older messages.");
    }
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
      {error ? <p style={{ color: "#fca5a5", marginTop: 0 }}>{error}</p> : null}
      <MessageList messages={messages} currentUserId={userId} />
      <div style={{ marginTop: 12 }}>
        <MessageInput onSend={onSend} />
      </div>
    </main>
  );
}
