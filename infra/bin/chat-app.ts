import * as cdk from "aws-cdk-lib";
import { BackendStage, ChatInfraStack } from "../lib/chat-infra-stack";

const app = new cdk.App();
const stage = (app.node.tryGetContext("stage") ?? process.env.APP_STAGE ?? "local") as BackendStage;
const allowedStages: BackendStage[] = ["local", "staging", "production"];

if (!allowedStages.includes(stage)) {
  throw new Error(`Invalid stage "${stage}". Use one of: ${allowedStages.join(", ")}.`);
}

new ChatInfraStack(app, `ChatInfraStack-${stage}`, {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? process.env.NEXT_PUBLIC_AWS_REGION ?? "ap-south-1"
  }
});
