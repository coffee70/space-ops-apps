import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AppProviders, type OperatorMode } from "@/components/app-providers";
import { KeyboardShortcutsHandler } from "@/components/keyboard-shortcuts-handler";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlatformShell } from "@/platform/shell/platform-shell";
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
  title: "Aentx Space OS",
  description: "Search and explore spacecraft telemetry with semantic search and LLM explanations",
};

function parseOperatorMode(value: string | undefined): OperatorMode {
  return value === "high-contrast" || value === "large-type" ? value : "default";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialOperatorMode = parseOperatorMode(
    (await cookies()).get("operator_mode")?.value,
  );

  return (
    <html lang="en" className="dark h-full overflow-hidden">
      <body
        data-operator-mode={initialOperatorMode}
        className={`${geistSans.variable} ${geistMono.variable} flex h-dvh min-h-0 flex-col overflow-hidden antialiased`}
      >
        <a href="#main-content" className="sr-only">
          Skip to main content
        </a>
        <AppProviders initialOperatorMode={initialOperatorMode}>
          <TooltipProvider>
            <KeyboardShortcutsHandler />
            <PlatformShell>{children}</PlatformShell>
          </TooltipProvider>
        </AppProviders>
      </body>
    </html>
  );
}
