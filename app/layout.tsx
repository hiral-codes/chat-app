import type { Metadata } from "next";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "Realtime Chat MVP",
  description: "WhatsApp-like realtime chat using AWS AppSync and Next.js"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
