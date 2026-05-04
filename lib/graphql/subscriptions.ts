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
