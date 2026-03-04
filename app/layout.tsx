import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || "G-FL6RVZW90M";

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
      <body className="font-sans bg-bg text-text antialiased">
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
