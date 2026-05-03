"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const navItems = [
  { href: "/chat", label: "Chats", icon: "chat" },
  { href: "/updates", label: "Updates", icon: "updates" },
  { href: "/archived", label: "Archived", icon: "archive" }
];

function Icon({ name }: { name: string }) {
  if (name === "chat") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6.5C5 4.6 6.6 3 8.5 3h7C17.4 3 19 4.6 19 6.5v5c0 1.9-1.6 3.5-3.5 3.5h-4.2L6.8 19v-4H8.5C6.6 15 5 13.4 5 11.5z" />
      </svg>
    );
  }

  if (name === "updates") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4a8 8 0 1 1-7.7 10.2h2.2A6 6 0 1 0 8 6.1V9H6V3h6v2H8.9A8 8 0 0 1 12 4z" />
      </svg>
    );
  }

  if (name === "archive") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h14l1 4H4zm1 6h12v8.5c0 .8-.7 1.5-1.5 1.5h-9C6.7 20 6 19.3 6 18.5zm4 2v2h4v-2z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8m0-5 2 2.2 3-.5.9 2.9 2.8 1.2-1.3 2.7 1.3 2.7-2.8 1.2-.9 2.9-3-.5L12 21l-2-2.2-3 .5-.9-2.9-2.8-1.2 1.3-2.7-1.3-2.7 2.8-1.2.9-2.9 3 .5z" />
    </svg>
  );
}

export function AppShell({ children }: Props) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary navigation">
        <Link className="sidebar-brand" href="/chat" aria-label="Chat home">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path className="brand-bubble" d="M8 21.8C8 13.6 14.8 7 23.3 7h1.4C33.2 7 40 13.6 40 21.8S33.2 36.6 24.7 36.6h-4.8l-7.4 5.1v-8.2A14.4 14.4 0 0 1 8 21.8Z" />
            <path className="brand-spark" d="M24 12.4 26.7 19l7.1 1.1-5.2 4.9 1.2 7-5.8-3.3-5.8 3.3 1.2-7-5.2-4.9 7.1-1.1z" />
          </svg>
        </Link>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href === "/chat" && pathname.startsWith("/chat/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className={`sidebar-icon ${active ? "sidebar-icon-active" : ""}`}
              >
                <Icon name={item.icon} />
              </Link>
            );
          })}
        </nav>
        <Link
          href="/profile"
          aria-label="Settings and profile"
          title="Settings and profile"
          className={`sidebar-icon sidebar-settings ${pathname === "/profile" ? "sidebar-icon-active" : ""}`}
        >
          <Icon name="settings" />
        </Link>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
