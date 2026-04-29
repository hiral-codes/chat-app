import {
  DynamoDBClient,
  QueryCommand,
  TransactWriteItemsCommand
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import crypto from "node:crypto";

const client = new DynamoDBClient({});
const tableName = process.env.CHAT_TABLE_NAME ?? "";

type AppSyncEvent = {
  fieldName: string;
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
const participantHash = (a: string, b: string) => [a, b].sort().join("#");

async function startConversation(currentUserId: string, otherUserId: string) {
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
    return unmarshall(existing.Items[0]);
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
              SK: { S: `CONV#${createdAt}#${conversationId}` },
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
    participants: conversation.participantIds.map((id) => ({ userId: id, displayName: id, avatarUrl: null })),
    lastMessagePreview: null,
    lastMessageAt: createdAt
  };
}

async function listConversations(currentUserId: string, limit = 20, nextToken?: string) {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: userKey(currentUserId) }
      },
      ExclusiveStartKey: decodeToken(nextToken),
      ScanIndexForward: false,
      Limit: limit
    })
  );

  const items = (result.Items ?? []).map((i) => unmarshall(i));
  return {
    items: items.map((item) => ({
      conversationId: item.conversationId,
      participants: (item.participantIds ?? []).map((id: string) => ({ userId: id, displayName: id, avatarUrl: null })),
      lastMessagePreview: item.lastMessagePreview ?? null,
      lastMessageAt: item.lastMessageAt ?? null
    })),
    nextToken: encodeToken(result.LastEvaluatedKey)
  };
}

async function listMessages(currentUserId: string, conversationId: string, limit = 30, nextToken?: string) {
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

  const meta = conversationMeta.Items?.[0];
  if (!meta) throw new Error("Conversation not found");
  const participants = (unmarshall(meta).participantIds ?? []) as string[];
  if (!participants.includes(currentUserId)) throw new Error("Forbidden");

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
      Limit: limit
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
  const participants = conv.participantIds as string[];
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
              SK: { S: `CONV#${timestamp}#${conversationId}` },
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

export const handler = async (event: AppSyncEvent) => {
  const userId = assertAuthed(event);

  switch (event.fieldName) {
    case "startConversation":
      return startConversation(userId, String(event.arguments.otherUserId));
    case "listConversations":
      return listConversations(
        userId,
        Number(event.arguments.limit ?? 20),
        event.arguments.nextToken ? String(event.arguments.nextToken) : undefined
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
    case "onMessageSent":
      return null;
    default:
      throw new Error(`Unknown field ${event.fieldName}`);
  }
};
