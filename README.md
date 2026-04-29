# WhatsApp-like Realtime Chat MVP

Next.js + AWS AppSync + Cognito + DynamoDB single-table implementation for a 1:1 realtime chat MVP.

## Features
- Social login via Cognito Hosted UI
- Single-table DynamoDB model (`ChatTable`)
- AppSync GraphQL queries, mutations, and subscriptions
- 1:1 conversation creation and realtime message updates
- Conversation/message pagination with `nextToken`

## Local Setup
1. Install dependencies:
   - `npm install`
2. Copy envs:
   - `cp .env.example .env.local`
3. Fill AWS outputs from CDK deployment into `.env.local`.
4. Run app:
   - `npm run dev`

## Infra
- `infra/lib/chat-infra-stack.ts` creates:
  - Cognito user pool + hosted UI domain/client
  - `ChatTable` with `GSI1` and `GSI2`
  - AppSync API + Lambda resolver

To synth stack:
- `npm run cdk:synth`

## GraphQL Contract
- Queries:
  - `listConversations(limit, nextToken)`
  - `listMessages(conversationId, limit, nextToken)`
- Mutations:
  - `startConversation(otherUserId)`
  - `sendMessage(conversationId, content)`
- Subscription:
  - `onMessageSent(conversationId)`
