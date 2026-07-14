import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emergency Midas",
  description:
    "Sistema di backup per le officine Midas Italia in caso di outage del gestionale",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-paper text-ink font-body antialiased">
        {children}
      </body>
    </html>
  );
}
