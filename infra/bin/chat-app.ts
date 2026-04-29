import * as cdk from "aws-cdk-lib";
import { ChatInfraStack } from "../lib/chat-infra-stack";

const app = new cdk.App();

new ChatInfraStack(app, "ChatInfraStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1"
  }
});
