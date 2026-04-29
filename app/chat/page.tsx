"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";
import { ConversationList } from "@/components/chat/ConversationList";
import { listConversations, startConversation } from "@/lib/chat/api";
import { Conversation } from "@/lib/types/chat";

export default function ChatInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [peerUserId, setPeerUserId] = useState("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      const session = await fetchAuthSession();
      if (!session.tokens) {
        window.location.href = "/login";
        return;
      }
      const user = await getCurrentUser();
      setUserId(user.userId);
      const data = await listConversations();
      setConversations(data.items);
      setNextToken(data.nextToken ?? null);
    };
    run().catch(() => (window.location.href = "/login"));
  }, []);

  const loadMore = async () => {
    if (!nextToken) return;
    const data = await listConversations(20, nextToken);
    setConversations((prev) => [...prev, ...data.items]);
    setNextToken(data.nextToken ?? null);
  };

  const createConversation = async () => {
    if (!peerUserId.trim()) return;
    const conversation = await startConversation(peerUserId.trim());
    setConversations((prev) => [conversation, ...prev.filter((c) => c.conversationId !== conversation.conversationId)]);
    setPeerUserId("");
  };

  return (
    <main style={{ maxWidth: 880, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Chats</h1>
        <button onClick={() => signOut()} style={{ border: "1px solid #334155", background: "transparent", color: "#e2e8f0", borderRadius: 8 }}>
          Logout
        </button>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          value={peerUserId}
          onChange={(e) => setPeerUserId(e.target.value)}
          placeholder="Enter other user id to start 1:1 chat"
          style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}
        />
        <button onClick={createConversation} style={{ padding: "0 12px", border: 0, borderRadius: 8, background: "#2563eb", color: "white" }}>
          Start
        </button>
      </div>

      <ConversationList conversations={conversations} />
      {nextToken ? (
        <button onClick={loadMore} style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 8 }}>
          Load More
        </button>
      ) : null}

      <p style={{ color: "#64748b", marginTop: 20 }}>
        Signed in as <code>{userId}</code>. Open a thread to send messages.
      </p>
      <Link href="/chat" />
    </main>
  );
}
