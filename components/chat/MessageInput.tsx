"use client";

import { FormEvent, useState } from "react";

type Props = {
  onSend: (content: string) => Promise<void>;
};

export function MessageInput({ onSend }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type a message"
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #334155",
          background: "#0b1220",
          color: "#e2e8f0"
        }}
      />
      <button
        type="submit"
        disabled={sending}
        style={{ padding: "0 16px", borderRadius: 8, border: 0, background: "#2563eb", color: "white" }}
      >
        Send
      </button>
    </form>
  );
}
