import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import GlobalWhatsAppTracker from "@/components/analytics/GlobalWhatsAppTracker";
import { Toaster } from "@/components/ui/toast";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Opturon | Marketing + AI Automation",
  description: "Transformando marcas en experiencias digitales.",
  openGraph: {
    title: "Opturon",
    description: "Traemos el futuro a tu negocio",
    url: "https://opturon.com",
    siteName: "Opturon",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={font.variable}>
      <head>
        <meta name="facebook-domain-verification" content="746g3s3mo0hlrfsf1fzvoefep9rrbh" />
      </head>
      <body className="font-sans bg-bg text-text antialiased">
        {children}
        <Toaster />
        <GoogleAnalytics />
        <GlobalWhatsAppTracker />
      </body>
    </html>
  );
}
