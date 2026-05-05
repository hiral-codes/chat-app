import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import {
  getConversationThread,
  listAllConversations,
  listAllMessages,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  startConversation,
  updatePresence
} from "@/lib/chat/api";
import { Conversation, ConversationReceipt, Message, TypingStatus, User, UserPresence } from "@/lib/types/chat";

type ChatState = {
  currentUser?: User;
  conversations: Conversation[];
  archivedConversationIds: string[];
  unreadCountsByConversationId: Record<string, number>;
  seenMessageIdsByConversationId: Record<string, string[]>;
  receiptsByConversationId: Record<string, Record<string, ConversationReceipt>>;
  userPresenceById: Record<string, UserPresence>;
  typingByConversationId: Record<string, Record<string, TypingStatus>>;
  nextConversationToken: string | null;
  selectedConversation?: Conversation;
  messagesByConversationId: Record<string, Message[]>;
  optimisticMessageIdsByRequestId: Record<string, string>;
  messageNextTokens: Record<string, string | null>;
  messageThreadsInitialized: Record<string, boolean>;
  openingConversationId?: string;
  conversationsInitialized: boolean;
  conversationsLoading: boolean;
  messagesLoading: boolean;
  creatingConversation: boolean;
  loadingMoreConversations: boolean;
  loadingOlderMessages: boolean;
  sendingMessage: boolean;
  error: string;
};

const initialState: ChatState = {
  conversations: [],
  archivedConversationIds: [],
  unreadCountsByConversationId: {},
  seenMessageIdsByConversationId: {},
  receiptsByConversationId: {},
  userPresenceById: {},
  typingByConversationId: {},
  nextConversationToken: null,
  messagesByConversationId: {},
  optimisticMessageIdsByRequestId: {},
  messageNextTokens: {},
  messageThreadsInitialized: {},
  conversationsInitialized: false,
  conversationsLoading: false,
  messagesLoading: false,
  creatingConversation: false,
  loadingMoreConversations: false,
  loadingOlderMessages: false,
  sendingMessage: false,
  error: ""
};

const dedupeConversations = (conversations: Conversation[]) =>
  Array.from(new Map(conversations.map((conversation) => [conversation.conversationId, conversation])).values());

const upsertConversation = (conversations: Conversation[], nextConversation: Conversation, moveToTop = false) => {
  const existing = conversations.find((conversation) => conversation.conversationId === nextConversation.conversationId);
  const merged = existing ? { ...existing, ...nextConversation } : nextConversation;
  const withoutCurrent = conversations.filter((conversation) => conversation.conversationId !== nextConversation.conversationId);
  if (moveToTop) return [merged, ...withoutCurrent];
  return existing
    ? conversations.map((conversation) => (conversation.conversationId === nextConversation.conversationId ? merged : conversation))
    : [...conversations, merged];
};

const updateConversationFromMessage = (conversation: Conversation, message: Message) => ({
  ...conversation,
  lastMessagePreview: message.content,
  lastMessageAt: message.createdAt
});

const receiptsByConversation = (conversations: Conversation[]) =>
  Object.fromEntries(
    conversations.map((conversation) => [
      conversation.conversationId,
      Object.fromEntries((conversation.receipts ?? []).map((receipt) => [receipt.userId, receipt]))
    ])
  );

const presenceByUser = (currentUser: User | undefined, conversations: Conversation[]) => {
  const entries = conversations.flatMap((conversation) =>
    conversation.participants.map((participant) => [
      participant.userId,
      {
        userId: participant.userId,
        onlineStatus: participant.onlineStatus ?? "offline",
        lastSeenAt: participant.lastSeenAt ?? null,
        lastHeartbeatAt: participant.lastHeartbeatAt ?? null
      } satisfies UserPresence
    ] as const)
  );

  if (currentUser) {
    entries.push([
      currentUser.userId,
      {
        userId: currentUser.userId,
        onlineStatus: currentUser.onlineStatus ?? "offline",
        lastSeenAt: currentUser.lastSeenAt ?? null,
        lastHeartbeatAt: currentUser.lastHeartbeatAt ?? null
      }
    ]);
  }

  return Object.fromEntries(entries);
};

