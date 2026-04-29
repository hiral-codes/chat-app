import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hasCode = url.searchParams.has("code");

  // Cognito redirects here after OAuth; Amplify listener handles token exchange on client.
  return NextResponse.redirect(new URL(hasCode ? "/chat" : "/login", url.origin));
}
