"use client";

import { useEffect, useRef } from "react";
import { subscribeToMessages } from "@/lib/chat/api";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { initializeChat, messageReceived, refreshChatSnapshot } from "@/lib/store/chatSlice";

export function ChatRealtimeBridge() {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector((state) => state.chat.conversations);
  const conversationsInitialized = useAppSelector((state) => state.chat.conversationsInitialized);
  const unsubscribeByConversationId = useRef<Record<string, () => void>>({});

  useEffect(() => {
    dispatch(initializeChat()).catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    if (!conversationsInitialized) return;

    for (const conversation of conversations) {
      if (unsubscribeByConversationId.current[conversation.conversationId]) continue;

      unsubscribeByConversationId.current[conversation.conversationId] = subscribeToMessages(conversation.conversationId, (message) => {
        dispatch(messageReceived(message));
      });
    }

    return () => {
      for (const unsubscribe of Object.values(unsubscribeByConversationId.current)) {
        unsubscribe();
      }
      unsubscribeByConversationId.current = {};
    };
  }, [conversations, conversationsInitialized, dispatch]);

  useEffect(() => {
    if (!conversationsInitialized) return;

    const interval = window.setInterval(() => {
      dispatch(refreshChatSnapshot()).catch(() => undefined);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [conversationsInitialized, dispatch]);

  return null;
}
