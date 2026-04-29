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
