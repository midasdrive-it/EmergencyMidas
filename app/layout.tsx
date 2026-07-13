import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Midas Backup Officina",
  description:
    "Strumento di consultazione di emergenza per le officine Midas Italia",
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
