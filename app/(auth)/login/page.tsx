"use client";

import { useEffect, useState } from "react";
import { fetchAuthSession, signInWithRedirect } from "aws-amplify/auth";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";

ensureAmplifyConfigured();

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const redirectIfSignedIn = async () => {
      const session = await fetchAuthSession();
      if (session.tokens) window.location.replace("/chat");
    };

    redirectIfSignedIn().catch(() => {
      // Staying on the login page is fine when there is no active session.
    });
  }, []);

  const continueWithSocialLogin = async () => {
    setIsSigningIn(true);

    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        window.location.replace("/chat");
        return;
      }

      await signInWithRedirect();
    } catch (error) {
      if (error instanceof Error && error.name === "UserAlreadyAuthenticatedException") {
        window.location.replace("/chat");
        return;
      }

      setIsSigningIn(false);
      throw error;
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: 360, background: "#111827", padding: 24, borderRadius: 12, border: "1px solid #1f2937" }}>
        <h1 style={{ marginTop: 0 }}>Sign in</h1>
        <p style={{ color: "#94a3b8", marginBottom: 16 }}>Use your configured social provider through Cognito Hosted UI.</p>
        <button
          disabled={isSigningIn}
          onClick={continueWithSocialLogin}
          style={{ width: "100%", padding: 12, borderRadius: 8, border: 0, background: "#2563eb", color: "white", cursor: "pointer" }}
        >
          {isSigningIn ? (
            <span className="button-loading-content">
              <span className="button-spinner" aria-hidden="true" />
              Continuing
            </span>
          ) : (
            "Continue with Social Login"
          )}
        </button>
      </div>
    </main>
  );
}
