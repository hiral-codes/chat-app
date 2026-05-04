# WhatsApp-like Realtime Chat MVP

Next.js + AWS AppSync + Cognito + DynamoDB single-table implementation for a 1:1 realtime chat MVP.

## Features
- Social login via Cognito Hosted UI
- Single-table DynamoDB model (`ChatTable`)
- AppSync GraphQL queries, mutations, and subscriptions
- 1:1 conversation creation and realtime message updates
- Start chats by Cognito user email and display participant names
- Redux Toolkit global chat state for conversations, messages, and loading states
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

## Environments
The backend supports three isolated stages:
- `local`: defaults Cognito callback/logout to `http://localhost:3000`.
- `staging`: requires deployed HTTPS callback/logout URLs.
- `production`: requires deployed HTTPS callback/logout URLs and retains DynamoDB/Cognito resources on stack deletion.

Deploy local:
```bash
npm run cdk:deploy:local
```

Deploy staging:
```bash
COGNITO_CALLBACK_URLS=https://your-staging-domain.com/api/auth/callback \
COGNITO_LOGOUT_URLS=https://your-staging-domain.com/login \
npm run cdk:deploy:staging
```

Deploy production:
```bash
COGNITO_CALLBACK_URLS=https://main.d29qsz1i4o8pjr.amplifyapp.com/api/auth/callback \
COGNITO_LOGOUT_URLS=https://main.d29qsz1i4o8pjr.amplifyapp.com/login \
npm run cdk:deploy:production
```

You can also pass URLs as CDK context:
```bash
cdk deploy -a "tsx infra/bin/chat-app.ts" -c stage=production \
  -c callbackUrls=https://main.d29qsz1i4o8pjr.amplifyapp.com/api/auth/callback \
  -c logoutUrls=https://main.d29qsz1i4o8pjr.amplifyapp.com/login
```

For Amplify Hosting, set the matching `NEXT_PUBLIC_*` variables per branch. The Cognito allowed callback URL must be the callback route, not `/chat`:
- Allowed callback URL: `https://main.d29qsz1i4o8pjr.amplifyapp.com/api/auth/callback`
- Default redirect URL: `https://main.d29qsz1i4o8pjr.amplifyapp.com/api/auth/callback`
- Allowed sign-out URL: `https://main.d29qsz1i4o8pjr.amplifyapp.com/login`

After each backend deploy, copy the CDK outputs into the matching frontend environment:
- `GraphqlApiUrl` -> `NEXT_PUBLIC_APPSYNC_ENDPOINT`
- `UserPoolId` -> `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `UserPoolClientId` -> `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `CognitoDomain` -> `NEXT_PUBLIC_COGNITO_DOMAIN`

## GitHub Actions
The workflow in `.github/workflows/ci-cd.yml` runs lint, typecheck, build, and local CDK synth on PRs and pushes to `main` or `develop`.

Backend deploys are manual from the GitHub Actions tab:
1. Open `CI/CD`.
2. Click `Run workflow`.
3. Choose `staging` or `production`.

Create GitHub Environments named `staging` and `production`, then add:
- Environment secret `AWS_ROLE_ARN`: IAM role ARN that GitHub OIDC can assume.
- Environment variable `AWS_REGION`: for example `ap-south-1`.
- Environment variable `COGNITO_CALLBACK_URLS`: for example `https://main.d29qsz1i4o8pjr.amplifyapp.com/api/auth/callback`.
- Environment variable `COGNITO_LOGOUT_URLS`: for example `https://main.d29qsz1i4o8pjr.amplifyapp.com/login`.
- Optional environment variable `COGNITO_DOMAIN_PREFIX`: only if you want to override the default `chatapprealtimemvp-staging` or `chatapprealtimemvp-production`.

For production, enable required reviewers on the `production` GitHub Environment so deploys need approval before AWS changes are made.

## GraphQL Contract
- Queries:
  - `listConversations(limit, nextToken)`
  - `getConversation(conversationId)`
  - `listMessages(conversationId, limit, nextToken)`
- Mutations:
  - `startConversation(otherUserId)` where the value is the other user's email address
  - `sendMessage(conversationId, content)`
- Subscription:
  - `onMessageSent(conversationId)`
