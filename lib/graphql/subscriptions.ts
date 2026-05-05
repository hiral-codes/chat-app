export const onMessageSentSubscription = /* GraphQL */ `
  subscription OnMessageSent($conversationId: ID!) {
    onMessageSent(conversationId: $conversationId) {
      messageId
      conversationId
      senderId
      content
      createdAt
    }
  }
`;

export const onConversationReceiptUpdatedSubscription = /* GraphQL */ `
  subscription OnConversationReceiptUpdated($conversationId: ID!) {
    onConversationReceiptUpdated(conversationId: $conversationId) {
      conversationId
      userId
      deliveredAt
      readAt
    }
  }
`;

export const onPresenceChangedSubscription = /* GraphQL */ `
  subscription OnPresenceChanged($userId: ID!) {
    onPresenceChanged(userId: $userId) {
      userId
      onlineStatus
      lastSeenAt
      lastHeartbeatAt
    }
  }
`;

export const onTypingChangedSubscription = /* GraphQL */ `
  subscription OnTypingChanged($conversationId: ID!) {
    onTypingChanged(conversationId: $conversationId) {
      conversationId
      userId
      isTyping
      updatedAt
    }
  }
`;
