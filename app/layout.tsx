
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TriageIQ | AI Support Investigation",
  description:
    "TriageIQ is an AI-powered support investigation and triage platform for the fictional BookFlow SaaS application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
