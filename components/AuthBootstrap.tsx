"use client";

import "aws-amplify/auth/enable-oauth-listener";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";

export function AuthBootstrap() {
  ensureAmplifyConfigured();
  return null;
}
