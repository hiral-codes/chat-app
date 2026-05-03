"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/chat/Avatar";
import { Message, User } from "@/lib/types/chat";

type Props = {
  messages: Message[];
  currentUserId?: string;
  participants?: User[];
  loading?: boolean;
};

const bottomThreshold = 96;

const ticksFor = (message: Message) => {
  if (message.deliveryStatus === "failed") return "!";
  if (message.deliveryStatus === "sending") return "✓";
  return "✓✓";
};

export function MessageList({ messages, currentUserId, participants = [], loading = false }: Props) {
  const participantById = new Map(participants.map((participant) => [participant.userId, participant]));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const previousLatestMessageIdRef = useRef<string | undefined>(undefined);
  const wasNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    return container.scrollHeight - container.scrollTop - container.clientHeight < bottomThreshold;
  }, []);

  const updateScrollButton = useCallback(() => {
    const nearBottom = isNearBottom();
    wasNearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
    if (nearBottom) setNewMessagesCount(0);
  }, [isNearBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });
    wasNearBottomRef.current = true;
    setShowScrollButton(false);
    setNewMessagesCount(0);
  }, []);

  useEffect(() => {
    if (loading) return;

    const previousCount = previousMessageCountRef.current;
    const previousLatestMessageId = previousLatestMessageIdRef.current;
    const latestMessage = messages[messages.length - 1];
    const latestMessageChanged = Boolean(latestMessage && latestMessage.messageId !== previousLatestMessageId);
    const hasNewLatestMessage = messages.length > previousCount && latestMessageChanged;
    const initialLoad = previousCount === 0 && messages.length > 0;
    const sentByCurrentUser = latestMessage?.senderId === currentUserId;

    previousMessageCountRef.current = messages.length;
    previousLatestMessageIdRef.current = latestMessage?.messageId;

    if (initialLoad || (hasNewLatestMessage && (sentByCurrentUser || wasNearBottomRef.current))) {
      requestAnimationFrame(() => scrollToBottom(initialLoad ? "auto" : "smooth"));
      return;
    }

    if (hasNewLatestMessage) {
      requestAnimationFrame(() => {
        setShowScrollButton(true);
        if (!sentByCurrentUser) {
          setNewMessagesCount((count) => count + 1);
        }
      });
    }
  }, [currentUserId, loading, messages, scrollToBottom]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 10, padding: "8px 4px" }}>
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="soft-skeleton"
            style={{
              height: item % 2 ? 62 : 48,
              width: item % 2 ? "68%" : "52%",
              marginLeft: item % 2 ? "auto" : 0,
              borderRadius: 8
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollButton}
        style={{
          display: "grid",
          gap: 8,
          maxHeight: "60vh",
          overflowY: "auto",
          padding: "8px 4px 18px",
          scrollBehavior: "smooth"
        }}
      >
        {!messages.length ? <p style={{ color: "#94a3b8", textAlign: "center" }}>No messages yet.</p> : null}
        {messages.map((message) => {
          const mine = currentUserId === message.senderId;
          const sender = participantById.get(message.senderId);
          const senderName = mine ? "You" : sender?.displayName ?? "Chat partner";

          return (
            <div
              key={message.messageId}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                justifyContent: mine ? "flex-end" : "flex-start"
              }}
            >
              {!mine ? <Avatar user={sender} label={senderName} size={32} /> : null}
              <div
                style={{
                  maxWidth: "75%",
                  background: mine ? "#1d4ed8" : "#1f2937",
                  padding: "10px 12px",
                  borderRadius: 8,
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.16)"
                }}
              >
                <div style={{ fontSize: 12, color: mine ? "#bfdbfe" : "#94a3b8", marginBottom: 4 }}>{senderName}</div>
                <div>{message.content}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                    fontSize: 12,
                    color: "#cbd5e1",
                    marginTop: 4
                  }}
                >
                  <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                  {mine ? (
                    <span
                      aria-label={message.deliveryStatus === "sending" ? "Sending" : message.deliveryStatus === "failed" ? "Failed" : "Sent"}
                      title={message.deliveryStatus === "sending" ? "Sending" : message.deliveryStatus === "failed" ? "Failed" : "Sent"}
                      style={{
                        color: message.deliveryStatus === "failed" ? "#fca5a5" : message.deliveryStatus === "sending" ? "#bfdbfe" : "#93c5fd",
                        fontWeight: 700,
                        letterSpacing: 0
                      }}
                    >
                      {ticksFor(message)}
                    </span>
                  ) : null}
                </div>
              </div>
              {mine ? <Avatar user={sender} label="You" size={32} /> : null}
            </div>
          );
        })}
      </div>
      {showScrollButton ? (
        <button
          type="button"
          aria-label={newMessagesCount ? "Scroll to new messages" : "Scroll to latest message"}
          onClick={() => scrollToBottom()}
          style={{
            position: "absolute",
            right: 14,
            bottom: 14,
            minWidth: newMessagesCount ? 142 : 42,
            width: newMessagesCount ? "auto" : 42,
            height: 42,
            borderRadius: 999,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#e2e8f0",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: newMessagesCount ? "0 14px" : 0,
            boxShadow: "0 14px 35px rgba(0, 0, 0, 0.35)",
            cursor: "pointer",
            fontSize: newMessagesCount ? 13 : 22,
            fontWeight: 700,
            lineHeight: 1,
            transition: "min-width 160ms ease, padding 160ms ease"
          }}
        >
          {newMessagesCount ? <span>{newMessagesCount === 1 ? "New message" : `${newMessagesCount} new messages`}</span> : null}
          <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
            ↓
          </span>
        </button>
      ) : null}
    </div>
  );
}