const dedupeMessages = (messages: Message[]) =>
  Array.from(new Map(messages.map((message) => [message.messageId, message])).values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

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

const isConversationNotFoundError = (error: unknown) =>
  errorMessages(error).some((message) => message.includes("Conversation not found"));

const loadMessageEntriesForConversations = async (conversations: Conversation[]) => {
  const results = await Promise.all(
    conversations.map(async (conversation) => {
      try {
        const messages = await listAllMessages(conversation.conversationId);
        return { conversation, messages };
      } catch (error) {
        if (isConversationNotFoundError(error)) return null;
        throw error;
      }
    })
  );

  const availableResults = results.filter((result): result is { conversation: Conversation; messages: Message[] } => Boolean(result));

  return {
    conversations: availableResults.map((result) => result.conversation),
    messagesByConversationId: Object.fromEntries(
      availableResults.map((result) => [result.conversation.conversationId, result.messages])
    )
  };
};

const authUser = async (): Promise<User> => {
  const session = await fetchAuthSession();
  if (!session.tokens) throw new Error("Unauthenticated");

  const user = await getCurrentUser();
  const claims = session.tokens.idToken?.payload ?? {};
  const givenName = typeof claims.given_name === "string" ? claims.given_name : "";
  const familyName = typeof claims.family_name === "string" ? claims.family_name : "";
  const fullName = [givenName, familyName].filter(Boolean).join(" ").trim();
  const name = typeof claims.name === "string" ? claims.name : "";
  const email = typeof claims.email === "string" ? claims.email : "";
  const picture = typeof claims.picture === "string" ? claims.picture : null;
  const displayName =
    name ||
    fullName ||
    email ||
    user.userId;

  return {
    userId: user.userId,
    displayName,
    email,
    avatarUrl: picture
  };
};

export const initializeChat = createAsyncThunk(
  "chat/initialize",
  async () => {
    const currentUser = await authUser();
    const conversations = await listAllConversations();
    const messageSnapshot = await loadMessageEntriesForConversations(conversations);

    return {
      currentUser,
      conversations: messageSnapshot.conversations,
      messagesByConversationId: messageSnapshot.messagesByConversationId,
      nextToken: null
    };
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as { chat: ChatState };
      return !state.chat.conversationsInitialized && !state.chat.conversationsLoading;
    }
  }
);

export const loadMoreConversations = createAsyncThunk(
  "chat/loadMoreConversations",
  async (_, { getState }) => {
    const state = getState() as { chat: ChatState };
    const token = state.chat.nextConversationToken;
    if (!token) return { conversations: [], nextToken: null };

    const data = await listConversations(20, token);
    return { conversations: data.items, nextToken: data.nextToken ?? null };
  }
);

export const refreshChatSnapshot = createAsyncThunk("chat/refreshSnapshot", async () => {
  const conversations = await listAllConversations();
  const messageSnapshot = await loadMessageEntriesForConversations(conversations);

  return {
    conversations: messageSnapshot.conversations,
    messagesByConversationId: messageSnapshot.messagesByConversationId
  };
});

export const createConversationByEmail = createAsyncThunk("chat/createConversationByEmail", async (email: string) => {
  return startConversation(email);
});

export const openConversation = createAsyncThunk(
  "chat/openConversation",
  async (conversationId: string, { getState }) => {
    const state = getState() as { chat: ChatState };
    const cachedConversation =
      state.chat.selectedConversation?.conversationId === conversationId
        ? state.chat.selectedConversation
        : state.chat.conversations.find((conversation) => conversation.conversationId === conversationId);

    if (state.chat.messageThreadsInitialized[conversationId] && cachedConversation) {
      return {
        conversation: cachedConversation,
        messages: state.chat.messagesByConversationId[conversationId] ?? [],
        nextToken: state.chat.messageNextTokens[conversationId] ?? null
      };
    }

    const thread = await getConversationThread(conversationId);
    return {
      conversation: thread.conversation,
      messages: thread.messages.items,
      nextToken: thread.messages.nextToken ?? null
    };
  },
  {
    condition: (conversationId, { getState }) => {
      const state = getState() as { chat: ChatState };
      return state.chat.openingConversationId !== conversationId;
    }
  }
);

