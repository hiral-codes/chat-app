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
