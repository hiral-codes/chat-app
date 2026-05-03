"use client";

import { User } from "@/lib/types/chat";

type Props = {
  user?: Pick<User, "displayName" | "avatarUrl">;
  label?: string;
  size?: number;
};

const initialsFor = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2);
  return initials?.toUpperCase() || "?";
};

export function Avatar({ user, label, size = 40 }: Props) {
  const name = user?.displayName || label || "User";
  const avatarUrl = user?.avatarUrl || undefined;

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    flex: "0 0 auto",
    border: "1px solid rgba(148, 163, 184, 0.32)"
  };

  if (avatarUrl) {
    return (
      <span
        aria-label={`${name} avatar`}
        title={name}
        style={{
          ...baseStyle,
          display: "inline-block",
          backgroundColor: "#111827",
          backgroundImage: `url("${avatarUrl}")`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover"
        }}
      />
    );
  }

  return (
    <span
      aria-label={`${name} avatar`}
      title={name}
      style={{
        ...baseStyle,
        display: "inline-grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #2563eb, #0f766e)",
        color: "#f8fafc",
        fontSize: Math.max(11, Math.floor(size * 0.36)),
        fontWeight: 700
      }}
    >
      {initialsFor(name)}
    </span>
  );
}
