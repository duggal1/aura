import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Aura - Emotional AI Chat",
  description: "An emotionally intelligent AI chat interface",
  authors: [{ name: "Aura Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="font-serif antialiased selection:bg-violet-500/20 selection:text-violet-900 dark:selection:text-violet-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
