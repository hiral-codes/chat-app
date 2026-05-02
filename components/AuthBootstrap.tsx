"use client";

import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";

export function AuthBootstrap() {
  ensureAmplifyConfigured();
  return null;
}
