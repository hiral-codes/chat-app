"use client";

import { generateClient } from "aws-amplify/api";
import { ensureAmplifyConfigured } from "./amplify-config";

ensureAmplifyConfigured();

export const appsyncClient = generateClient();
