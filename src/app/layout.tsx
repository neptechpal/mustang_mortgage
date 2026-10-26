import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mustang Mortgage", template: "%s – Mustang Mortgage" },
  description: "Mustang Mortgage — home loans, refinancing and first home buyer finance across Australia.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body className="antialiased">{children}</body>
    </html>
  );
}
