import {
  DynamoDBClient,
  QueryCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import crypto from "node:crypto";

const client = new DynamoDBClient({});
const cognito = new CognitoIdentityProviderClient({});
const tableName = process.env.CHAT_TABLE_NAME ?? "";
const userPoolId = process.env.USER_POOL_ID ?? "";

type AppSyncEvent = {
  fieldName?: string;
  info?: {
    fieldName?: string;
  };
  arguments: Record<string, unknown>;
  identity?: { sub?: string };
};

const nowIso = () => new Date().toISOString();

const assertAuthed = (event: AppSyncEvent): string => {
  const userId = event.identity?.sub;
  if (!userId) throw new Error("Unauthorized");
  return userId;
};

const encodeToken = (key: unknown) => (key ? Buffer.from(JSON.stringify(key)).toString("base64") : null);
const decodeToken = (token?: string) => (token ? JSON.parse(Buffer.from(token, "base64").toString("utf-8")) : undefined);
const userKey = (userId: string) => `USER#${userId}`;
const convKey = (conversationId: string) => `CONV#${conversationId}`;
const membershipKey = (conversationId: string) => `CONV#${conversationId}`;
const presenceKey = () => "PRESENCE";
const participantHash = (a: string, b: string) => [a, b].sort().join("#");
const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (value instanceof Set) return Array.from(value).map(String);
  return [];
};
const clampLimit = (limit: number, fallback: number, max: number) => {
  if (!Number.isFinite(limit) || limit < 1) return fallback;
  return Math.min(Math.floor(limit), max);
};

const attribute = (attributes: { Name?: string; Value?: string }[] | undefined, name: string) =>
  attributes?.find((item) => item.Name === name)?.Value;

const displayNameFromAttributes = (attributes: { Name?: string; Value?: string }[], fallback: string) =>
  attribute(attributes, "name") ||
  [attribute(attributes, "given_name"), attribute(attributes, "family_name")].filter(Boolean).join(" ").trim() ||
  attribute(attributes, "email") ||
  fallback;

const onlineWindowMs = 60_000;
const toUser = (
  id: string,
  displayName = id,
  avatarUrl: string | null = null,
  presence: { onlineStatus?: string; lastSeenAt?: string | null; lastHeartbeatAt?: string | null } = {}
) => ({
  userId: id,
  displayName,
  avatarUrl,
  onlineStatus: presence.onlineStatus === "online" ? "online" : "offline",
  lastSeenAt: presence.lastSeenAt ?? null,
  lastHeartbeatAt: presence.lastHeartbeatAt ?? null
});
type UserProfile = ReturnType<typeof toUser>;
type LoadUserProfile = (userId: string) => Promise<UserProfile>;

const createUserProfileLoader = (): LoadUserProfile => {
  const cache = new Map<string, Promise<UserProfile>>();

  return (userId: string) => {
    const cached = cache.get(userId);
    if (cached) return cached;

    const profile = getUserProfile(userId);
    cache.set(userId, profile);
    return profile;
  };
};

async function getUserProfile(userId: string) {
  const presence = await getUserPresence(userId);
  if (!userPoolId) return toUser(userId, userId, null, presence);

  try {
    const result = await cognito.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `sub = "${userId}"`,
        Limit: 1
      })
    );
    const user = result.Users?.[0];
    const attributes = user?.Attributes ?? [];
    return toUser(userId, displayNameFromAttributes(attributes, userId), attribute(attributes, "picture") ?? null, presence);
  } catch (error) {
    console.warn("Unable to load user profile", { userId, error });
    return toUser(userId, userId, null, presence);
  }
}

async function getUserPresence(userId: string) {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": { S: userKey(userId) },
        ":sk": { S: presenceKey() }
      },
      Limit: 1
    })
  );

  const item = result.Items?.[0] ? unmarshall(result.Items[0]) : {};
  const lastHeartbeatAt = typeof item.lastHeartbeatAt === "string" ? item.lastHeartbeatAt : null;
  const heartbeatIsFresh = lastHeartbeatAt ? Date.now() - new Date(lastHeartbeatAt).getTime() < onlineWindowMs : false;
  const onlineStatus = item.onlineStatus === "online" && heartbeatIsFresh ? "online" : "offline";

  return {
    userId,
    onlineStatus,
    lastSeenAt: typeof item.lastSeenAt === "string" ? item.lastSeenAt : null,
    lastHeartbeatAt
  };
}

