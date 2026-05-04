"use client";

import { useEffect, useMemo, useRef } from "react";
import { markConversationDelivered, subscribeToConversationReceipts, subscribeToMessages, subscribeToPresence } from "@/lib/chat/api";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  initializeChat,
  messageReceived,
  presenceUpdated,
  receiptUpdated,
  refreshChatSnapshot,
  setPresence
} from "@/lib/store/chatSlice";

export function ChatRealtimeBridge() {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector((state) => state.chat.conversations);
  const messagesByConversationId = useAppSelector((state) => state.chat.messagesByConversationId);
  const conversationsInitialized = useAppSelector((state) => state.chat.conversationsInitialized);
  const currentUserId = useAppSelector((state) => state.chat.currentUser?.userId);
  const selectedConversationId = useAppSelector((state) => state.chat.selectedConversation?.conversationId);
  const conversationIdsKey = useMemo(() => conversations.map((conversation) => conversation.conversationId).join("|"), [conversations]);
  const peerUserIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          conversations.flatMap((conversation) =>
            conversation.participants
              .map((participant) => participant.userId)
              .filter((userId) => userId !== currentUserId)
          )
        )
      ).join("|"),
    [conversations, currentUserId]
  );
  const unsubscribeByConversationId = useRef<Record<string, () => void>>({});
  const unsubscribeReceiptByConversationId = useRef<Record<string, () => void>>({});
  const unsubscribePresenceByUserId = useRef<Record<string, () => void>>({});
  const deliveredSnapshotConversationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    dispatch(initializeChat()).catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    if (!conversationsInitialized) return;

    const conversationIds = conversationIdsKey ? conversationIdsKey.split("|") : [];
    for (const conversationId of conversationIds) {
      if (unsubscribeByConversationId.current[conversationId]) continue;

      unsubscribeByConversationId.current[conversationId] = subscribeToMessages(conversationId, (message) => {
        dispatch(messageReceived(message));
        if (message.senderId !== currentUserId) {
          markConversationDelivered(message.conversationId)
            .then((receipt) => dispatch(receiptUpdated(receipt)))
            .catch(() => undefined);
        }
      });
    }

    return () => {
      for (const unsubscribe of Object.values(unsubscribeByConversationId.current)) {
        unsubscribe();
      }
      unsubscribeByConversationId.current = {};
    };
  }, [conversationIdsKey, conversationsInitialized, currentUserId, dispatch]);

  useEffect(() => {
    if (!conversationsInitialized || !currentUserId) return;

    for (const conversation of conversations) {
      const hasIncomingMessages = (messagesByConversationId[conversation.conversationId] ?? []).some(
        (message) => message.senderId !== currentUserId
      );
      if (!hasIncomingMessages || deliveredSnapshotConversationIds.current.has(conversation.conversationId)) continue;

      deliveredSnapshotConversationIds.current.add(conversation.conversationId);
      markConversationDelivered(conversation.conversationId)
        .then((receipt) => dispatch(receiptUpdated(receipt)))
        .catch(() => undefined);
    }
  }, [conversations, conversationsInitialized, currentUserId, dispatch, messagesByConversationId]);

  useEffect(() => {
    if (!conversationsInitialized) return;

    if (selectedConversationId && !unsubscribeReceiptByConversationId.current[selectedConversationId]) {
      unsubscribeReceiptByConversationId.current[selectedConversationId] = subscribeToConversationReceipts(
        selectedConversationId,
        (receipt) => {
          dispatch(receiptUpdated(receipt));
        }
      );
    }

    for (const [conversationId, unsubscribe] of Object.entries(unsubscribeReceiptByConversationId.current)) {
      if (conversationId !== selectedConversationId) {
        unsubscribe();
        delete unsubscribeReceiptByConversationId.current[conversationId];
      }
    }

    return () => {
      for (const unsubscribe of Object.values(unsubscribeReceiptByConversationId.current)) {
        unsubscribe();
      }
      unsubscribeReceiptByConversationId.current = {};
    };
  }, [conversationsInitialized, dispatch, selectedConversationId]);

  useEffect(() => {
    if (!conversationsInitialized) return;

    const peerUserIds = peerUserIdsKey ? peerUserIdsKey.split("|") : [];

    for (const userId of peerUserIds) {
      if (unsubscribePresenceByUserId.current[userId]) continue;

      unsubscribePresenceByUserId.current[userId] = subscribeToPresence(userId, (presence) => {
        dispatch(presenceUpdated(presence));
      });
    }

    return () => {
      for (const unsubscribe of Object.values(unsubscribePresenceByUserId.current)) {
        unsubscribe();
      }
      unsubscribePresenceByUserId.current = {};
    };
  }, [conversationsInitialized, dispatch, peerUserIdsKey]);

  useEffect(() => {
    if (!conversationsInitialized || !currentUserId) return;

    dispatch(setPresence(true)).catch(() => undefined);
    const interval = window.setInterval(() => {
      dispatch(setPresence(true)).catch(() => undefined);
    }, 25000);

    const markOffline = () => {
      dispatch(setPresence(false)).catch(() => undefined);
    };

    window.addEventListener("pagehide", markOffline);
    window.addEventListener("beforeunload", markOffline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", markOffline);
      window.removeEventListener("beforeunload", markOffline);
      dispatch(setPresence(false)).catch(() => undefined);
    };
  }, [conversationsInitialized, currentUserId, dispatch]);

  useEffect(() => {
    if (!conversationsInitialized) return;

    const interval = window.setInterval(() => {
      dispatch(refreshChatSnapshot()).catch(() => undefined);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [conversationsInitialized, dispatch]);

  return null;
}
