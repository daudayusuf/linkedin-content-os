import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkedIn Content OS",
  description: "A premium dashboard for content management and automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-slate-950 text-slate-100">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden h-screen bg-slate-900/50">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
