import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import {
  getConversation,
  listConversations,
  listMessages,
  sendMessage,
  startConversation
} from "@/lib/chat/api";
import { Conversation, Message, User } from "@/lib/types/chat";

type ChatState = {
  currentUser?: User;
  conversations: Conversation[];
  nextConversationToken: string | null;
  selectedConversation?: Conversation;
  messagesByConversationId: Record<string, Message[]>;
  messageNextTokens: Record<string, string | null>;
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
  nextConversationToken: null,
  messagesByConversationId: {},
  messageNextTokens: {},
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

const dedupeMessages = (messages: Message[]) =>
  Array.from(new Map(messages.map((message) => [message.messageId, message])).values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

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
    avatarUrl: picture
  };
};

export const initializeChat = createAsyncThunk("chat/initialize", async () => {
  const currentUser = await authUser();
  const data = await listConversations();
  return {
    currentUser,
    conversations: data.items,
    nextToken: data.nextToken ?? null
  };
});

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

export const createConversationByEmail = createAsyncThunk("chat/createConversationByEmail", async (email: string) => {
  return startConversation(email);
});

export const openConversation = createAsyncThunk("chat/openConversation", async (conversationId: string) => {
  const [conversation, messages] = await Promise.all([getConversation(conversationId), listMessages(conversationId)]);
  return {
    conversation,
    messages: messages.items,
    nextToken: messages.nextToken ?? null
  };
});

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

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    clearChatError(state) {
      state.error = "";
    },
    messageReceived(state, action: PayloadAction<Message>) {
      const message = action.payload;
      const existing = state.messagesByConversationId[message.conversationId] ?? [];
      state.messagesByConversationId[message.conversationId] = dedupeMessages([...existing, message]);
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
        state.currentUser = action.payload.currentUser;
        state.conversations = dedupeConversations(action.payload.conversations);
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
        state.nextConversationToken = action.payload.nextToken;
      })
      .addCase(loadMoreConversations.rejected, (state) => {
        state.loadingMoreConversations = false;
        state.error = "Could not load more conversations.";
      })
      .addCase(createConversationByEmail.pending, (state) => {
        state.creatingConversation = true;
        state.error = "";
      })
      .addCase(createConversationByEmail.fulfilled, (state, action) => {
        state.creatingConversation = false;
        state.conversations = dedupeConversations([action.payload, ...state.conversations]);
        state.selectedConversation = action.payload;
      })
      .addCase(createConversationByEmail.rejected, (state, action) => {
        state.creatingConversation = false;
        state.error = action.error.message || "Could not start that conversation.";
      })
      .addCase(openConversation.pending, (state) => {
        state.messagesLoading = true;
        state.error = "";
      })
      .addCase(openConversation.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.selectedConversation = action.payload.conversation;
        state.conversations = dedupeConversations([action.payload.conversation, ...state.conversations]);
        state.messagesByConversationId[action.payload.conversation.conversationId] = dedupeMessages(action.payload.messages);
        state.messageNextTokens[action.payload.conversation.conversationId] = action.payload.nextToken;
      })
      .addCase(openConversation.rejected, (state) => {
        state.messagesLoading = false;
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
      .addCase(sendChatMessage.pending, (state) => {
        state.sendingMessage = true;
        state.error = "";
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.sendingMessage = false;
        const message = action.payload;
        const existing = state.messagesByConversationId[message.conversationId] ?? [];
        state.messagesByConversationId[message.conversationId] = dedupeMessages([...existing, message]);
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.sendingMessage = false;
        state.error = "Could not send that message.";
      });
  }
});

export const { clearChatError, messageReceived } = chatSlice.actions;
export default chatSlice.reducer;
