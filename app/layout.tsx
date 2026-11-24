import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://jadwalinujian.com"),
  title: "JadwalinUjian – Upload KRS, Jadwal Ujian Langsung Ketemu",
  description: "Cari jadwal UAS FILKOM Universitas Brawijaya dari screenshot KRS. Hasilnya bisa diunduh sebagai PNG atau PDF.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "JadwalinUjian – Upload KRS, Jadwal Ujian Langsung Ketemu",
    description: "Cari jadwal UAS FILKOM Universitas Brawijaya dari screenshot KRS. Hasilnya bisa diunduh sebagai PNG atau PDF.",
    siteName: "JadwalinUjian",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JadwalinUjian – Upload KRS, Jadwal Ujian Langsung Ketemu",
    description: "Cari jadwal UAS FILKOM Universitas Brawijaya dari screenshot KRS. Hasilnya bisa diunduh sebagai PNG atau PDF.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
