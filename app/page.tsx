"use client";

import { useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";

ensureAmplifyConfigured();

export default function HomePage() {
  useEffect(() => {
    fetchAuthSession()
      .then((session) => {
        window.location.replace(session.tokens ? "/chat" : "/login");
      })
      .catch(() => {
        window.location.replace("/login");
      });
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="loading-state" role="status" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <span>Checking sign in</span>
      </div>
    </main>
  );
}
