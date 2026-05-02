"use client";

import "aws-amplify/auth/enable-oauth-listener";
import { Amplify } from "aws-amplify";

const publicEnv = {
  NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
  NEXT_PUBLIC_APPSYNC_ENDPOINT: process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT,
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
  NEXT_PUBLIC_COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI,
  NEXT_PUBLIC_COGNITO_LOGOUT_URI: process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI
};

const requiredPublicEnv = (key: keyof typeof publicEnv) => {
  const value = publicEnv[key];
  if (!value) {
    throw new Error(`Missing public env var: ${key}. Restart the Next.js dev server after updating .env.local.`);
  }
  return value;
};

export function ensureAmplifyConfigured() {
  const region = requiredPublicEnv("NEXT_PUBLIC_AWS_REGION");
  const appsyncEndpoint = requiredPublicEnv("NEXT_PUBLIC_APPSYNC_ENDPOINT");
  const userPoolId = requiredPublicEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID");
  const userPoolClientId = requiredPublicEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID");
  const cognitoDomain = requiredPublicEnv("NEXT_PUBLIC_COGNITO_DOMAIN");
  const redirectSignIn = requiredPublicEnv("NEXT_PUBLIC_COGNITO_REDIRECT_URI");
  const redirectSignOut = requiredPublicEnv("NEXT_PUBLIC_COGNITO_LOGOUT_URI");

  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: appsyncEndpoint,
        region,
        defaultAuthMode: "userPool"
      }
    },
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain: cognitoDomain,
            scopes: ["openid", "email", "profile"],
            redirectSignIn: [redirectSignIn],
            redirectSignOut: [redirectSignOut],
            responseType: "code"
          }
        }
      }
    }
  });
}