async function findUserByEmail(email: string) {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) throw new Error("Email is required");
  if (!userPoolId) throw new Error("User pool is not configured");

  const escapedEmail = trimmedEmail.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const result = await cognito.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${escapedEmail}"`,
      Limit: 1
    })
  );

  const user = result.Users?.[0];
  const userId = attribute(user?.Attributes, "sub");
  if (!user || !userId) throw new Error("No user exists with that email address");

  const attributes = user.Attributes ?? [];
  return toUser(
    userId,
    displayNameFromAttributes(attributes, trimmedEmail),
    attribute(attributes, "picture") ?? null,
    await getUserPresence(userId)
  );
}

async function toConversation(item: Record<string, unknown>, loadUserProfile: LoadUserProfile = getUserProfile) {
  const participantIds = Array.from(new Set(toStringArray(item.participantIds)));
  const [participants, receipts] = await Promise.all([
    Promise.all(participantIds.map(loadUserProfile)),
    Promise.all(participantIds.map((participantId) => getConversationReceipt(participantId, String(item.conversationId))))
  ]);

  return {
    conversationId: String(item.conversationId),
    participants,
    lastMessagePreview: item.lastMessagePreview ?? null,
    lastMessageAt: item.lastMessageAt ?? null,
    receipts
  };
}

async function getConversationReceipt(userId: string, conversationId: string) {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": { S: userKey(userId) },
        ":sk": { S: membershipKey(conversationId) }
      },
      Limit: 1
    })
  );

  const item = result.Items?.[0] ? unmarshall(result.Items[0]) : {};
  return {
    conversationId,
    userId,
    deliveredAt: typeof item.lastDeliveredAt === "string" ? item.lastDeliveredAt : null,
    readAt: typeof item.lastReadAt === "string" ? item.lastReadAt : null
  };
}

async function startConversation(currentUserId: string, otherUserEmail: string) {
  const otherUser = await findUserByEmail(otherUserEmail);
  const otherUserId = otherUser.userId;
  if (currentUserId === otherUserId) throw new Error("You cannot start a conversation with yourself");

  const participantsHash = participantHash(currentUserId, otherUserId);
  const existing = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
      ExpressionAttributeValues: {
        ":pk": { S: `PAIR#${participantsHash}` },
        ":sk": { S: "CONV" }
      },
      Limit: 1
    })
  );

  if (existing.Items?.[0]) {
    return toConversation(unmarshall(existing.Items[0]));
  }

  const conversationId = crypto.randomUUID();
  const createdAt = nowIso();
  const conversation = {
    PK: convKey(conversationId),
    SK: "META",
    entityType: "CONVERSATION",
    conversationId,
    participantIds: [currentUserId, otherUserId],
    lastMessageAt: createdAt,
    lastMessagePreview: null,
    GSI2PK: `PAIR#${participantsHash}`,
    GSI2SK: "CONV"
  };

  await client.send(
    new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: { S: conversation.PK },
              SK: { S: conversation.SK },
              entityType: { S: conversation.entityType },
              conversationId: { S: conversationId },
              participantIds: { SS: conversation.participantIds },
              lastMessageAt: { S: createdAt },
              GSI2PK: { S: conversation.GSI2PK },
              GSI2SK: { S: conversation.GSI2SK }
            },
            ConditionExpression: "attribute_not_exists(PK)"
          }
        },
        ...[currentUserId, otherUserId].map((id) => ({
          Put: {
            TableName: tableName,
            Item: {
              PK: { S: userKey(id) },
              SK: { S: membershipKey(conversationId) },
              entityType: { S: "MEMBERSHIP" },
              conversationId: { S: conversationId },
              participantIds: { SS: conversation.participantIds },
              GSI1PK: { S: userKey(id) },
              GSI1SK: { S: `LAST#${createdAt}#CONV#${conversationId}` }
            }
          }
        }))
      ]
    })
  );

  return {
    conversationId,
    participants: await Promise.all(conversation.participantIds.map(getUserProfile)),
    lastMessagePreview: null,
    lastMessageAt: createdAt,
    receipts: await Promise.all(conversation.participantIds.map((participantId) => getConversationReceipt(participantId, conversationId)))
  };
}

