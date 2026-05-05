"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onSend: (content: string) => Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
};

const typingIdleMs = 2500;
const typingRepeatMs = 3000;

export function MessageInput({ onSend, onTypingChange }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingSentRef = useRef(false);
  const lastTypingSentAtRef = useRef(0);
  const typingIdleTimeoutRef = useRef<number | undefined>(undefined);

  const clearTypingIdleTimeout = useCallback(() => {
    if (typingIdleTimeoutRef.current) {
      window.clearTimeout(typingIdleTimeoutRef.current);
      typingIdleTimeoutRef.current = undefined;
    }
  }, []);

  const sendTypingState = useCallback(
    (isTyping: boolean, force = false) => {
      if (!onTypingChange) return;
      const now = Date.now();
      if (isTyping) {
        if (!force && typingSentRef.current && now - lastTypingSentAtRef.current < typingRepeatMs) return;
        typingSentRef.current = true;
        lastTypingSentAtRef.current = now;
        onTypingChange(true);
        return;
      }

      if (!force && !typingSentRef.current) return;
      typingSentRef.current = false;
      lastTypingSentAtRef.current = now;
      onTypingChange(false);
    },
    [onTypingChange]
  );

  const scheduleTypingIdle = useCallback(() => {
    clearTypingIdleTimeout();
    typingIdleTimeoutRef.current = window.setTimeout(() => {
      sendTypingState(false);
    }, typingIdleMs);
  }, [clearTypingIdleTimeout, sendTypingState]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setValue(nextValue);

    if (nextValue.trim()) {
      sendTypingState(true);
      scheduleTypingIdle();
      return;
    }

    clearTypingIdleTimeout();
    sendTypingState(false);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");
    clearTypingIdleTimeout();
    sendTypingState(false, true);
    inputRef.current?.focus();

    try {
      await onSend(trimmed);
    } finally {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    return () => {
      clearTypingIdleTimeout();
      sendTypingState(false);
    };
  }, [clearTypingIdleTimeout, sendTypingState]);

  return (
    <form onSubmit={onSubmit} className="message-input-form">
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
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
