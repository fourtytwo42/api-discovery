import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Discovery Platform",
  description: "Automated API documentation generator via proxy-based network interception",
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

