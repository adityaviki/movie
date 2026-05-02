import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
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
  title: "Movie Manager",
  description: "Manage your movie collection and watchlist",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <header className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
              <a href="/movies" className="text-xl font-bold tracking-tight">
                Movie Manager
              </a>
              <div className="flex items-center gap-4">
                <nav className="flex gap-4">
                  <a
                    href="/movies"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Browse
                  </a>
                  <a
                    href="/movies/new"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Add Movie
                  </a>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
