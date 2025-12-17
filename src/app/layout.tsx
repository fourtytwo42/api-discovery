import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/provider";
import Navbar from "@/components/layout/Navbar";

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
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

