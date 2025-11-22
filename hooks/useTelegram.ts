"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export function useTelegram() {
  const [tg, setTg] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      setTg(webApp);
    }
  }, []);

  return tg;
}
