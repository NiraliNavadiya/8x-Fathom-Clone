import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { AskMeetly } from "@/components/ask-meetly";
import { TopNav } from "@/components/top-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meetly",
  description: "Record, transcribe and search your meetings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          {/* The nav reads ?q=, so it renders on the client after the shell. */}
          <Suspense fallback={<div className="h-16 border-b" />}>
            <TopNav />
          </Suspense>
          {children}
          <AskMeetly />
          <Toaster
            theme="dark"
            position="bottom-left"
            style={
              {
                "--normal-bg": "var(--popover)",
                "--normal-text": "var(--popover-foreground)",
                "--normal-border": "var(--border)",
              } as React.CSSProperties
            }
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
