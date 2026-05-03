"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/chat/Avatar";
import { Message, User } from "@/lib/types/chat";

type Props = {
  messages: Message[];
  currentUserId?: string;
  participants?: User[];
  loading?: boolean;
  fullHeight?: boolean;
  seenMessageIds?: string[];
};

const bottomThreshold = 96;

const ticksFor = (message: Message) => {
  if (message.deliveryStatus === "failed") return "!";
  if (message.deliveryStatus === "sending") return "✓";
  return "✓✓";
};

function SeenIcon() {
  return (
    <svg className="message-seen-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5.25c5.27 0 8.32 4.48 9.23 6.05.25.43.25.97 0 1.4-.91 1.57-3.96 6.05-9.23 6.05S3.68 14.27 2.77 12.7a1.39 1.39 0 0 1 0-1.4C3.68 9.73 6.73 5.25 12 5.25Zm0 1.5c-4.36 0-7 3.64-7.92 5.25.92 1.61 3.56 5.25 7.92 5.25s7-3.64 7.92-5.25C19 10.39 16.36 6.75 12 6.75Zm0 2.25a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </svg>
  );
}

export function MessageList({ messages, currentUserId, participants = [], loading = false, fullHeight = false, seenMessageIds = [] }: Props) {
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
      <div style={{ display: "grid", gap: 10, padding: "8px 4px", alignContent: "start", minHeight: fullHeight ? 0 : undefined }}>
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
    <div style={{ position: "relative", minHeight: fullHeight ? 0 : undefined, height: fullHeight ? "100%" : undefined }}>
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollButton}
        style={{
          display: "grid",
          gap: 8,
          height: fullHeight ? "100%" : undefined,
          maxHeight: fullHeight ? "none" : "60vh",
          overflowY: "auto",
          padding: "8px 4px 18px",
          scrollBehavior: "smooth"
        }}
      >
        {!messages.length ? <p style={{ color: "#64748b", textAlign: "center" }}>No messages yet.</p> : null}
        {messages.map((message) => {
          const mine = currentUserId === message.senderId;
          const seen = seenMessageIds.includes(message.messageId);
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
                  background: mine ? "linear-gradient(135deg, #0ea5e9, #2563eb)" : "rgba(255, 255, 255, 0.76)",
                  color: mine ? "#ffffff" : "#172033",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: mine ? "1px solid rgba(37, 99, 235, 0.2)" : "1px solid rgba(148, 163, 184, 0.22)",
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.1)"
                }}
              >
                <div style={{ fontSize: 12, color: mine ? "#dbeafe" : "#64748b", marginBottom: 4 }}>{senderName}</div>
                <div>{message.content}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                    fontSize: 12,
                    color: mine ? "#dbeafe" : "#64748b",
                    marginTop: 4
                  }}
                >
                  <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                  {mine ? (
                    <span
                      aria-label={seen || message.deliveryStatus === "seen" ? "Seen" : message.deliveryStatus === "sending" ? "Sending" : message.deliveryStatus === "failed" ? "Failed" : "Sent"}
                      title={seen || message.deliveryStatus === "seen" ? "Seen" : message.deliveryStatus === "sending" ? "Sending" : message.deliveryStatus === "failed" ? "Failed" : "Sent"}
                      style={{
                        color: message.deliveryStatus === "failed" ? "#fecaca" : message.deliveryStatus === "sending" ? "#dbeafe" : "#bfdbfe",
                        fontWeight: 700,
                        letterSpacing: 0
                      }}
                    >
                      {seen || message.deliveryStatus === "seen" ? <SeenIcon /> : ticksFor(message)}
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
            border: "1px solid rgba(148, 163, 184, 0.24)",
            background: "rgba(255, 255, 255, 0.86)",
            color: "#172033",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: newMessagesCount ? "0 14px" : 0,
            boxShadow: "0 14px 35px rgba(15, 23, 42, 0.14)",
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