async function listConversations(currentUserId: string, limit = 20, nextToken?: string) {
  const pageSize = clampLimit(limit, 20, 50);
  const seenConversationIds = new Set<string>();
  const items: Record<string, unknown>[] = [];
  let exclusiveStartKey = decodeToken(nextToken);
  let attempts = 0;

  do {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": { S: userKey(currentUserId) }
        },
        ExclusiveStartKey: exclusiveStartKey,
        ScanIndexForward: false,
        Limit: pageSize
      })
    );

    for (const rawItem of result.Items ?? []) {
      const item = unmarshall(rawItem);
      const conversationId = String(item.conversationId ?? "");
      if (!conversationId || seenConversationIds.has(conversationId)) continue;

      seenConversationIds.add(conversationId);
      items.push(item);
      if (items.length === pageSize) break;
    }

    exclusiveStartKey = result.LastEvaluatedKey;
    attempts += 1;
  } while (items.length < pageSize && exclusiveStartKey && attempts < 3);

  const loadUserProfile = createUserProfileLoader();

  return {
    items: await Promise.all(items.map((item) => toConversation(item, loadUserProfile))),
    nextToken: encodeToken(exclusiveStartKey)
  };
}

async function getConversation(currentUserId: string, conversationId: string) {
  const conversation = await getConversationMeta(currentUserId, conversationId);
  return toConversation(conversation, createUserProfileLoader());
}

async function getConversationMeta(currentUserId: string, conversationId: string) {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": { S: convKey(conversationId) },
        ":sk": { S: "META" }
      },
      Limit: 1
    })
  );

  const item = result.Items?.[0];
  if (!item) throw new Error("Conversation not found");
  const conversation = unmarshall(item);
  const participants = toStringArray(conversation.participantIds);
  if (!participants.includes(currentUserId)) throw new Error("Forbidden");
  return conversation;
}

async function listConversationMessages(conversationId: string, limit = 30, nextToken?: string) {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": { S: convKey(conversationId) },
        ":sk": { S: "MSG#" }
      },
      ExclusiveStartKey: decodeToken(nextToken),
      ScanIndexForward: false,
      Limit: clampLimit(limit, 30, 100)
    })
  );

  return {
    items: (result.Items ?? []).map((item) => {
      const m = unmarshall(item);
      return {
        messageId: m.messageId,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt
      };
    }),
    nextToken: encodeToken(result.LastEvaluatedKey)
  };
}

async function listMessages(currentUserId: string, conversationId: string, limit = 30, nextToken?: string) {
  await getConversationMeta(currentUserId, conversationId);
  return listConversationMessages(conversationId, limit, nextToken);
}

async function getConversationThread(
  currentUserId: string,
  conversationId: string,
  messagesLimit = 30,
  messagesNextToken?: string
) {
  const conversation = await getConversationMeta(currentUserId, conversationId);
  const loadUserProfile = createUserProfileLoader();
  const [conversationResult, messages] = await Promise.all([
    toConversation(conversation, loadUserProfile),
    listConversationMessages(conversationId, messagesLimit, messagesNextToken)
  ]);

  return {
    conversation: conversationResult,
    messages
  };
}

async function sendMessage(currentUserId: string, conversationId: string, content: string) {
  const timestamp = nowIso();
  const messageId = crypto.randomUUID();

  const conversationMeta = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": { S: convKey(conversationId) },
        ":sk": { S: "META" }
      },
      Limit: 1
    })
  );

  const convItem = conversationMeta.Items?.[0];
  if (!convItem) throw new Error("Conversation not found");
  const conv = unmarshall(convItem);
  const participants = toStringArray(conv.participantIds);
  if (!participants.includes(currentUserId)) throw new Error("Forbidden");

  await client.send(
    new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: { S: convKey(conversationId) },
              SK: { S: `MSG#${timestamp}#${messageId}` },
              entityType: { S: "MESSAGE" },
              messageId: { S: messageId },
              conversationId: { S: conversationId },
              senderId: { S: currentUserId },
              content: { S: content },
              createdAt: { S: timestamp }
            }
          }
        },
        {
          Update: {
            TableName: tableName,
            Key: { PK: { S: convKey(conversationId) }, SK: { S: "META" } },
            UpdateExpression: "SET lastMessageAt = :time, lastMessagePreview = :preview",
            ExpressionAttributeValues: {
              ":time": { S: timestamp },
              ":preview": { S: content.slice(0, 120) }
            }
          }
        },
        ...participants.map((participantId) => ({
          Put: {
            TableName: tableName,
            Item: {
              PK: { S: userKey(participantId) },
              SK: { S: membershipKey(conversationId) },
              entityType: { S: "MEMBERSHIP" },
              conversationId: { S: conversationId },
              participantIds: { SS: participants },
              lastMessageAt: { S: timestamp },
              lastMessagePreview: { S: content.slice(0, 120) },
              GSI1PK: { S: userKey(participantId) },
              GSI1SK: { S: `LAST#${timestamp}#CONV#${conversationId}` }
            }
          }
        }))
      ]
    })
  );

  return { messageId, conversationId, senderId: currentUserId, content, createdAt: timestamp };
}

