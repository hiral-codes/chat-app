"use client";

import { signInWithRedirect } from "aws-amplify/auth";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: 360, background: "#111827", padding: 24, borderRadius: 12, border: "1px solid #1f2937" }}>
        <h1 style={{ marginTop: 0 }}>Sign in</h1>
        <p style={{ color: "#94a3b8", marginBottom: 16 }}>Use your configured social provider through Cognito Hosted UI.</p>
        <button
          onClick={() => signInWithRedirect()}
          style={{ width: "100%", padding: 12, borderRadius: 8, border: 0, background: "#2563eb", color: "white", cursor: "pointer" }}
        >
          Continue with Social Login
        </button>
      </div>
    </main>
  );
}
