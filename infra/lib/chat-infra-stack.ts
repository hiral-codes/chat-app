import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

const urlsFromConfig = (value: unknown, fallback: string[]) => {
  if (typeof value !== "string") return fallback;

  const urls = value
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return urls.length ? urls : fallback;
};

export class ChatInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const callbackUrls = urlsFromConfig(
      this.node.tryGetContext("callbackUrls") ?? process.env.COGNITO_CALLBACK_URLS,
      ["http://localhost:3000/api/auth/callback"]
    );
    const logoutUrls = urlsFromConfig(
      this.node.tryGetContext("logoutUrls") ?? process.env.COGNITO_LOGOUT_URLS,
      ["http://localhost:3000/login"]
    );

    const userPool = new cognito.UserPool(this, "ChatUserPool", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true }
      }
    });

    const userPoolClient = new cognito.UserPoolClient(this, "ChatUserPoolClient", {
      userPool,
      oAuth: {
        callbackUrls,
        logoutUrls,
        flows: { authorizationCodeGrant: true }
      },
      generateSecret: false
    });

    new cognito.UserPoolDomain(this, "ChatUserPoolDomain", {
      userPool,
      cognitoDomain: {
        domainPrefix: "chatapprealtimemvp"
      }
    });

    const chatTable = new dynamodb.Table(this, "ChatTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    chatTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING }
    });

    chatTable.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING }
    });

    const api = new appsync.GraphqlApi(this, "ChatApi", {
      name: "chat-api",
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, "..", "appsync", "schema.graphql")),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool }
        }
      },
      xrayEnabled: true
    });

    const resolverFn = new lambdaNode.NodejsFunction(this, "ChatResolverFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "..", "lambda", "chat-resolver.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(10),
      environment: {
        CHAT_TABLE_NAME: chatTable.tableName,
        USER_POOL_ID: userPool.userPoolId
      }
    });

    chatTable.grantReadWriteData(resolverFn);
    resolverFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:ConditionCheckItem"],
        resources: [chatTable.tableArn]
      })
    );
    resolverFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:ListUsers"],
        resources: [userPool.userPoolArn]
      })
    );

    const lambdaDs = api.addLambdaDataSource("ChatLambdaDataSource", resolverFn);
    const fields = [
      "listConversations",
      "getConversation",
      "getConversationThread",
      "listMessages",
      "startConversation",
      "sendMessage",
      "onMessageSent"
    ];

    fields.forEach((fieldName) => {
      const queryFields = ["listConversations", "getConversation", "getConversationThread", "listMessages"];
      lambdaDs.createResolver(`Resolver${fieldName}`, {
        typeName: fieldName === "onMessageSent" ? "Subscription" : queryFields.includes(fieldName) ? "Query" : "Mutation",
        fieldName
      });
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "GraphqlApiUrl", { value: api.graphqlUrl });
    new cdk.CfnOutput(this, "GraphqlApiId", { value: api.apiId });
    new cdk.CfnOutput(this, "ChatTableName", { value: chatTable.tableName });
  }
}
