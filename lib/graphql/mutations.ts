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
