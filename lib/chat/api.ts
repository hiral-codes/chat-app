"use client";

import { appsyncClient } from "@/lib/aws/appsync-client";
import {
  markConversationDeliveredMutation,
  markConversationReadMutation,
  sendMessageMutation,
  startConversationLegacyMutation,
  startConversationMutation,
  updatePresenceMutation,
  updateTypingMutation
} from "@/lib/graphql/mutations";
import {
  getConversationLegacyQuery,
  getConversationQuery,
  getConversationThreadLegacyQuery,
  getConversationThreadQuery,
  listConversationsLegacyQuery,
  listConversationsQuery,
  listMessagesQuery
} from "@/lib/graphql/queries";
import {
  onConversationReceiptUpdatedSubscription,
  onMessageSentSubscription,
  onPresenceChangedSubscription,
  onTypingChangedSubscription
} from "@/lib/graphql/subscriptions";
import { Conversation, ConversationReceipt, ConversationThread, Message, Paginated, TypingStatus, UserPresence } from "@/lib/types/chat";

const errorMessages = (error: unknown): string[] => {
  if (error instanceof Error) return [error.message];
  if (!error || typeof error !== "object") return [];

  const messages: string[] = [];
  const maybeError = error as { message?: unknown; errors?: unknown };
  if (typeof maybeError.message === "string") messages.push(maybeError.message);
  if (Array.isArray(maybeError.errors)) {
    for (const item of maybeError.errors) {
      if (item && typeof item === "object" && typeof (item as { message?: unknown }).message === "string") {
        messages.push((item as { message: string }).message);
      }
    }
  }

  return messages;
};

const isSchemaFieldUndefinedError = (error: unknown) =>
  errorMessages(error).some((message) => message.includes("Validation error of type FieldUndefined"));

let receiptSubscriptionsUnavailable = false;
let presenceSubscriptionsUnavailable = false;
let typingSubscriptionsUnavailable = false;
const noop = () => undefined;

export async function listConversations(limit = 20, nextToken?: string): Promise<Paginated<Conversation>> {
  const variables = { limit, nextToken };
  let result: { data: { listConversations: Paginated<Conversation> } };

  try {
    result = (await appsyncClient.graphql({
      query: listConversationsQuery,
      variables
    })) as { data: { listConversations: Paginated<Conversation> } };
  } catch (error) {
    if (!isSchemaFieldUndefinedError(error)) throw error;
    result = (await appsyncClient.graphql({
      query: listConversationsLegacyQuery,
      variables
    })) as { data: { listConversations: Paginated<Conversation> } };
  }

  return result.data.listConversations;
}

export async function listAllConversations(): Promise<Conversation[]> {
  const conversations: Conversation[] = [];
  let nextToken: string | undefined;

  do {
    const page = await listConversations(50, nextToken);
    conversations.push(...page.items);
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);

  return conversations;
}

export async function listMessages(conversationId: string, limit = 30, nextToken?: string): Promise<Paginated<Message>> {
  const result = (await appsyncClient.graphql({
    query: listMessagesQuery,
    variables: { conversationId, limit, nextToken }
  })) as { data: { listMessages: Paginated<Message> } };
  return result.data.listMessages;
}

export async function listAllMessages(conversationId: string): Promise<Message[]> {
  const messages: Message[] = [];
  let nextToken: string | undefined;

  do {
    const page = await listMessages(conversationId, 100, nextToken);
    messages.push(...page.items);
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);

  return messages;
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  let result: { data: { getConversation: Conversation } };

  try {
    result = (await appsyncClient.graphql({
      query: getConversationQuery,
      variables: { conversationId }
    })) as { data: { getConversation: Conversation } };
  } catch (error) {
    if (!isSchemaFieldUndefinedError(error)) throw error;
    result = (await appsyncClient.graphql({
      query: getConversationLegacyQuery,
      variables: { conversationId }
    })) as { data: { getConversation: Conversation } };
  }

  return result.data.getConversation;
}

export async function getConversationThread(
  conversationId: string,
  messagesLimit = 30,
  messagesNextToken?: string
): Promise<ConversationThread> {
  const variables = { conversationId, messagesLimit, messagesNextToken };
  let result: { data: { getConversationThread: ConversationThread } };

  try {
    result = (await appsyncClient.graphql({
      query: getConversationThreadQuery,
      variables
    })) as { data: { getConversationThread: ConversationThread } };
  } catch (error) {
    if (!isSchemaFieldUndefinedError(error)) throw error;
    result = (await appsyncClient.graphql({
      query: getConversationThreadLegacyQuery,
      variables
    })) as { data: { getConversationThread: ConversationThread } };
  }

  return result.data.getConversationThread;
}

