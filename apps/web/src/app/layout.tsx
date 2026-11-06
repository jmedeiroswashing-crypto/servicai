import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { SectionTabs } from "@/components/SectionTabs";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SplashIntro } from "@/components/home/SplashIntro";
import { HERO_IMAGES } from "@/lib/images";
import { BusinessModeGate } from "@/components/BusinessModeGate";
import { ServiceTypeGate } from "@/components/ServiceTypeGate";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const SITE_URL = "https://servicai.vercel.app";
const SITE_DESCRIPTION =
  "Encontre profissionais perto de você, receba propostas grátis e converse pelo chat antes de contratar.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ServiçAi: encontre o profissional certo, perto de você",
    template: "%s | ServiçAi",
  },
  description: SITE_DESCRIPTION,
  applicationName: "ServiçAi",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "ServiçAi",
    url: SITE_URL,
    title: "ServiçAi: encontre o profissional certo, perto de você",
    description: SITE_DESCRIPTION,
    images: [HERO_IMAGES[0]?.src ?? "/logo-icon.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1c33",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SplashIntro />
          <Navbar />
          <SectionTabs />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomNav />
          <WhatsAppButton />
          <BusinessModeGate />
          <ServiceTypeGate />
        </Providers>
      </body>
    </html>
  );
}
