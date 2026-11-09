import type { Metadata } from "next";
import Providers from "@/components/providers";
import OfflineBanner from "@/components/offline-banner";
import PwaRegister from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolERP — School Management System",
  description: "Multi-tenant School ERP with role-based access control",
  manifest: "/manifest.json",
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e3a8a" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <PwaRegister />
          <OfflineBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