async function updateConversationReceipt(currentUserId: string, conversationId: string, field: "lastDeliveredAt" | "lastReadAt") {
  await getConversationMeta(currentUserId, conversationId);
  const timestamp = nowIso();
  const updateExpression =
    field === "lastReadAt"
      ? "SET lastDeliveredAt = :time, lastReadAt = :time"
      : "SET lastDeliveredAt = :time";

  const result = await client.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: { PK: { S: userKey(currentUserId) }, SK: { S: membershipKey(conversationId) } },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: {
        ":time": { S: timestamp }
      },
      ReturnValues: "ALL_NEW"
    })
  );

  const item = result.Attributes ? unmarshall(result.Attributes) : {};
  return {
    conversationId,
    userId: currentUserId,
    deliveredAt: typeof item.lastDeliveredAt === "string" ? item.lastDeliveredAt : timestamp,
    readAt: typeof item.lastReadAt === "string" ? item.lastReadAt : null
  };
}

async function updatePresence(currentUserId: string, online: boolean) {
  const timestamp = nowIso();
  const status = online ? "online" : "offline";
  const updateExpression = online
    ? "SET onlineStatus = :status, lastHeartbeatAt = :time"
    : "SET onlineStatus = :status, lastSeenAt = :time, lastHeartbeatAt = :time";

  const result = await client.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: { PK: { S: userKey(currentUserId) }, SK: { S: presenceKey() } },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: {
        ":status": { S: status },
        ":time": { S: timestamp }
      },
      ReturnValues: "ALL_NEW"
    })
  );

  const item = result.Attributes ? unmarshall(result.Attributes) : {};
  return {
    userId: currentUserId,
    onlineStatus: item.onlineStatus === "online" ? "online" : "offline",
    lastSeenAt: typeof item.lastSeenAt === "string" ? item.lastSeenAt : null,
    lastHeartbeatAt: typeof item.lastHeartbeatAt === "string" ? item.lastHeartbeatAt : null
  };
}

async function updateTyping(currentUserId: string, conversationId: string, isTyping: boolean) {
  await getConversationMeta(currentUserId, conversationId);
  return {
    conversationId,
    userId: currentUserId,
    isTyping,
    updatedAt: nowIso()
  };
}

export const handler = async (event: AppSyncEvent) => {
  const userId = assertAuthed(event);
  const fieldName = event.fieldName ?? event.info?.fieldName;

  switch (fieldName) {
    case "startConversation":
      return startConversation(userId, String(event.arguments.otherUserEmail ?? event.arguments.otherUserId));
    case "listConversations":
      return listConversations(
        userId,
        Number(event.arguments.limit ?? 20),
        event.arguments.nextToken ? String(event.arguments.nextToken) : undefined
      );
    case "getConversation":
      return getConversation(userId, String(event.arguments.conversationId));
    case "getConversationThread":
      return getConversationThread(
        userId,
        String(event.arguments.conversationId),
        Number(event.arguments.messagesLimit ?? 30),
        event.arguments.messagesNextToken ? String(event.arguments.messagesNextToken) : undefined
      );
    case "listMessages":
      return listMessages(
        userId,
        String(event.arguments.conversationId),
        Number(event.arguments.limit ?? 30),
        event.arguments.nextToken ? String(event.arguments.nextToken) : undefined
      );
    case "sendMessage":
      return sendMessage(userId, String(event.arguments.conversationId), String(event.arguments.content ?? ""));
    case "markConversationDelivered":
      return updateConversationReceipt(userId, String(event.arguments.conversationId), "lastDeliveredAt");
    case "markConversationRead":
      return updateConversationReceipt(userId, String(event.arguments.conversationId), "lastReadAt");
    case "updatePresence":
      return updatePresence(userId, Boolean(event.arguments.online));
    case "updateTyping":
      return updateTyping(userId, String(event.arguments.conversationId), Boolean(event.arguments.isTyping));
    case "onMessageSent":
    case "onConversationReceiptUpdated":
    case "onPresenceChanged":
    case "onTypingChanged":
      return null;
    default:
      throw new Error(`Unknown field ${fieldName}`);
  }
};
