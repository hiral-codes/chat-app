export type User = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type Conversation = {
  conversationId: string;
  participants: User[];
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
};

export type Message = {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  nextToken?: string | null;
};
