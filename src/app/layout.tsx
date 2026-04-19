import "./globals.css"

import type { Metadata } from "next"
import { Inter, Noto_Sans_JP } from "next/font/google"
import Link from "next/link"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "GitHub リポジトリ検索",
    template: "%s — GitHub Search",
  },
  description: "キーワードで GitHub のリポジトリを検索できるアプリです。",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="focus:bg-background focus:text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2"
        >
          メインコンテンツへスキップ
        </a>
        <header className="border-border border-b">
          <div className="mx-auto w-full max-w-2xl px-4 py-3">
            <Link href="/" className="text-foreground text-lg font-bold hover:opacity-80">
              GitHub Search
            </Link>
          </div>
        </header>
        <div id="main-content">{children}</div>
      </body>
    </html>
  )
}
