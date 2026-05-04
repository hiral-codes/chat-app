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
    <form onSubmit={onSubmit} className="message-input-form">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type a message"
        className="message-input-field"
      />
      <button
        type="submit"
        aria-label="Send message"
        disabled={!value.trim()}
        className="message-send-button"
      >
        <span aria-hidden="true" className="message-send-icon" />
      </button>
    </form>
  );
}
