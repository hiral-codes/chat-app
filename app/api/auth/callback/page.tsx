"use client";

import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";

ensureAmplifyConfigured();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    let cancelled = false;

    const completeSignIn = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("error") || !params.has("code")) {
        window.location.replace("/login");
        return;
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const session = await fetchAuthSession();
        if (session.tokens) {
          window.location.replace("/chat");
          return;
        }
        await wait(250);
      }

      if (!cancelled) {
        setMessage("Sign in took too long. Sending you back to login...");
        window.location.replace("/login");
      }
    };

    completeSignIn().catch(() => {
      if (!cancelled) window.location.replace("/login");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <p style={{ color: "#94a3b8" }}>{message}</p>
    </main>
  );
}
