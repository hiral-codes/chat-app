"use client";

import { FormEvent, useState } from "react";

type Props = {
  onSend: (content: string) => Promise<void>;
  sending?: boolean;
};

export function MessageInput({ onSend, sending = false }: Props) {
  const [value, setValue] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    await onSend(trimmed);
    setValue("");
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type a message"
        disabled={sending}
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
        {sending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
