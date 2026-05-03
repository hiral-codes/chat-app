"use client";

import { CSSProperties, ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type GlassButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

type GlassAlertProps = {
  children: ReactNode;
  tone?: "info" | "danger" | "success";
};

type GlassModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function GlassPanel({ children, className = "", style }: GlassPanelProps) {
  return (
    <section className={`glass-panel ${className}`} style={style}>
      {children}
    </section>
  );
}

export function GlassButton({ children, className = "", variant = "ghost", ...props }: GlassButtonProps) {
  return (
    <button className={`glass-button glass-button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function GlassAlert({ children, tone = "info" }: GlassAlertProps) {
  return <div className={`glass-alert glass-alert-${tone}`}>{children}</div>;
}

export function GlassModal({ open, title, children, onClose }: GlassModalProps) {
  if (!open) return null;

  return (
    <div className="glass-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="glass-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="glass-modal-header">
          <h2>{title}</h2>
          <button type="button" aria-label="Close modal" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
