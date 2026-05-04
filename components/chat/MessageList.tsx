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
      <div className="message-list-loading">
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
    <div className={`message-list-shell ${fullHeight ? "message-list-shell-full" : ""}`}>
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollButton}
        className={`message-list-scroll ${fullHeight ? "message-list-scroll-full" : ""}`}
      >
        {!messages.length ? <p className="message-list-empty">No messages yet.</p> : null}
        {messages.map((message) => {
          const mine = currentUserId === message.senderId;
          const seen = seenMessageIds.includes(message.messageId);
          const sender = participantById.get(message.senderId);
          const senderName = mine ? "You" : sender?.displayName ?? "Chat partner";

          return (
            <div
              key={message.messageId}
              className={`message-row ${mine ? "message-row-mine" : ""}`}
            >
              {!mine ? <Avatar user={sender} label={senderName} size={32} /> : null}
              <div
                className={`message-bubble ${mine ? "message-bubble-mine" : ""}`}
              >
                {!mine ? <div className="message-sender">{senderName}</div> : null}
                <div className="message-content">{message.content}</div>
                <div className="message-meta">
                  <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                  {mine ? (
                    <span
                      aria-label={seen || message.deliveryStatus === "seen" ? "Seen" : message.deliveryStatus === "sending" ? "Sending" : message.deliveryStatus === "failed" ? "Failed" : "Sent"}
                      title={seen || message.deliveryStatus === "seen" ? "Seen" : message.deliveryStatus === "sending" ? "Sending" : message.deliveryStatus === "failed" ? "Failed" : "Sent"}
                      style={{
                        color: message.deliveryStatus === "failed" ? "#dc2626" : message.deliveryStatus === "sending" ? "#64748b" : "#2563eb",
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
          className={`message-scroll-button ${newMessagesCount ? "message-scroll-button-wide" : ""}`}
        >
          {newMessagesCount ? <span>{newMessagesCount === 1 ? "New message" : `${newMessagesCount} new messages`}</span> : null}
          <span aria-hidden="true" className="message-scroll-arrow">
            ↓
          </span>
        </button>
      ) : null}
    </div>
  );
}
