"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import { ConversationList } from "@/components/chat/ConversationList";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { createConversationByEmail, initializeChat, loadMoreConversations } from "@/lib/store/chatSlice";

ensureAmplifyConfigured();

export default function ChatInboxPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [peerEmail, setPeerEmail] = useState("");
  const {
    conversations,
    currentUser,
    nextConversationToken,
    conversationsLoading,
    creatingConversation,
    loadingMoreConversations,
    error
  } = useAppSelector((state) => state.chat);

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
      router.push(`/chat/${conversation.conversationId}`);
    } catch {
      return;
    }
  };

  return (
    <main style={{ maxWidth: 880, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Chats</h1>
          {currentUser ? <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>Signed in as {currentUser.displayName}</p> : null}
        </div>
        <button onClick={() => signOut()} style={{ border: "1px solid #334155", background: "transparent", color: "#e2e8f0", borderRadius: 8, padding: "9px 12px" }}>
          Logout
        </button>
      </div>

      <form onSubmit={createConversation} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          value={peerEmail}
          onChange={(event) => setPeerEmail(event.target.value)}
          placeholder="Enter email address to start a chat"
          type="email"
          disabled={creatingConversation}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}
        />
        <button
          type="submit"
          disabled={creatingConversation}
          style={{ padding: "0 14px", border: 0, borderRadius: 8, background: "#2563eb", color: "white", minWidth: 96 }}
        >
          {creatingConversation ? "Starting..." : "Start"}
        </button>
      </form>

      {error && error !== "Unauthenticated" ? <p style={{ color: "#fca5a5", marginTop: 0 }}>{error}</p> : null}

      <ConversationList conversations={conversations} currentUserId={currentUser?.userId} loading={conversationsLoading} />
      {nextConversationToken ? (
        <button
          onClick={() => dispatch(loadMoreConversations())}
          disabled={loadingMoreConversations}
          style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 8 }}
        >
          {loadingMoreConversations ? "Loading..." : "Load More"}
        </button>
      ) : null}

      <Link href="/chat" />
    </main>
  );
}
