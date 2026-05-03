"use client";

import { useEffect } from "react";
import { signOut } from "aws-amplify/auth";
import { Avatar } from "@/components/chat/Avatar";
import { AppShell } from "@/components/layout/AppShell";
import { GlassButton, GlassPanel } from "@/components/ui/Glass";
import { ensureAmplifyConfigured } from "@/lib/aws/amplify-config";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { initializeChat } from "@/lib/store/chatSlice";

ensureAmplifyConfigured();

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.chat);

  useEffect(() => {
    dispatch(initializeChat())
      .unwrap()
      .catch((reason) => {
        if (reason?.message === "Unauthenticated") window.location.href = "/login";
      });
  }, [dispatch]);

  return (
    <AppShell>
      <main className="page-stack">
        <GlassPanel>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar user={currentUser} size={72} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0 }}>{currentUser?.displayName ?? "Profile"}</h1>
              <p className="muted-copy">{currentUser?.userId ?? "Signed-in user settings"}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <h2 style={{ marginTop: 0 }}>Settings</h2>
          <div className="settings-grid">
            <label>
              Display name
              <input value={currentUser?.displayName ?? ""} readOnly />
            </label>
            <label>
              Avatar URL
              <input value={currentUser?.avatarUrl ?? ""} readOnly placeholder="No avatar configured" />
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <GlassButton variant="danger" onClick={() => signOut()}>
              Logout
            </GlassButton>
          </div>
        </GlassPanel>
      </main>
    </AppShell>
  );
}
