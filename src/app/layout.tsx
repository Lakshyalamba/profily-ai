import type { Metadata } from "next";
import localFont from "next/font/local";
import { ExperienceShell } from "@/components/design-motion";
const manrope = localFont({
  src: "../../assets/webfonts/manrope/Manrope.ttf",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
});
import { Header, Footer } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Profily AI — Your experience, in conversation",
    template: "%s | Profily AI",
  },
  description:
    "An interactive career profile that connects every answer to evidence. Explore a clearly labeled fictional demo.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={manrope.variable}>
        <a className="skip-link" href="#page-content">
          Skip to content
        </a>
        <Header />
        <main id="main">
          <ExperienceShell>{children}</ExperienceShell>
        </main>
        <noscript>
          <style>
            {".reveal{opacity:1!important;transform:none!important}"}
          </style>
        </noscript>
        <Footer />
      </body>
    </html>
  );
}
