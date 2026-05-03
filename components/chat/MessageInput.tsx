"use client";

import { FormEvent, useState } from "react";

type Props = {
  onSend: (content: string) => Promise<void>;
};

export function MessageInput({ onSend }: Props) {
  const [value, setValue] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");
    await onSend(trimmed);
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type a message"
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 8,
          border: "1px solid rgba(148, 163, 184, 0.32)",
          background: "rgba(255, 255, 255, 0.72)",
          color: "#172033"
        }}
      />
      <button
        type="submit"
        aria-label="Send message"
        disabled={!value.trim()}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: 0,
          background: value.trim() ? "linear-gradient(135deg, #0ea5e9, #2563eb)" : "rgba(148, 163, 184, 0.26)",
          color: "white",
          display: "grid",
          placeItems: "center",
          cursor: value.trim() ? "pointer" : "not-allowed",
          boxShadow: value.trim() ? "0 10px 24px rgba(37, 99, 235, 0.28)" : "none",
          transition: "background 160ms ease, box-shadow 160ms ease"
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 0,
            height: 0,
            borderTop: "7px solid transparent",
            borderBottom: "7px solid transparent",
            borderLeft: "13px solid currentColor",
            transform: "translateX(2px)"
          }}
        />
      </button>
    </form>
  );
}
