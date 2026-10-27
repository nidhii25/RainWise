import type { Metadata } from "next";

import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "RainWise — Rooftop rainwater harvesting assessment",
  description:
    "Turn roof dimensions, local rainfall, and site conditions into a sized tank, a recharge structure, and a buildable parts list.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
