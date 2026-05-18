import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Notenrechner v2",
  description: "Swiss grade calculator for students with BMS, EFZ, and required-grade support.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
