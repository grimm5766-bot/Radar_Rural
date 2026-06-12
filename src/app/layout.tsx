import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Switch Rural | Gestão Agrícola",
  description: "MVP de gestão da lavoura de soja.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
