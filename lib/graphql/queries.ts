export const listConversationsQuery = /* GraphQL */ `
  query ListConversations($limit: Int, $nextToken: String) {
    listConversations(limit: $limit, nextToken: $nextToken) {
      items {
        conversationId
        lastMessagePreview
        lastMessageAt
        participants {
          userId
          displayName
          email
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
      nextToken
    }
  }
`;

export const listConversationsLegacyQuery = /* GraphQL */ `
  query ListConversations($limit: Int, $nextToken: String) {
    listConversations(limit: $limit, nextToken: $nextToken) {
      items {
        conversationId
        lastMessagePreview
        lastMessageAt
        participants {
          userId
          displayName
          avatarUrl
        }
      }
      nextToken
    }
  }
`;

export const listMessagesQuery = /* GraphQL */ `
  query ListMessages($conversationId: ID!, $limit: Int, $nextToken: String) {
    listMessages(conversationId: $conversationId, limit: $limit, nextToken: $nextToken) {
      items {
        messageId
        conversationId
        senderId
        content
        createdAt
      }
      nextToken
    }
  }
`;

export const getConversationQuery = /* GraphQL */ `
  query GetConversation($conversationId: ID!) {
    getConversation(conversationId: $conversationId) {
      conversationId
      lastMessagePreview
      lastMessageAt
      participants {
        userId
        displayName
        email
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

export const getConversationLegacyQuery = /* GraphQL */ `
  query GetConversation($conversationId: ID!) {
    getConversation(conversationId: $conversationId) {
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

export const getConversationThreadQuery = /* GraphQL */ `
  query GetConversationThread($conversationId: ID!, $messagesLimit: Int, $messagesNextToken: String) {
    getConversationThread(
      conversationId: $conversationId
      messagesLimit: $messagesLimit
      messagesNextToken: $messagesNextToken
    ) {
      conversation {
        conversationId
        lastMessagePreview
        lastMessageAt
        participants {
          userId
          displayName
          email
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
      messages {
        items {
          messageId
          conversationId
          senderId
          content
          createdAt
        }
        nextToken
      }
    }
  }
`;

export const getConversationThreadLegacyQuery = /* GraphQL */ `
  query GetConversationThread($conversationId: ID!, $messagesLimit: Int, $messagesNextToken: String) {
    getConversationThread(
      conversationId: $conversationId
      messagesLimit: $messagesLimit
      messagesNextToken: $messagesNextToken
    ) {
      conversation {
        conversationId
        lastMessagePreview
        lastMessageAt
        participants {
          userId
          displayName
          avatarUrl
        }
      }
      messages {
        items {
          messageId
          conversationId
          senderId
          content
          createdAt
        }
        nextToken
      }
    }
  }
`;
