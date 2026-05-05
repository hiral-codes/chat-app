export const startConversationMutation = /* GraphQL */ `
  mutation StartConversation($otherUserId: ID!) {
    startConversation(otherUserId: $otherUserId) {
      conversationId
      lastMessagePreview
      lastMessageAt
      participants {
        userId
        displayName
        avatarUrl
        onlineStatus
        lastSeenAt
        lastHeartbeatAt
      }
      receipts {
        conversationId
        userId
        deliveredAt
        readAt
      }
    }
  }
`;

export const startConversationLegacyMutation = /* GraphQL */ `
  mutation StartConversation($otherUserId: ID!) {
    startConversation(otherUserId: $otherUserId) {
      conversationId
      lastMessagePreview
      lastMessageAt
      participants {
        userId
        displayName
        avatarUrl
      }
    }
  }
`;

export const sendMessageMutation = /* GraphQL */ `
  mutation SendMessage($conversationId: ID!, $content: String!) {
    sendMessage(conversationId: $conversationId, content: $content) {
      messageId
      conversationId
      senderId
      content
      createdAt
    }
  }
`;

export const markConversationDeliveredMutation = /* GraphQL */ `
  mutation MarkConversationDelivered($conversationId: ID!) {
    markConversationDelivered(conversationId: $conversationId) {
      conversationId
      userId
      deliveredAt
      readAt
    }
  }
`;

export const markConversationReadMutation = /* GraphQL */ `
  mutation MarkConversationRead($conversationId: ID!) {
    markConversationRead(conversationId: $conversationId) {
      conversationId
      userId
      deliveredAt
      readAt
    }
  }
`;

export const updatePresenceMutation = /* GraphQL */ `
  mutation UpdatePresence($online: Boolean!) {
    updatePresence(online: $online) {
      userId
      onlineStatus
      lastSeenAt
      lastHeartbeatAt
    }
  }
`;

export const updateTypingMutation = /* GraphQL */ `
  mutation UpdateTyping($conversationId: ID!, $isTyping: Boolean!) {
    updateTyping(conversationId: $conversationId, isTyping: $isTyping) {
      conversationId
      userId
      isTyping
      updatedAt
    }
  }
`;
