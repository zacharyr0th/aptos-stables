import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React, { ReactNode } from "react";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fontVars = `${geistSans.variable} ${geistMono.variable}`;

export const metadata = {
  title: "Aptos Stablecoin Supply",
  description: "Aptos Stablecoin Supply",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVars} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <main>
            {children}
          </main>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
