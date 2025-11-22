import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "PUFF",
  description: "PUFF — школьное сообщество в Telegram",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-slate-50">
        <div className="min-h-screen w-full flex justify-center">
          <div className="w-full max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
