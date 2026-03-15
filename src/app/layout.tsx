import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoiseCancel — E2 Studio",
  description: "Production intelligence for E2 Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
