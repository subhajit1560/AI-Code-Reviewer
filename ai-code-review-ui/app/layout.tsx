import type { Metadata } from "next";
import { Fraunces, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackgroundVideo from "@/components/BackgroundVideo";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import PageTransition from "@/components/PageTransition";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Code Reviewer — Intelligent Code Analysis",
  description: "Get instant, structured AI-powered code reviews with categorized feedback on bugs, security, performance, and best practices. Powered by Google Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${fraunces.variable} ${geistMono.variable} antialiased`}
      >
        <SmoothScrollProvider>
          <BackgroundVideo />
          <PageTransition>
            {children}
          </PageTransition>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
