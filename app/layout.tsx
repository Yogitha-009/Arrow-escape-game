import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arrow Escape",
  description: "A puzzle game about tapping arrows out of a maze.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
