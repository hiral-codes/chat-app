"use client";

import { Amplify } from "aws-amplify";

let configured = false;

export function ensureAmplifyConfigured() {
  if (configured) return;
  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT!,
        region: process.env.NEXT_PUBLIC_AWS_REGION!,
        defaultAuthMode: "userPool"
      }
    },
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        loginWith: {
          oauth: {
            domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
            scopes: ["openid", "email", "profile"],
            redirectSignIn: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!],
            redirectSignOut: [process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI!],
            responseType: "code"
          }
        }
      }
    }
  });
  configured = true;
}
