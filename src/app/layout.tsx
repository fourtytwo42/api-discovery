import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/provider";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

