import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "TG School Hub",
  description: "Школьное телеграм-сообщество для городов и школ",
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
      <body className="min-h-screen">
        <div className="min-h-screen flex items-center justify-center px-4">
          {children}
        </div>
      </body>
    </html>
  );
}
