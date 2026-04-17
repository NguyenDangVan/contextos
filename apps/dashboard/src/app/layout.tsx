import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "ContextOS — The Memory Layer for LLM Apps",
  description: "Drop-in SDK + dashboard that gives every LLM app persistent memory, cost optimization, and observability.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content animate-fade">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
