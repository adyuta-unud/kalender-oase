import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getBaseUrl } from "@/lib/site";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Kalender OASE - Universitas Udayana",
    template: "%s | Kalender OASE - Universitas Udayana",
  },
  description:
    "Kalender OASE Universitas Udayana (UNUD). Sinkronisasi otomatis jadwal tugas, kuis, dan deadline dari oase.unud.ac.id ke Google Calendar secara real-time.",
  keywords: [
    "Kalender OASE - Universitas Udayana",
    "Kalender OASE",
    "OASE",
    "OASE UNUD",
    "OASE Universitas Udayana",
    "oase.unud.ac.id",
    "https://oase.unud.ac.id",
    "Moodle OASE UNUD",
    "Portal OASE",
    "Jadwal OASE UNUD",
    "Deadline OASE",
    "Tugas OASE UNUD",
    "Login OASE UNUD",
    "Google Calendar OASE",
    "Sync OASE ke Google Calendar",
    "Kalender Akademik UNUD",
    "SSO UNUD",
    "Informatika UNUD",
    "Universitas Udayana",
  ],
  authors: [{ name: "Informatika Universitas Udayana" }],
  creator: "Civitas Akademika Universitas Udayana",
  publisher: "Kalender OASE",
  applicationName: "Kalender OASE - Universitas Udayana",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Kalender OASE - Universitas Udayana",
    description:
      "Portal sinkronisasi otomatis jadwal tugas, kuis, dan deadline dari OASE Universitas Udayana (oase.unud.ac.id) ke Google Calendar.",
    url: baseUrl,
    siteName: "Kalender OASE - Universitas Udayana",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/logo.webp",
        width: 512,
        height: 512,
        alt: "Logo Kalender OASE - Universitas Udayana",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Kalender OASE - Universitas Udayana",
    description:
      "Sinkronisasi otomatis tugas dan deadline dari OASE Universitas Udayana (oase.unud.ac.id) ke Google Calendar.",
    images: ["/logo.webp"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  verification: {
    google: "K_u803Dwnf5Z-mC49FhKpp58pmwK9Ofq7pKz3nvpTqw",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Rich WebApplication + WebSite Schema JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${baseUrl}#webapp`,
        name: "Kalender OASE - Universitas Udayana",
        alternateName: [
          "Kalender OASE",
          "OASE UNUD",
          "OASE Universitas Udayana",
          "OASE Moodle UNUD",
          "oase.unud.ac.id",
          "OASE Calendar",
          "Portal OASE UNUD",
        ],
        url: baseUrl,
        description:
          "Aplikasi integrasi akademik untuk menyinkronkan jadwal tugas kuliah, kuis, dan ujian dari portal pembelajaran daring OASE Universitas Udayana (oase.unud.ac.id) langsung ke Google Calendar.",
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        browserRequirements: "Requires JavaScript. Requires HTML5.",
        isRelatedTo: {
          "@type": "WebSite",
          "@id": "https://oase.unud.ac.id/#website",
          name: "OASE Universitas Udayana",
          url: "https://oase.unud.ac.id/",
        },
        sameAs: [
          "https://oase.unud.ac.id",
          "https://www.unud.ac.id",
          "https://github.com/oka123/kalender-oase",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "IDR",
        },
        provider: {
          "@type": "EducationalOrganization",
          name: "Universitas Udayana",
          alternateName: "UNUD",
          url: "https://www.unud.ac.id",
          sameAs: [
            "https://id.wikipedia.org/wiki/Universitas_Udayana",
            "https://oase.unud.ac.id",
          ],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}#website`,
        url: baseUrl,
        name: "Kalender OASE - Universitas Udayana",
        description:
          "Platform sinkronisasi jadwal tugas dan kalender akademik OASE Universitas Udayana ke Google Calendar.",
        inLanguage: "id-ID",
      },
    ],
  };

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-800">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
