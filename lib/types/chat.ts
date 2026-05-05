export type User = {
  userId: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  onlineStatus?: "online" | "offline";
  lastSeenAt?: string | null;
  lastHeartbeatAt?: string | null;
};

export type Conversation = {
  conversationId: string;
  participants: User[];
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  receipts?: ConversationReceipt[];
};

export type Message = {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  deliveryStatus?: "sending" | "sent" | "delivered" | "seen" | "failed";
  clientRequestId?: string;
};

export type ConversationReceipt = {
  conversationId: string;
  userId: string;
  deliveredAt?: string | null;
  readAt?: string | null;
};

export type UserPresence = {
  userId: string;
  onlineStatus: "online" | "offline";
  lastSeenAt?: string | null;
  lastHeartbeatAt?: string | null;
};

export type TypingStatus = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  updatedAt: string;
};

export type Paginated<T> = {
  items: T[];
  nextToken?: string | null;
};

export type ConversationThread = {
  conversation: Conversation;
  messages: Paginated<Message>;
};
