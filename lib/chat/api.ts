"use client";

import { appsyncClient } from "@/lib/aws/appsync-client";
import { sendMessageMutation, startConversationMutation } from "@/lib/graphql/mutations";
import {
  getConversationQuery,
  getConversationThreadQuery,
  listConversationsQuery,
  listMessagesQuery
} from "@/lib/graphql/queries";
import { onMessageSentSubscription } from "@/lib/graphql/subscriptions";
import { Conversation, ConversationThread, Message, Paginated } from "@/lib/types/chat";

export async function listConversations(limit = 20, nextToken?: string): Promise<Paginated<Conversation>> {
  const result = (await appsyncClient.graphql({
    query: listConversationsQuery,
    variables: { limit, nextToken }
  })) as { data: { listConversations: Paginated<Conversation> } };
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
  const result = (await appsyncClient.graphql({
    query: getConversationQuery,
    variables: { conversationId }
  })) as { data: { getConversation: Conversation } };
  return result.data.getConversation;
}

export async function getConversationThread(
  conversationId: string,
  messagesLimit = 30,
  messagesNextToken?: string
): Promise<ConversationThread> {
  const result = (await appsyncClient.graphql({
    query: getConversationThreadQuery,
    variables: { conversationId, messagesLimit, messagesNextToken }
  })) as { data: { getConversationThread: ConversationThread } };
  return result.data.getConversationThread;
}

export async function startConversation(otherUserEmail: string): Promise<Conversation> {
  const result = (await appsyncClient.graphql({
    query: startConversationMutation,
    variables: { otherUserId: otherUserEmail }
  })) as { data: { startConversation: Conversation } };
  return result.data.startConversation;
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const result = (await appsyncClient.graphql({
    query: sendMessageMutation,
    variables: { conversationId, content }
  })) as { data: { sendMessage: Message } };
  return result.data.sendMessage;
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