export async function startConversation(otherUserEmail: string): Promise<Conversation> {
  const variables = { otherUserId: otherUserEmail };
  let result: { data: { startConversation: Conversation } };

  try {
    result = (await appsyncClient.graphql({
      query: startConversationMutation,
      variables
    })) as { data: { startConversation: Conversation } };
  } catch (error) {
    if (!isSchemaFieldUndefinedError(error)) throw error;
    result = (await appsyncClient.graphql({
      query: startConversationLegacyMutation,
      variables
    })) as { data: { startConversation: Conversation } };
  }

  return result.data.startConversation;
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const result = (await appsyncClient.graphql({
    query: sendMessageMutation,
    variables: { conversationId, content }
  })) as { data: { sendMessage: Message } };
  return result.data.sendMessage;
}

export async function markConversationDelivered(conversationId: string): Promise<ConversationReceipt> {
  const result = (await appsyncClient.graphql({
    query: markConversationDeliveredMutation,
    variables: { conversationId }
  })) as { data: { markConversationDelivered: ConversationReceipt } };
  return result.data.markConversationDelivered;
}

export async function markConversationRead(conversationId: string): Promise<ConversationReceipt> {
  const result = (await appsyncClient.graphql({
    query: markConversationReadMutation,
    variables: { conversationId }
  })) as { data: { markConversationRead: ConversationReceipt } };
  return result.data.markConversationRead;
}

export async function updatePresence(online: boolean): Promise<UserPresence> {
  const result = (await appsyncClient.graphql({
    query: updatePresenceMutation,
    variables: { online }
  })) as { data: { updatePresence: UserPresence } };
  return result.data.updatePresence;
}

export async function updateTyping(conversationId: string, isTyping: boolean): Promise<TypingStatus> {
  const result = (await appsyncClient.graphql({
    query: updateTypingMutation,
    variables: { conversationId, isTyping }
  })) as { data: { updateTyping: TypingStatus } };
  return result.data.updateTyping;
}

export function subscribeToMessages(conversationId: string, onMessage: (message: Message) => void) {
  const sub = (
    appsyncClient.graphql({
      query: onMessageSentSubscription,
      variables: { conversationId }
    }) as any
  ).subscribe({
      next: ({ data }: any) => {
        const message = data?.onMessageSent as Message | undefined;
        if (message) onMessage(message);
      },
      error: (error: unknown) => {
        console.error("subscription error", error);
      }
    });

  return () => sub.unsubscribe();
}

export function subscribeToConversationReceipts(
  conversationId: string,
  onReceipt: (receipt: ConversationReceipt) => void
) {
  if (receiptSubscriptionsUnavailable) return noop;

  const sub = (
    appsyncClient.graphql({
      query: onConversationReceiptUpdatedSubscription,
      variables: { conversationId }
    }) as any
  ).subscribe({
      next: ({ data }: any) => {
        const receipt = data?.onConversationReceiptUpdated as ConversationReceipt | undefined;
        if (receipt) onReceipt(receipt);
      },
      error: (error: unknown) => {
        if (isSchemaFieldUndefinedError(error)) {
          receiptSubscriptionsUnavailable = true;
          return;
        }
        console.error("receipt subscription error", error);
      }
    });

  return () => sub.unsubscribe();
}

export function subscribeToPresence(userId: string, onPresence: (presence: UserPresence) => void) {
  if (presenceSubscriptionsUnavailable) return noop;

  const sub = (
    appsyncClient.graphql({
      query: onPresenceChangedSubscription,
      variables: { userId }
    }) as any
  ).subscribe({
      next: ({ data }: any) => {
        const presence = data?.onPresenceChanged as UserPresence | undefined;
        if (presence) onPresence(presence);
      },
      error: (error: unknown) => {
        if (isSchemaFieldUndefinedError(error)) {
          presenceSubscriptionsUnavailable = true;
          return;
        }
        console.error("presence subscription error", error);
      }
    });

  return () => sub.unsubscribe();
}

export function subscribeToTyping(conversationId: string, onTyping: (typing: TypingStatus) => void) {
  if (typingSubscriptionsUnavailable) return noop;

  const sub = (
    appsyncClient.graphql({
      query: onTypingChangedSubscription,
      variables: { conversationId }
    }) as any
  ).subscribe({
      next: ({ data }: any) => {
        const typing = data?.onTypingChanged as TypingStatus | undefined;
        if (typing) onTyping(typing);
      },
      error: (error: unknown) => {
        if (isSchemaFieldUndefinedError(error)) {
          typingSubscriptionsUnavailable = true;
          return;
        }
        console.error("typing subscription error", error);
      }
    });

  return () => sub.unsubscribe();
}
