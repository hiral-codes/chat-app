"use client";

import { ReactNode, useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";

ensureAmplifyConfigured();

export function RequireAuth({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchAuthSession()
      .then((session) => {
        if (cancelled) return;

        if (session.tokens) {
          setIsAuthenticated(true);
          return;
        }

        window.location.replace("/login");
      })
      .catch(() => {
        if (!cancelled) window.location.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
        <p style={{ color: "#94a3b8" }}>Checking sign in...</p>
      </main>
    );
  }

  return children;
}
