"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassButton, GlassModal, GlassPanel } from "@/components/ui/Glass";

type Status = {
  id: string;
  text: string;
  createdAt: string;
  expiresAt: string;
};

const oneDayMs = 24 * 60 * 60 * 1000;

export default function UpdatesPage() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const visibleStatuses = useMemo(() => statuses.filter((status) => new Date(status.expiresAt).getTime() > nowMs), [nowMs, statuses]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const createStatus = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const createdAt = new Date();
    setStatuses((items) => [
      {
        id: crypto.randomUUID(),
        text,
        createdAt: createdAt.toISOString(),
        expiresAt: new Date(createdAt.getTime() + oneDayMs).toISOString()
      },
      ...items
    ]);
    setDraft("");
    setComposerOpen(false);
  };

  return (
    <AppShell>
      <main className="page-stack">
        <GlassPanel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0 }}>Updates</h1>
              <p className="muted-copy">Text statuses stay visible for 24 hours.</p>
            </div>
            <GlassButton variant="primary" onClick={() => setComposerOpen(true)}>
              New status
            </GlassButton>
          </div>
        </GlassPanel>

        <GlassPanel>
          {visibleStatuses.length ? (
            <div className="status-list">
              {visibleStatuses.map((status) => (
                <article className="status-item" key={status.id}>
                  <p>{status.text}</p>
                  <span>Expires {new Date(status.expiresAt).toLocaleTimeString()}</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No active updates yet.</p>
          )}
        </GlassPanel>
      </main>

      <GlassModal open={composerOpen} title="Create status" onClose={() => setComposerOpen(false)}>
        <form onSubmit={createStatus} className="modal-form">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Share a text update" rows={5} />
          <GlassButton variant="primary" type="submit">
            Post update
          </GlassButton>
        </form>
      </GlassModal>
    </AppShell>
  );
}