export const loadOlderMessages = createAsyncThunk(
  "chat/loadOlderMessages",
  async (conversationId: string, { getState }) => {
    const state = getState() as { chat: ChatState };
    const token = state.chat.messageNextTokens[conversationId];
    if (!token) return { conversationId, messages: [], nextToken: null };

    const data = await listMessages(conversationId, 30, token);
    return {
      conversationId,
      messages: data.items,
      nextToken: data.nextToken ?? null
    };
  }
);

export const sendChatMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, content }: { conversationId: string; content: string }) => {
    return sendMessage(conversationId, content);
  }
);

export const markConversationReadOnServer = createAsyncThunk("chat/markConversationReadOnServer", async (conversationId: string) => {
  return markConversationRead(conversationId);
});

export const setPresence = createAsyncThunk("chat/setPresence", async (online: boolean) => {
  return updatePresence(online);
});

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    clearChatError(state) {
      state.error = "";
    },
    clearSelectedConversation(state) {
      state.selectedConversation = undefined;
    },
    archiveConversation(state, action: PayloadAction<string>) {
      if (!state.archivedConversationIds.includes(action.payload)) {
        state.archivedConversationIds.push(action.payload);
      }
    },
    unarchiveConversation(state, action: PayloadAction<string>) {
      state.archivedConversationIds = state.archivedConversationIds.filter((conversationId) => conversationId !== action.payload);
    },
    markConversationSeen(state, action: PayloadAction<string>) {
      const conversationId = action.payload;
      state.unreadCountsByConversationId[conversationId] = 0;
      const messages = state.messagesByConversationId[conversationId] ?? [];
      state.seenMessageIdsByConversationId[conversationId] = messages.map((message) => message.messageId);
    },
    messageReceived(state, action: PayloadAction<Message>) {
      const message = { ...action.payload, deliveryStatus: action.payload.deliveryStatus ?? "sent" };
      const existing = state.messagesByConversationId[message.conversationId] ?? [];
      const alreadyHadMessage = existing.some((item) => item.messageId === message.messageId);
      state.messagesByConversationId[message.conversationId] = dedupeMessages([...existing, message]);

      const conversation = state.conversations.find((item) => item.conversationId === message.conversationId);
      if (conversation) {
        const updatedConversation = updateConversationFromMessage(conversation, message);
        state.conversations = upsertConversation(state.conversations, updatedConversation, true);
        if (state.selectedConversation?.conversationId === message.conversationId) {
          state.selectedConversation = updatedConversation;
        }
      }

      const selected = state.selectedConversation?.conversationId === message.conversationId;
      const sentByCurrentUser = state.currentUser?.userId === message.senderId;
      if (!alreadyHadMessage && !selected && !sentByCurrentUser) {
        state.unreadCountsByConversationId[message.conversationId] = (state.unreadCountsByConversationId[message.conversationId] ?? 0) + 1;
      } else if (selected) {
        state.seenMessageIdsByConversationId[message.conversationId] = Array.from(
          new Set([...(state.seenMessageIdsByConversationId[message.conversationId] ?? []), message.messageId])
        );
      }
    },
    receiptUpdated(state, action: PayloadAction<ConversationReceipt>) {
      const receipt = action.payload;
      state.receiptsByConversationId[receipt.conversationId] = {
        ...(state.receiptsByConversationId[receipt.conversationId] ?? {}),
        [receipt.userId]: receipt
      };

      state.conversations = state.conversations.map((conversation) =>
        conversation.conversationId === receipt.conversationId
          ? {
              ...conversation,
              receipts: [
                ...(conversation.receipts ?? []).filter((item) => item.userId !== receipt.userId),
                receipt
              ]
            }
          : conversation
      );
      if (state.selectedConversation?.conversationId === receipt.conversationId) {
        state.selectedConversation = {
          ...state.selectedConversation,
          receipts: [
            ...(state.selectedConversation.receipts ?? []).filter((item) => item.userId !== receipt.userId),
            receipt
          ]
        };
      }
    },
    presenceUpdated(state, action: PayloadAction<UserPresence>) {
      const presence = action.payload;
      state.userPresenceById[presence.userId] = presence;
      const applyPresence = (user: User) =>
        user.userId === presence.userId
          ? {
              ...user,
              onlineStatus: presence.onlineStatus,
              lastSeenAt: presence.lastSeenAt ?? null,
              lastHeartbeatAt: presence.lastHeartbeatAt ?? null
            }
          : user;

      state.conversations = state.conversations.map((conversation) => ({
        ...conversation,
        participants: conversation.participants.map(applyPresence)
      }));
      if (state.selectedConversation) {
        state.selectedConversation = {
          ...state.selectedConversation,
          participants: state.selectedConversation.participants.map(applyPresence)
        };
      }
      if (state.currentUser?.userId === presence.userId) {
        state.currentUser = applyPresence(state.currentUser);
      }
    },
    typingUpdated(state, action: PayloadAction<TypingStatus>) {
      const typing = action.payload;
      state.typingByConversationId[typing.conversationId] = {
        ...(state.typingByConversationId[typing.conversationId] ?? {}),
        [typing.userId]: typing
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeChat.pending, (state) => {
        state.conversationsLoading = true;
        state.error = "";
      })
      .addCase(initializeChat.fulfilled, (state, action) => {
        state.conversationsLoading = false;
        state.conversationsInitialized = true;
        state.currentUser = action.payload.currentUser;
        state.conversations = dedupeConversations(action.payload.conversations);
        state.receiptsByConversationId = receiptsByConversation(action.payload.conversations);
        state.userPresenceById = presenceByUser(action.payload.currentUser, action.payload.conversations);
        state.messagesByConversationId = Object.fromEntries(
          Object.entries(action.payload.messagesByConversationId).map(([conversationId, messages]) => [conversationId, dedupeMessages(messages)])
        );
        state.messageThreadsInitialized = Object.fromEntries(action.payload.conversations.map((conversation) => [conversation.conversationId, true]));
        state.messageNextTokens = Object.fromEntries(action.payload.conversations.map((conversation) => [conversation.conversationId, null]));
        state.nextConversationToken = action.payload.nextToken;
      })
      .addCase(initializeChat.rejected, (state, action) => {
        state.conversationsLoading = false;
        state.error = action.error.message === "Unauthenticated" ? "Unauthenticated" : "Could not load conversations.";
      })
      .addCase(loadMoreConversations.pending, (state) => {
        state.loadingMoreConversations = true;
        state.error = "";
      })
      .addCase(loadMoreConversations.fulfilled, (state, action) => {
        state.loadingMoreConversations = false;
        state.conversations = dedupeConversations([...state.conversations, ...action.payload.conversations]);
        state.receiptsByConversationId = {
          ...state.receiptsByConversationId,
          ...receiptsByConversation(action.payload.conversations)
        };
        state.userPresenceById = {
          ...state.userPresenceById,
          ...presenceByUser(state.currentUser, action.payload.conversations)
        };
        state.nextConversationToken = action.payload.nextToken;
      })
      .addCase(loadMoreConversations.rejected, (state) => {
        state.loadingMoreConversations = false;
        state.error = "Could not load more conversations.";
      })
      .addCase(refreshChatSnapshot.fulfilled, (state, action) => {
        state.conversations = dedupeConversations(action.payload.conversations);
        state.receiptsByConversationId = {
          ...state.receiptsByConversationId,
          ...receiptsByConversation(action.payload.conversations)
        };
        state.userPresenceById = {
          ...state.userPresenceById,
          ...presenceByUser(state.currentUser, action.payload.conversations)
        };

        for (const [conversationId, messages] of Object.entries(action.payload.messagesByConversationId)) {
          const existing = state.messagesByConversationId[conversationId] ?? [];
          const existingMessageIds = new Set(existing.map((message) => message.messageId));
          const newMessages = messages.filter((message) => !existingMessageIds.has(message.messageId));

          state.messagesByConversationId[conversationId] = dedupeMessages([...existing, ...messages]);
          state.messageThreadsInitialized[conversationId] = true;
          state.messageNextTokens[conversationId] = null;

          const selected = state.selectedConversation?.conversationId === conversationId;
          const unreadMessages = newMessages.filter((message) => message.senderId !== state.currentUser?.userId);
          if (selected) {
            state.seenMessageIdsByConversationId[conversationId] = Array.from(
              new Set([
                ...(state.seenMessageIdsByConversationId[conversationId] ?? []),
                ...messages.map((message) => message.messageId)
              ])
            );
            state.unreadCountsByConversationId[conversationId] = 0;
          } else if (unreadMessages.length) {
            state.unreadCountsByConversationId[conversationId] =
              (state.unreadCountsByConversationId[conversationId] ?? 0) + unreadMessages.length;
          }
        }
      })
      .addCase(createConversationByEmail.pending, (state) => {
        state.creatingConversation = true;
        state.error = "";
      })
      .addCase(createConversationByEmail.fulfilled, (state, action) => {
        state.creatingConversation = false;
        state.conversations = dedupeConversations([action.payload, ...state.conversations]);
        state.selectedConversation = action.payload;
        state.receiptsByConversationId = {
          ...state.receiptsByConversationId,
          ...receiptsByConversation([action.payload])
        };
        state.userPresenceById = {
          ...state.userPresenceById,
          ...presenceByUser(state.currentUser, [action.payload])
        };
      })
      .addCase(createConversationByEmail.rejected, (state, action) => {
        state.creatingConversation = false;
        state.error = action.error.message || "Could not start that conversation.";
      })
      .addCase(openConversation.pending, (state, action) => {
        state.messagesLoading = true;
        state.openingConversationId = action.meta.arg;
        state.error = "";
      })
      .addCase(openConversation.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.openingConversationId = undefined;
        state.selectedConversation = action.payload.conversation;
        state.conversations = upsertConversation(state.conversations, action.payload.conversation);
        state.receiptsByConversationId[action.payload.conversation.conversationId] = {
          ...(state.receiptsByConversationId[action.payload.conversation.conversationId] ?? {}),
          ...(receiptsByConversation([action.payload.conversation])[action.payload.conversation.conversationId] ?? {})
        };
        state.userPresenceById = {
          ...state.userPresenceById,
          ...presenceByUser(state.currentUser, [action.payload.conversation])
        };
        state.messagesByConversationId[action.payload.conversation.conversationId] = dedupeMessages(action.payload.messages);
        state.messageNextTokens[action.payload.conversation.conversationId] = action.payload.nextToken;
        state.messageThreadsInitialized[action.payload.conversation.conversationId] = true;
        state.unreadCountsByConversationId[action.payload.conversation.conversationId] = 0;
        state.seenMessageIdsByConversationId[action.payload.conversation.conversationId] = state.messagesByConversationId[
          action.payload.conversation.conversationId
        ].map((message) => message.messageId);
      })
      .addCase(openConversation.rejected, (state) => {
        state.messagesLoading = false;
        state.openingConversationId = undefined;
        state.error = "This conversation could not be loaded.";
      })
      .addCase(loadOlderMessages.pending, (state) => {
        state.loadingOlderMessages = true;
        state.error = "";
      })
      .addCase(loadOlderMessages.fulfilled, (state, action) => {
        state.loadingOlderMessages = false;
        const existing = state.messagesByConversationId[action.payload.conversationId] ?? [];
        state.messagesByConversationId[action.payload.conversationId] = dedupeMessages([...action.payload.messages, ...existing]);
        state.messageNextTokens[action.payload.conversationId] = action.payload.nextToken;
      })
      .addCase(loadOlderMessages.rejected, (state) => {
        state.loadingOlderMessages = false;
        state.error = "Could not load older messages.";
      })
      .addCase(sendChatMessage.pending, (state, action) => {
        state.sendingMessage = true;
        state.error = "";
        if (!state.currentUser) return;

        const optimisticMessageId = `optimistic-${action.meta.requestId}`;
        const optimisticMessage: Message = {
          messageId: optimisticMessageId,
          clientRequestId: action.meta.requestId,
          conversationId: action.meta.arg.conversationId,
          senderId: state.currentUser.userId,
          content: action.meta.arg.content,
          createdAt: new Date().toISOString(),
          deliveryStatus: "sending"
        };
        const existing = state.messagesByConversationId[action.meta.arg.conversationId] ?? [];
        state.optimisticMessageIdsByRequestId[action.meta.requestId] = optimisticMessageId;
        state.messagesByConversationId[action.meta.arg.conversationId] = dedupeMessages([...existing, optimisticMessage]);

        const conversation = state.conversations.find((item) => item.conversationId === action.meta.arg.conversationId);
        if (conversation) {
          const updatedConversation = updateConversationFromMessage(conversation, optimisticMessage);
          state.conversations = upsertConversation(state.conversations, updatedConversation, true);
          if (state.selectedConversation?.conversationId === action.meta.arg.conversationId) {
            state.selectedConversation = updatedConversation;
          }
        }
        state.unreadCountsByConversationId[action.meta.arg.conversationId] = 0;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.sendingMessage = false;
        const optimisticMessageId = state.optimisticMessageIdsByRequestId[action.meta.requestId];
        delete state.optimisticMessageIdsByRequestId[action.meta.requestId];

        const message = { ...action.payload, deliveryStatus: "sent" as const };
        const existing = state.messagesByConversationId[message.conversationId] ?? [];
        state.messagesByConversationId[message.conversationId] = dedupeMessages([
          ...existing.filter((item) => item.messageId !== optimisticMessageId),
          message
        ]);
        const conversation = state.conversations.find((item) => item.conversationId === message.conversationId);
        if (conversation) {
          const updatedConversation = updateConversationFromMessage(conversation, message);
          state.conversations = upsertConversation(state.conversations, updatedConversation, true);
          if (state.selectedConversation?.conversationId === message.conversationId) {
            state.selectedConversation = updatedConversation;
          }
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.sendingMessage = false;
        const optimisticMessageId = state.optimisticMessageIdsByRequestId[action.meta.requestId];
        delete state.optimisticMessageIdsByRequestId[action.meta.requestId];

        if (optimisticMessageId) {
          const conversationId = action.meta.arg.conversationId;
          const existing = state.messagesByConversationId[conversationId] ?? [];
          state.messagesByConversationId[conversationId] = existing.map((message) =>
            message.messageId === optimisticMessageId ? { ...message, deliveryStatus: "failed" } : message
          );
        }
        state.error = "Could not send that message.";
      })
      .addCase(markConversationReadOnServer.fulfilled, (state, action) => {
        const receipt = action.payload;
        state.receiptsByConversationId[receipt.conversationId] = {
          ...(state.receiptsByConversationId[receipt.conversationId] ?? {}),
          [receipt.userId]: receipt
        };
      })
      .addCase(setPresence.fulfilled, (state, action) => {
        const presence = action.payload;
        state.userPresenceById[presence.userId] = presence;
        if (state.currentUser?.userId === presence.userId) {
          state.currentUser = {
            ...state.currentUser,
            onlineStatus: presence.onlineStatus,
            lastSeenAt: presence.lastSeenAt ?? null,
            lastHeartbeatAt: presence.lastHeartbeatAt ?? null
          };
        }
      });
  }
});

export const {
  archiveConversation,
  clearChatError,
  clearSelectedConversation,
  markConversationSeen,
  messageReceived,
  presenceUpdated,
  receiptUpdated,
  typingUpdated,
  unarchiveConversation
} = chatSlice.actions;
export default chatSlice.reducer;
